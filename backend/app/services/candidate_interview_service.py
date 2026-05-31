import hashlib
import re
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.audio.assemblyai_service import AssemblyAIService
from app.models.template_question import TemplateQuestion
from app.repositories import candidate_interview_tokens as token_repository
from app.repositories import interview_answers as answer_repository
from app.repositories import candidate_skill_matches as match_repository
from app.repositories import documents as document_repository
from app.repositories import interviews as interview_repository
from app.repositories import transcripts as transcript_repository
from app.services.scoring import (
    AGENT_EXTRA_MAX_QUESTIONS,
    AGENT_EXTRA_MIN_QUESTIONS,
    AGENT_EXTRA_MAX_SCORE,
    BONUS_MAX_SCORE,
    CV_MAX_SCORE,
    agent_question_value,
    base_questions_max,
    bonus_max_score,
    bonus_question_value,
    calculate_max_score_for_template,
    clamp_score,
    cv_max_score,
    is_agent_question,
    split_answer_scores,
)
from app.schemas.candidate_interview import (
    CandidateFinalResultQuestion,
    CandidateFinalResultResponse,
    CandidateQuestionRead,
    CandidateQuestionsResponse,
    CandidateTokenValidationResponse,
    CandidateVoiceAnswerResponse,
)

TOKEN_TTL_HOURS = 72
STOPWORDS = {
    "para",
    "como",
    "con",
    "del",
    "las",
    "los",
    "una",
    "uno",
    "por",
    "que",
    "este",
    "esta",
    "son",
    "sus",
    "the",
    "and",
    "for",
    "with",
    "that",
}


def generate_candidate_token() -> str:
    return secrets.token_urlsafe(24)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def issue_candidate_token(
    session: AsyncSession,
    interview_id: uuid.UUID,
) -> str:
    token = generate_candidate_token()
    await token_repository.create_token(
        session,
        interview_id=interview_id,
        token_hash=hash_token(token),
        expires_at=datetime.now(UTC) + timedelta(hours=TOKEN_TTL_HOURS),
    )
    return token


async def validate_candidate_token(
    session: AsyncSession,
    token: str,
) -> CandidateTokenValidationResponse:
    token_row = await _require_active_token(session, token)
    interview = await _require_interview_detail(session, token_row.interview_id)
    if interview.status == "created":
        interview.status = "in_progress"
    await _ensure_agent_questions(session, interview=interview)
    questions = _questions_for_interview(interview.template.questions if interview.template else [], interview.id)
    await session.commit()
    return CandidateTokenValidationResponse(
        interview_id=interview.id,
        candidate_name=interview.candidate_name,
        candidate_email=interview.candidate_email,
        job_title=interview.job_title,
        status=interview.status,
        greeting=(
            f"Hola {interview.candidate_name}, bienvenido a tu entrevista. "
            "Responde únicamente por voz."
        ),
        total_questions=len(questions),
    )


async def list_candidate_questions(
    session: AsyncSession,
    *,
    interview_id: uuid.UUID,
    token: str,
) -> CandidateQuestionsResponse:
    await _require_active_token_for_interview(session, token, interview_id)
    interview = await _require_interview_detail(session, interview_id)
    await _ensure_agent_questions(session, interview=interview)
    if interview.status == "created":
        interview.status = "in_progress"
    await session.commit()
    return CandidateQuestionsResponse(
        interview_id=interview.id,
        questions=[_question_read(question) for question in _questions_for_interview(interview.template.questions, interview.id)],
    )


async def submit_voice_answer(
    session: AsyncSession,
    *,
    interview_id: uuid.UUID,
    token: str,
    file: UploadFile,
) -> CandidateVoiceAnswerResponse:
    await _require_active_token_for_interview(session, token, interview_id)
    interview = await _require_interview_detail(session, interview_id)
    if not interview.template:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Interview has no template")
    if interview.status == "completed":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Interview already completed")

    await _ensure_agent_questions(session, interview=interview)
    answered_ids = {answer.question_id for answer in await answer_repository.list_answers(session, interview_id)}
    question = await answer_repository.get_next_question(
        session,
        template_id=interview.template.id,
        already_answered_question_ids=answered_ids,
        interview_id=interview.id,
    )
    if not question:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="No pending questions")

    transcript = await AssemblyAIService().transcribe_upload(file)
    evaluation = await evaluate_candidate_answer_with_template_ai(
        session,
        interview=interview,
        question=question,
        answer_text=transcript,
    )
    await transcript_repository.create_transcript(
        session,
        interview_id=interview.id,
        role="candidate",
        content=transcript,
    )
    await answer_repository.create_answer(
        session,
        interview_id=interview.id,
        question_id=question.id,
        transcript_text=transcript,
        evaluation_status=evaluation.status,
        base_question_score=_decimal(evaluation.base_score),
        bonus_score=_decimal(evaluation.bonus_score),
        final_question_score=_decimal(evaluation.final_score),
        feedback=evaluation.feedback,
        reason=evaluation.reasoning_summary,
    )

    await _recalculate_candidate_interview_scores(session, interview)
    interview.status = "in_progress"

    updated_answers = await answer_repository.list_answers(session, interview_id)
    next_question = await answer_repository.get_next_question(
        session,
        template_id=interview.template.id,
        already_answered_question_ids={answer.question_id for answer in updated_answers},
        interview_id=interview.id,
    )
    if next_question:
        await transcript_repository.create_transcript(
            session,
            interview_id=interview.id,
            role="interviewer",
            content=next_question.question_text,
        )
    else:
        interview.status = "completed"

    total_questions = len(_questions_for_interview(interview.template.questions, interview.id))
    await session.commit()
    return CandidateVoiceAnswerResponse(
        interview_id=interview.id,
        candidate_transcript=transcript,
        question=_question_read(question),
        evaluation_status=evaluation.status,
        matched_keywords=evaluation.detected_knowledge,
        keyword_score=evaluation.base_score,
        quality_score=evaluation.confidence,
        final_question_score=evaluation.final_score,
        feedback=evaluation.feedback,
        next_question=_question_read(next_question) if next_question else None,
        completed=next_question is None,
        progress_percentage=_progress(len(updated_answers), total_questions),
    )


async def finalize_candidate_interview(
    session: AsyncSession,
    *,
    interview_id: uuid.UUID,
    token: str,
) -> CandidateFinalResultResponse:
    token_row = await _require_active_token_for_interview(session, token, interview_id)
    interview = await _require_interview_detail(session, interview_id)
    answers = await answer_repository.list_answers(session, interview_id)
    answer_by_question = {answer.question_id: answer for answer in answers}
    questions = _questions_for_interview(interview.template.questions if interview.template else [], interview.id)
    if len(answers) < len(questions):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Interview still has pending questions",
        )

    await _recalculate_candidate_interview_scores(session, interview)
    score_parts = split_answer_scores(
        answers,
        max_base_score=base_questions_max(questions),
        max_extra_score=AGENT_EXTRA_MAX_SCORE,
    )
    max_score = float(interview.max_score)
    total_score = float(interview.final_score)
    percentage = round((total_score / max_score) * 100, 2) if max_score else 0
    interview.status = "completed"
    await token_repository.mark_token_used(session, token_row)
    await session.commit()

    return CandidateFinalResultResponse(
        interview_id=interview.id,
        candidate_name=interview.candidate_name,
        status="completed",
        initial_cv_score=float(interview.initial_cv_score),
        max_cv_score=float(cv_max_score(len(interview.template.requirements or []))),
        base_question_score=float(score_parts["base_question_score"]),
        max_base_question_score=float(base_questions_max(questions)),
        bonus_score=float(interview.bonus_score),
        max_bonus_score=float(bonus_max_score(len([question for question in questions if not is_agent_question(question)]))),
        extra_question_score=float(score_parts["extra_question_score"]),
        max_extra_question_score=float(AGENT_EXTRA_MAX_SCORE),
        total_score=round(total_score, 2),
        max_score=round(max_score, 2),
        percentage=percentage,
        questions=[
            CandidateFinalResultQuestion(
                question=question.question_text,
                expected_answer=question.expected_answer,
                source=question.source,
                candidate_answer=answer_by_question[question.id].transcript_text,
                base_score=float(answer_by_question[question.id].base_question_score),
                bonus_score=float(answer_by_question[question.id].bonus_score),
                score=float(answer_by_question[question.id].final_question_score),
                max_score=float(_question_max_score(question, questions)),
                feedback=answer_by_question[question.id].feedback,
            )
            for question in questions
            if question.id in answer_by_question
        ],
        recommendation_lines=build_recommendation_lines(percentage),
        farewell=(
            f"Gracias por finalizar la entrevista, {interview.candidate_name}. "
            "Nuestro personal de recursos humanos se contactará contigo."
        ),
        finished_at=datetime.now(UTC),
    )


async def evaluate_candidate_answer_with_template_ai(
    session: AsyncSession,
    *,
    interview,
    question: TemplateQuestion,
    answer_text: str,
):
    from app.services.template_interview_service import (
        _normalize_obvious_incorrect_cases,
        _run_answer_evaluation_llm,
    )

    cv_context = ""
    if interview.cv_document_id:
        documents = await document_repository.list_documents_by_interview_id(session, interview.id)
        cv_document = next((doc for doc in documents if doc.document_type == "cv"), None)
        if cv_document:
            cv_context = cv_document.content_text[:6000]

    cv_match = None
    if question.requirement_id:
        cv_match = await match_repository.get_match_for_requirement(
            session,
            interview_id=interview.id,
            requirement_id=question.requirement_id,
        )

    evaluation = await _run_answer_evaluation_llm(
        question=question.question_text,
        expected_answer=question.expected_answer,
        skill_name=question.requirement.skill_name if question.requirement else "",
        candidate_answer=answer_text,
        cv_context=cv_context,
        skill_in_cv=cv_match.matched if cv_match else False,
    )
    evaluation = _normalize_obvious_incorrect_cases(evaluation, answer_text)

    if evaluation.status == "correct":
        evaluation.base_score = float(question.points)
    elif evaluation.status == "partially_correct":
        evaluation.base_score = float(question.points) / 2
    else:
        evaluation.base_score = 0

    base_question_count = len([item for item in interview.template.questions if not is_agent_question(item)])
    current_bonus_total = sum(
        (
            _decimal(answer.bonus_score)
            for answer in await answer_repository.list_answers(session, interview.id)
        ),
        Decimal("0"),
    )
    potential_bonus = bonus_question_value(base_question_count)
    earns_bonus = (
        not is_agent_question(question)
        and evaluation.status in {"correct", "partially_correct"}
        and (
            evaluation.status == "correct"
            or evaluation.confidence >= 0.75
            or _decimal(evaluation.base_score) >= (_decimal(question.points) * Decimal("0.75"))
        )
    )
    evaluation.bonus_score = float(
        clamp_score(
            potential_bonus if earns_bonus else Decimal("0"),
            BONUS_MAX_SCORE - current_bonus_total,
        )
    )
    evaluation.final_score = evaluation.base_score + evaluation.bonus_score
    return evaluation


def evaluate_answer(question: TemplateQuestion, answer: str) -> dict:
    expected_keywords = extract_keywords(question.expected_answer)
    answer_words = set(extract_keywords(answer))
    matched = sorted(keyword for keyword in expected_keywords if keyword in answer_words)
    keyword_ratio = len(matched) / len(expected_keywords) if expected_keywords else 0
    length_ratio = min(1.0, len(answer.split()) / max(8, len(question.expected_answer.split()) * 0.35))
    quality_score = round((keyword_ratio * 0.75) + (length_ratio * 0.25), 4)
    final_score = round(float(question.points) * quality_score, 2)

    if quality_score >= 0.75:
        evaluation_status = "correct"
        feedback = "Respuesta sólida: cubre la mayoría de conceptos esperados."
    elif quality_score >= 0.4:
        evaluation_status = "partially_correct"
        feedback = "Respuesta parcial: menciona algunos conceptos importantes, pero falta precisión."
    elif answer.strip():
        evaluation_status = "incorrect"
        feedback = "Respuesta insuficiente frente a la respuesta esperada."
    else:
        evaluation_status = "unknown"
        feedback = "No se pudo evaluar una respuesta vacía."

    return {
        "status": evaluation_status,
        "matched_keywords": matched,
        "keyword_score": round(float(question.points) * keyword_ratio, 2),
        "quality_score": quality_score,
        "final_score": final_score,
        "feedback": feedback,
    }


def extract_keywords(text: str) -> list[str]:
    words = re.findall(r"[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9+#.]{3,}", text.lower())
    return sorted({word for word in words if word not in STOPWORDS})


def build_recommendation_lines(percentage: float) -> list[str]:
    if percentage >= 80:
        return [
            "Mantén la claridad técnica y apóyate en ejemplos concretos.",
            "Profundiza en los temas donde ya muestras dominio para diferenciarte.",
            "Practica respuestas breves que conecten experiencia, decisión y resultado.",
        ]
    if percentage >= 55:
        return [
            "Refuerza los conceptos clave que aparecieron en las respuestas esperadas.",
            "Practica explicar cada respuesta con pasos, razones y ejemplos.",
            "Antes de responder, identifica las palabras clave de la pregunta.",
        ]
    return [
        "Repasa los fundamentos del rol antes de una nueva entrevista.",
        "Construye respuestas con definiciones, ejemplos y casos de uso simples.",
        "Practica en voz alta para mejorar precisión, confianza y estructura.",
    ]


async def _require_active_token(
    session: AsyncSession,
    token: str,
):
    token_row = await token_repository.get_active_token_by_hash(session, hash_token(token))
    if not token_row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    return token_row


async def _require_active_token_for_interview(
    session: AsyncSession,
    token: str,
    interview_id: uuid.UUID,
):
    token_row = await _require_active_token(session, token)
    if token_row.interview_id != interview_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Token does not match interview")
    return token_row


async def _require_interview_detail(session: AsyncSession, interview_id: uuid.UUID):
    interview = await interview_repository.get_interview_detail(session, interview_id)
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")
    if not interview.template:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Interview has no template")
    return interview


def _sorted_questions(questions: list[TemplateQuestion]) -> list[TemplateQuestion]:
    return sorted(questions, key=lambda item: (item.order_index, item.created_at))


def _questions_for_interview(questions: list[TemplateQuestion], interview_id: uuid.UUID) -> list[TemplateQuestion]:
    return _sorted_questions(
        [
            question
            for question in questions
            if question.generated_for_interview_id is None or question.generated_for_interview_id == interview_id
        ]
    )


async def _ensure_agent_questions(
    session: AsyncSession,
    *,
    interview,
) -> list[TemplateQuestion]:
    questions = _questions_for_interview(interview.template.questions, interview.id)
    if not [question for question in questions if question.source != "agent"]:
        interview.max_score = calculate_max_score_for_template(interview.template)
        return []
    agent_questions = [question for question in questions if question.source == "agent"]
    if len(agent_questions) >= AGENT_EXTRA_MIN_QUESTIONS:
        point_value = agent_question_value(len(agent_questions))
        for question in agent_questions:
            question.points = point_value
            question.question_text = (
                question.question_text
                .replace("Pregunta generada por el agente:", "")
                .replace("Pregunta Extra:", "")
                .strip()
            )
        interview.max_score = calculate_max_score_for_template(interview.template)
        return agent_questions

    skill_matches = await match_repository.list_skill_matches(session, interview.id)
    missing_matches = [item for item in skill_matches if not item.matched]
    target_count = _choose_agent_question_count(interview, missing_matches)
    point_value = agent_question_value(target_count)
    created_questions: list[TemplateQuestion] = []
    existing_count = len(agent_questions)
    order_index = max((question.order_index for question in questions), default=-1) + 1
    requirement_targets = _agent_requirement_targets(interview, missing_matches, target_count)

    role_name = interview.template.role_name
    for index in range(existing_count, target_count):
        target_requirement = requirement_targets[index] if index < len(requirement_targets) else None
        skill_name = target_requirement.skill_name if target_requirement else role_name
        question_text = (
            f"Describe una situacion practica donde aplicaste {skill_name} "
            f"en un puesto de {role_name} y explica el resultado."
        )
        expected_answer = (
            f"Debe explicar una experiencia concreta usando {skill_name}, mencionar acciones realizadas, "
            "herramientas o criterios aplicados y el resultado obtenido."
        )
        question = await answer_repository.create_agent_question(
            session,
            template_id=interview.template.id,
            interview_id=interview.id,
            requirement_id=target_requirement.id if target_requirement else None,
            question_text=question_text,
            expected_answer=expected_answer,
            points=float(point_value),
            order_index=order_index + index,
        )
        interview.template.questions.append(question)
        created_questions.append(question)
    all_agent_questions = [*agent_questions, *created_questions]
    for question in all_agent_questions:
        question.points = point_value
        question.question_text = (
            question.question_text
            .replace("Pregunta generada por el agente:", "")
            .replace("Pregunta Extra:", "")
            .strip()
        )
    interview.max_score = calculate_max_score_for_template(interview.template)
    return all_agent_questions


def _choose_agent_question_count(interview, missing_matches: list) -> int:
    requirement_count = len(interview.template.requirements or [])
    missing_count = len(missing_matches)
    if missing_count >= 3:
        return AGENT_EXTRA_MAX_QUESTIONS
    if missing_count == 2:
        return 4
    if missing_count == 1:
        return 3
    if requirement_count >= 5:
        return 3
    return AGENT_EXTRA_MIN_QUESTIONS


def _agent_requirement_targets(interview, missing_matches: list, target_count: int) -> list:
    requirements = list(interview.template.requirements or [])
    missing_requirement_ids = {item.requirement_id for item in missing_matches}
    ordered = [
        requirement
        for requirement in requirements
        if requirement.id in missing_requirement_ids
    ]
    ordered.extend(requirement for requirement in requirements if requirement.id not in missing_requirement_ids)
    if not ordered:
        return []
    targets = []
    for index in range(target_count):
        targets.append(ordered[index % len(ordered)])
    return targets


async def _recalculate_candidate_interview_scores(session: AsyncSession, interview) -> list:
    answers = await answer_repository.list_answers(session, interview.id)
    questions = _questions_for_interview(interview.template.questions, interview.id)
    score_parts = split_answer_scores(
        answers,
        max_base_score=base_questions_max(questions),
        max_extra_score=AGENT_EXTRA_MAX_SCORE,
    )
    interview.question_score = score_parts["question_score"]
    interview.bonus_score = score_parts["bonus_score"]
    interview.max_score = calculate_max_score_for_template(interview.template)
    interview.final_score = (
        clamp_score(_decimal(interview.initial_cv_score), CV_MAX_SCORE)
        + _decimal(interview.question_score)
        + _decimal(interview.bonus_score)
    )
    return answers


def _question_max_score(question: TemplateQuestion, questions: list[TemplateQuestion]) -> Decimal:
    if is_agent_question(question):
        return _decimal(question.points)
    base_question_count = len([item for item in questions if not is_agent_question(item)])
    return _decimal(question.points) + bonus_question_value(base_question_count)


def _question_read(question: TemplateQuestion) -> CandidateQuestionRead:
    return CandidateQuestionRead(
        id=question.id,
        question_text=question.question_text,
        source=question.source,
        difficulty=question.difficulty,
        order_index=question.order_index,
        points=float(question.points),
        is_required=question.is_required,
    )


def _progress(answered_count: int, total_questions: int) -> float:
    if total_questions <= 0:
        return 0
    return round((answered_count / total_questions) * 100, 2)


def _decimal(value: float | Decimal) -> Decimal:
    return Decimal(str(value))
