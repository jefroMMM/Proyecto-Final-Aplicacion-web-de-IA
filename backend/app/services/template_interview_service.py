import json
import logging
import re
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.candidate_skill_match import CandidateSkillMatch
from app.prompts.template_interview import (
    ANSWER_EVALUATION_SYSTEM_PROMPT,
    CV_MATCH_SYSTEM_PROMPT,
    REPORT_SYSTEM_PROMPT,
)
from app.repositories import (
    candidate_skill_matches as match_repository,
    documents as document_repository,
    interview_answers as answer_repository,
    interviews as interview_repository,
    reports as report_repository,
    templates as template_repository,
    transcripts as transcript_repository,
)
from app.schemas.template import (
    AnalyzeCVResponse,
    AnswerEvaluation,
    CVMatchAnalysisResult,
    InterviewCreateV2,
    InterviewFinalReport,
)
from app.services.document_service import save_interview_document
from app.services.candidate_interview_service import issue_candidate_token, _ensure_agent_questions
from app.services.email_service import send_candidate_interview_email
from app.services.openai_client import OpenAIClientFactory
from app.services.scoring import (
    AGENT_EXTRA_MAX_SCORE,
    BONUS_MAX_SCORE,
    CV_MAX_SCORE,
    base_questions_max,
    bonus_question_value,
    calculate_max_score_for_template,
    clamp_score,
    cv_requirement_value,
    is_agent_question,
    split_answer_scores,
)

logger = logging.getLogger(__name__)


async def create_interview_from_template(
    session: AsyncSession,
    payload: InterviewCreateV2,
):
    template = await template_repository.get_template(session, payload.template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    interview = await interview_repository.create_interview(
        session,
        user_id=await interview_repository.get_default_user_id(session),
        candidate_name=payload.candidate_name,
        job_title=template.role_name,
        template_id=template.id,
        candidate_email=payload.candidate_email,
    )
    interview.max_score = _to_decimal(calculate_template_max_score(template))
    await session.commit()
    await session.refresh(interview)
    if not payload.send_invite:
        return interview

    return await send_candidate_invite(session, interview.id)


async def send_candidate_invite(
    session: AsyncSession,
    interview_id: uuid.UUID,
):
    interview = await _require_interview_with_template(session, interview_id)
    if not interview.cv_document_id:
        raise HTTPException(status_code=409, detail="Interview CV must be uploaded before sending invite")

    matches = await match_repository.list_skill_matches(session, interview_id)
    if interview.template.requirements and not matches:
        raise HTTPException(status_code=409, detail="Interview CV must be analyzed before sending invite")

    candidate_token = await issue_candidate_token(session, interview.id)
    candidate_url = f"{settings.PUBLIC_FRONTEND_URL.rstrip('/')}/entrevista?token={candidate_token}"
    email_sent = False
    if interview.candidate_email:
        try:
            email_sent = await send_candidate_interview_email(
                to_email=interview.candidate_email,
                candidate_name=interview.candidate_name,
                interview_url=candidate_url,
                token=candidate_token,
            )
        except Exception:
            logger.exception("Candidate interview email failed interview_id=%s", interview.id)
    interview.candidate_access_token = candidate_token
    interview.candidate_interview_url = candidate_url
    interview.candidate_email_sent = email_sent
    await session.commit()
    return interview


async def upload_cv(
    session: AsyncSession,
    interview_id: uuid.UUID,
    file: UploadFile,
):
    result = await save_interview_document(
        session,
        interview_id=interview_id,
        document_type="cv",
        file=file,
    )
    interview = await interview_repository.get_interview_by_id(session, interview_id)
    if interview:
        interview.cv_document_id = result.document.id
        await session.commit()
    return result


async def analyze_cv_against_template(
    session: AsyncSession,
    interview_id: uuid.UUID,
):
    interview = await _require_interview_with_template(session, interview_id)
    if not interview.cv_document_id:
        raise HTTPException(status_code=409, detail="Interview CV was not uploaded")

    documents = await document_repository.list_documents_by_interview_id(session, interview_id)
    cv_document = next((doc for doc in documents if doc.document_type == "cv"), None)
    if not cv_document:
        raise HTTPException(status_code=404, detail="CV document not found")

    requirements = interview.template.requirements
    if not requirements:
        raise HTTPException(status_code=409, detail="Template has no requirements")

    logger.info("Analyzing CV for interview_id=%s against template requirements", interview_id)
    raw_matches = await _run_cv_match_llm(
        cv_text=cv_document.content_text,
        requirements=[item.skill_name for item in requirements],
    )
    match_by_skill = {item["skill_name"].lower(): item for item in raw_matches}
    normalized_cv_text = _normalize_match_text(cv_document.content_text)

    db_matches: list[CandidateSkillMatch] = []
    initial_score = Decimal("0")
    for requirement in requirements:
        matched_payload = match_by_skill.get(requirement.skill_name.lower(), {})
        matched = bool(matched_payload.get("matched", False))
        evidence = str(matched_payload.get("evidence_text", "")).strip()
        deterministic_evidence = _find_requirement_evidence(
            cv_text=cv_document.content_text,
            normalized_cv_text=normalized_cv_text,
            requirement_name=requirement.skill_name,
            requirement_description=requirement.description,
        )
        if deterministic_evidence:
            matched = True
            if not evidence:
                evidence = deterministic_evidence
        score_awarded = (
            clamp_score(cv_requirement_value(len(requirements)), CV_MAX_SCORE - initial_score)
            if matched
            else Decimal("0")
        )
        initial_score += score_awarded
        db_matches.append(
            CandidateSkillMatch(
                interview_id=interview.id,
                requirement_id=requirement.id,
                skill_name=requirement.skill_name,
                matched=matched,
                evidence_text=evidence,
                score_awarded=score_awarded,
            )
        )

    await match_repository.replace_skill_matches(
        session,
        interview_id=interview.id,
        matches=db_matches,
    )
    interview.initial_cv_score = clamp_score(initial_score, CV_MAX_SCORE)
    interview.max_score = _to_decimal(calculate_template_max_score(interview.template))
    _refresh_interview_totals(interview)
    if interview.report:
        answers = await answer_repository.list_answers(session, interview.id)
        _refresh_report_scores_from_interview(interview, answers, db_matches)
    await session.commit()
    persisted_matches = await match_repository.list_skill_matches(session, interview.id)
    logger.info(
        "CV analysis completed interview_id=%s initial_cv_score=%s matched=%s total_requirements=%s",
        interview_id,
        float(initial_score),
        len([item for item in persisted_matches if item.matched]),
        len(persisted_matches),
    )
    return AnalyzeCVResponse(
        interview_id=interview.id,
        initial_cv_score=float(initial_score),
        matches=persisted_matches,
    )


async def start_template_interview(
    session: AsyncSession,
    interview_id: uuid.UUID,
):
    interview = await _require_interview_with_template(session, interview_id)
    await _ensure_agent_questions(session, interview=interview)
    first_question = await answer_repository.get_next_question(
        session,
        template_id=interview.template_id,
        already_answered_question_ids=set(),
        interview_id=interview.id,
    )
    if not first_question:
        raise HTTPException(status_code=409, detail="Template has no questions")
    interview.status = "in_progress"
    await transcript_repository.create_transcript(
        session,
        interview_id=interview.id,
        role="interviewer",
        content=first_question.question_text,
    )
    await session.commit()
    return _build_progress_payload(interview, first_question.question_text, 0, len(interview.template.questions))


async def submit_text_answer(
    session: AsyncSession,
    interview_id: uuid.UUID,
    answer_text: str,
):
    interview = await _require_interview_with_template(session, interview_id)
    await _ensure_agent_questions(session, interview=interview)
    if interview.status == "created":
        raise HTTPException(status_code=409, detail="Interview has not started")
    all_answers = await answer_repository.list_answers(session, interview_id)
    answered_ids = {item.question_id for item in all_answers}
    current_question = await answer_repository.get_next_question(
        session,
        template_id=interview.template_id,
        already_answered_question_ids=answered_ids,
        interview_id=interview.id,
    )
    if not current_question:
        raise HTTPException(status_code=409, detail="No pending questions")

    await transcript_repository.create_transcript(
        session,
        interview_id=interview.id,
        role="candidate",
        content=answer_text,
    )
    cv_context = ""
    if interview.cv_document_id:
        documents = await document_repository.list_documents_by_interview_id(session, interview_id)
        cv_document = next((doc for doc in documents if doc.document_type == "cv"), None)
        if cv_document:
            cv_context = cv_document.content_text[:6000]

    cv_match = None
    if current_question.requirement_id:
        cv_match = await match_repository.get_match_for_requirement(
            session,
            interview_id=interview_id,
            requirement_id=current_question.requirement_id,
        )

    evaluation = await _run_answer_evaluation_llm(
        question=current_question.question_text,
        expected_answer=current_question.expected_answer,
        skill_name=current_question.requirement.skill_name if current_question.requirement else "",
        candidate_answer=answer_text,
        cv_context=cv_context,
        skill_in_cv=cv_match.matched if cv_match else False,
    )
    evaluation = _normalize_obvious_incorrect_cases(evaluation, answer_text)

    base_score = _to_decimal(evaluation.base_score)
    if evaluation.status == "correct":
        base_score = _to_decimal(current_question.points)
    elif evaluation.status == "partially_correct":
        base_score = _to_decimal(float(current_question.points) / 2)
    elif evaluation.status in {"incorrect", "unknown"}:
        base_score = Decimal("0")

    base_questions = [question for question in interview.template.questions if question.source != "agent"]
    current_bonus_total = sum((_to_decimal(answer.bonus_score) for answer in all_answers), Decimal("0"))
    bonus_score = clamp_score(
        bonus_question_value(len(base_questions))
        if evaluation.status == "correct" and not is_agent_question(current_question)
        else Decimal("0"),
        BONUS_MAX_SCORE - current_bonus_total,
    )

    final_score = base_score + bonus_score
    await answer_repository.create_answer(
        session,
        interview_id=interview.id,
        question_id=current_question.id,
        transcript_text=answer_text,
        evaluation_status=evaluation.status,
        base_question_score=base_score,
        bonus_score=bonus_score,
        final_question_score=final_score,
        feedback=evaluation.feedback,
        reason=evaluation.reasoning_summary,
    )
    await _recalculate_interview_scores(session, interview)

    updated_answers = await answer_repository.list_answers(session, interview_id)
    next_question = await answer_repository.get_next_question(
        session,
        template_id=interview.template_id,
        already_answered_question_ids={item.question_id for item in updated_answers},
        interview_id=interview.id,
    )
    total_questions = len(
        [
            question
            for question in interview.template.questions
            if question.generated_for_interview_id is None or question.generated_for_interview_id == interview.id
        ]
    )
    if next_question:
        await transcript_repository.create_transcript(
            session,
            interview_id=interview.id,
            role="interviewer",
            content=next_question.question_text,
        )
        interview.status = "in_progress"
    else:
        interview.status = "completed"

    await session.commit()
    return {
        "status": "finalized" if interview.status == "completed" else "in_progress",
        "evaluation": evaluation,
        "next_question": next_question.question_text if next_question else None,
        "next_question_id": str(next_question.id) if next_question else None,
        "can_finalize": next_question is None,
        "question_index": len(updated_answers),
        "total_questions": total_questions,
        "candidate_transcript": answer_text,
        "progress_percentage": _progress_percentage(len(updated_answers), total_questions),
    }


async def get_score(session: AsyncSession, interview_id: uuid.UUID):
    interview = await _require_interview_with_template(session, interview_id)
    answers = await _recalculate_interview_scores(session, interview)
    score_parts = split_answer_scores(
        answers,
        max_base_score=base_questions_max(interview.template.questions),
        max_extra_score=AGENT_EXTRA_MAX_SCORE,
    )
    matches = await match_repository.list_skill_matches(session, interview_id)
    percentage = 0.0
    if float(interview.max_score) > 0:
        percentage = round((float(interview.final_score) / float(interview.max_score)) * 100, 2)
    matched_skills = [item.skill_name for item in matches if item.matched]
    missing_skills = [item.skill_name for item in matches if not item.matched]
    return {
        "interview_id": interview.id,
        "status": "finalized" if interview.status == "completed" else interview.status,
        "initial_cv_score": float(interview.initial_cv_score),
        "base_question_score": float(score_parts["base_question_score"]),
        "extra_question_score": float(score_parts["extra_question_score"]),
        "question_score": float(interview.question_score),
        "bonus_score": float(interview.bonus_score),
        "final_score": float(interview.final_score),
        "max_score": float(interview.max_score),
        "percentage": percentage,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
    }


async def finalize_interview(session: AsyncSession, interview_id: uuid.UUID):
    interview = await _require_interview_with_template(session, interview_id)
    answers = await _recalculate_interview_scores(session, interview)
    skill_matches = await match_repository.list_skill_matches(session, interview_id)
    score_parts = split_answer_scores(
        answers,
        max_base_score=base_questions_max(interview.template.questions),
        max_extra_score=AGENT_EXTRA_MAX_SCORE,
    )
    percentage = (
        round((float(interview.final_score) / float(interview.max_score)) * 100, 2)
        if float(interview.max_score) > 0
        else 0
    )
    report_data = await _run_report_generation_llm(
        candidate_name=interview.candidate_name,
        role_name=interview.template.role_name,
        template_title=interview.template.title,
        answer_rows=[
            {
                "question": answer.question.question_text,
                "status": answer.evaluation_status,
                "feedback": answer.feedback,
                "score": float(answer.final_question_score),
            }
            for answer in answers
        ],
        final_score=float(interview.final_score),
        percentage=percentage,
    )

    detected = [item.skill_name for item in skill_matches if item.matched]
    missing = [item.skill_name for item in skill_matches if not item.matched]
    report_payload = {
        "candidate_name": interview.candidate_name,
        "role_name": interview.template.role_name,
        "template_title": interview.template.title,
        "detected_cv_skills": detected,
        "missing_cv_skills": missing,
        "cv_requirement_matches": [serialize_skill_match(item) for item in skill_matches],
        "questions_answered": len(answers),
        "answer_evaluations": [serialize_answer(item) for item in answers],
        "initial_cv_score": float(interview.initial_cv_score),
        "base_question_score": float(score_parts["base_question_score"]),
        "extra_question_score": float(score_parts["extra_question_score"]),
        "question_score": float(score_parts["question_score"]),
        "bonus_score": float(score_parts["bonus_score"]),
        "final_score": float(interview.final_score),
        "max_score": float(interview.max_score),
        "percentage": percentage,
        "strengths": report_data.get("strengths", []),
        "weaknesses": report_data.get("weaknesses", []),
        "recommendation": _normalize_recommendation(
            report_data.get("recommendation", "needs_review")
        ),
        "final_summary": report_data.get("final_summary", ""),
    }
    interview.status = "completed"
    await report_repository.upsert_report(
        session,
        interview_id=interview.id,
        report_json=report_payload,
        technical_score=int(min(report_payload["percentage"], 100)),
        communication_score=80,
        seniority_estimation="junior",
        recommendation=report_payload["recommendation"],
        final_score=report_payload["final_score"],
        max_score=report_payload["max_score"],
        percentage=report_payload["percentage"],
    )
    await session.commit()
    return InterviewFinalReport.model_validate(report_payload)


async def get_final_report(session: AsyncSession, interview_id: uuid.UUID):
    interview = await _require_interview_with_template(session, interview_id)
    if interview.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Interview is not completed yet",
        )
    if not interview.report:
        return await finalize_interview(session, interview_id)
    answers = await _recalculate_interview_scores(session, interview)
    skill_matches = await match_repository.list_skill_matches(session, interview.id)
    _refresh_report_scores_from_interview(interview, answers, skill_matches)
    await session.commit()
    return InterviewFinalReport.model_validate(interview.report.report_json)


async def update_answer_final_score(
    session: AsyncSession,
    *,
    interview_id: uuid.UUID,
    answer_id: uuid.UUID,
    final_question_score: float,
):
    interview = await _require_interview_with_template(session, interview_id)
    answer = await answer_repository.get_answer(session, answer_id)
    if not answer or answer.interview_id != interview.id:
        raise HTTPException(status_code=404, detail="Interview answer not found")

    max_allowed = _to_decimal(answer.question.points) + _to_decimal(answer.bonus_score)
    requested_score = _to_decimal(final_question_score)
    if requested_score > max_allowed:
        raise HTTPException(
            status_code=422,
            detail=f"Final score cannot exceed {float(max_allowed)} for this question",
        )

    answer.manual_question_score = requested_score
    answer.final_question_score = requested_score
    answers = await _recalculate_interview_scores(session, interview)

    if interview.report:
        skill_matches = await match_repository.list_skill_matches(session, interview.id)
        _refresh_report_scores_from_interview(interview, answers, skill_matches)

    await session.commit()
    refreshed = await answer_repository.get_answer(session, answer_id)
    return serialize_answer(refreshed)


async def _require_interview_with_template(session: AsyncSession, interview_id: uuid.UUID):
    interview = await interview_repository.get_interview_detail(session, interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    if not interview.template_id or not interview.template:
        raise HTTPException(status_code=409, detail="Interview is not linked to a template")
    return interview


def _to_decimal(value: float | Decimal) -> Decimal:
    return Decimal(str(value))


def calculate_template_max_score(template) -> float:
    return float(calculate_max_score_for_template(template))


def _refresh_interview_totals(interview) -> None:
    interview.max_score = _to_decimal(calculate_template_max_score(interview.template))
    interview.final_score = clamp_score(_to_decimal(interview.initial_cv_score), CV_MAX_SCORE) + _to_decimal(
        interview.question_score
    ) + _to_decimal(interview.bonus_score)


async def _recalculate_interview_scores(session: AsyncSession, interview):
    answers = await answer_repository.list_answers(session, interview.id)
    score_parts = split_answer_scores(
        answers,
        max_base_score=base_questions_max(interview.template.questions),
        max_extra_score=AGENT_EXTRA_MAX_SCORE,
    )
    interview.question_score = score_parts["question_score"]
    interview.bonus_score = score_parts["bonus_score"]
    _refresh_interview_totals(interview)
    return answers


def _refresh_report_scores_from_interview(interview, answers, skill_matches=None) -> None:
    skill_matches = list(skill_matches or [])
    score_parts = split_answer_scores(
        answers,
        max_base_score=base_questions_max(interview.template.questions),
        max_extra_score=AGENT_EXTRA_MAX_SCORE,
    )
    detected = [item.skill_name for item in skill_matches if item.matched]
    missing = [item.skill_name for item in skill_matches if not item.matched]
    percentage = (
        round((float(interview.final_score) / float(interview.max_score)) * 100, 2)
        if float(interview.max_score) > 0
        else 0
    )
    payload = dict(interview.report.report_json or {})
    payload["answer_evaluations"] = [serialize_answer(answer) for answer in answers]
    if skill_matches:
        payload["detected_cv_skills"] = detected
        payload["missing_cv_skills"] = missing
        payload["cv_requirement_matches"] = [serialize_skill_match(item) for item in skill_matches]
    payload["initial_cv_score"] = float(interview.initial_cv_score)
    payload["base_question_score"] = float(score_parts["base_question_score"])
    payload["extra_question_score"] = float(score_parts["extra_question_score"])
    payload["question_score"] = float(score_parts["question_score"])
    payload["bonus_score"] = float(score_parts["bonus_score"])
    payload["final_score"] = float(interview.final_score)
    payload["max_score"] = float(interview.max_score)
    payload["percentage"] = percentage
    interview.report.report_json = payload
    interview.report.final_score = float(interview.final_score)
    interview.report.max_score = float(interview.max_score)
    interview.report.percentage = percentage
    interview.report.technical_score = int(min(percentage, 100))


def _normalize_match_text(value: str) -> str:
    value = value.lower()
    replacements = {
        "á": "a",
        "é": "e",
        "í": "i",
        "ó": "o",
        "ú": "u",
        "ü": "u",
        "ñ": "n",
    }
    for source, target in replacements.items():
        value = value.replace(source, target)
    return re.sub(r"\s+", " ", value)


def _find_requirement_evidence(
    *,
    cv_text: str,
    normalized_cv_text: str,
    requirement_name: str,
    requirement_description: str,
) -> str:
    terms = [requirement_name, *re.split(r"[,;/()]+", requirement_description)]
    normalized_terms = {
        _normalize_match_text(term).strip()
        for term in terms
        if len(_normalize_match_text(term).strip()) >= 3
    }
    for term in sorted(normalized_terms, key=len, reverse=True):
        if re.search(rf"\b{re.escape(term)}\b", normalized_cv_text):
            return _extract_evidence_excerpt(cv_text, term)
    return ""


def _extract_evidence_excerpt(cv_text: str, normalized_term: str) -> str:
    lines = [line.strip() for line in cv_text.splitlines() if line.strip()]
    for line in lines:
        if normalized_term in _normalize_match_text(line):
            return line[:500]
    return f"El CV menciona {normalized_term}."


def _progress_percentage(question_index: int, total_questions: int) -> float:
    if total_questions <= 0:
        return 0
    return round((question_index / total_questions) * 100, 2)


def _build_progress_payload(interview, question_text: str, question_index: int, total_questions: int):
    return {
        "interview_id": interview.id,
        "status": "in_progress",
        "current_question": question_text,
        "question_index": question_index,
        "total_questions": total_questions,
        "progress_percentage": _progress_percentage(question_index, total_questions),
    }


async def _run_cv_match_llm(*, cv_text: str, requirements: list[str]) -> list[dict]:
    try:
        factory = OpenAIClientFactory()
        client = factory.create()
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": CV_MATCH_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            "cv_text": cv_text[:18000],
                            "requirements": requirements,
                            "aliases": {
                                "PostgreSQL": ["Postgres"],
                                "REST APIs": ["API REST", "REST"],
                                "JavaScript": ["JS"],
                                "FastAPI": ["Fast API"],
                                "Git": ["GitHub", "control de versiones"],
                            },
                        }
                    ),
                },
            ],
        )
    except Exception as exc:
        logger.exception("OpenAI CV analysis request failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="CV analysis provider request failed",
        ) from exc

    payload_text = response.choices[0].message.content or "{}"
    try:
        parsed = CVMatchAnalysisResult.model_validate(json.loads(payload_text))
        return [item.model_dump() for item in parsed.matches]
    except Exception as exc:
        logger.exception("CV analysis structured output validation failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="CV analysis response format was invalid",
        ) from exc


async def _run_answer_evaluation_llm(
    *,
    question: str,
    expected_answer: str,
    skill_name: str,
    candidate_answer: str,
    cv_context: str,
    skill_in_cv: bool,
) -> AnswerEvaluation:
    factory = OpenAIClientFactory()
    client = factory.create()
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": ANSWER_EVALUATION_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "question": question,
                        "expected_answer": expected_answer,
                        "skill_name": skill_name,
                        "candidate_answer": candidate_answer,
                        "cv_context": cv_context,
                        "skill_in_cv": skill_in_cv,
                        "required_schema": {
                            "status": "correct | partially_correct | incorrect | unknown",
                            "base_score": "number",
                            "bonus_score": "number",
                            "final_score": "number",
                            "feedback": "string",
                            "reasoning_summary": "string",
                            "detected_knowledge": "string[]",
                            "confidence": "0..1 number",
                        },
                    }
                ),
            },
        ],
    )
    payload_text = response.choices[0].message.content or "{}"
    payload = json.loads(payload_text)
    try:
        return AnswerEvaluation.model_validate(payload)
    except Exception:
        return AnswerEvaluation(
            status="unknown",
            base_score=0,
            bonus_score=0,
            final_score=0,
            feedback="No fue posible evaluar de forma confiable esta respuesta.",
            reasoning_summary="Structured evaluation fallback.",
            detected_knowledge=[],
            confidence=0,
        )


def _normalize_obvious_incorrect_cases(
    evaluation: AnswerEvaluation,
    answer_text: str,
) -> AnswerEvaluation:
    normalized = answer_text.strip().lower()
    no_knowledge_patterns = (
        "no se",
        "no sé",
        "no estoy seguro",
        "no recuerdo",
        "ni idea",
    )
    if any(pattern in normalized for pattern in no_knowledge_patterns):
        return AnswerEvaluation(
            status="incorrect",
            base_score=0,
            bonus_score=0,
            final_score=0,
            feedback="La respuesta indica que no hay conocimiento suficiente sobre el tema evaluado.",
            reasoning_summary="Explicit no-knowledge phrase detected.",
            detected_knowledge=[],
            confidence=max(evaluation.confidence, 0.9),
        )
    return evaluation


async def _run_report_generation_llm(
    *,
    candidate_name: str,
    role_name: str,
    template_title: str,
    answer_rows: list[dict],
    final_score: float,
    percentage: float,
) -> dict:
    try:
        factory = OpenAIClientFactory()
        client = factory.create()
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.2,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": REPORT_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            "candidate_name": candidate_name,
                            "role_name": role_name,
                            "template_title": template_title,
                            "answers": answer_rows,
                            "final_score": final_score,
                            "percentage": percentage,
                        }
                    ),
                },
            ],
        )
        payload_text = response.choices[0].message.content or "{}"
        payload = json.loads(payload_text)
    except Exception:
        logger.exception("OpenAI report generation request failed")
        return {
            "strengths": [],
            "weaknesses": [],
            "recommendation": "needs_review",
            "final_summary": "Reporte generado con datos estructurados de la entrevista.",
        }

    if "recommendation" not in payload:
        payload["recommendation"] = "needs_review"
    return payload


def _normalize_recommendation(value: str) -> str:
    allowed = {
        "highly_recommended",
        "recommended",
        "needs_review",
        "not_recommended",
    }
    return value if value in allowed else "needs_review"


def serialize_answer(answer) -> dict:
    return {
        "id": str(answer.id),
        "interview_id": str(answer.interview_id),
        "question_id": str(answer.question_id),
        "question_points": float(answer.question.points) if answer.question else 0,
        "question_text": answer.question.question_text if answer.question else "",
        "question_source": answer.question.source if answer.question else "template",
        "transcript_text": answer.transcript_text,
        "evaluation_status": answer.evaluation_status,
        "base_question_score": float(answer.base_question_score),
        "bonus_score": float(answer.bonus_score),
        "ai_question_score": float(answer.ai_question_score),
        "manual_question_score": float(answer.manual_question_score) if answer.manual_question_score is not None else None,
        "final_question_score": float(answer.final_question_score),
        "feedback": answer.feedback,
        "reason": answer.reason,
        "created_at": answer.created_at.isoformat(),
    }


def serialize_skill_match(match) -> dict:
    return {
        "id": str(match.id),
        "interview_id": str(match.interview_id),
        "requirement_id": str(match.requirement_id),
        "skill_name": match.skill_name,
        "matched": match.matched,
        "evidence_text": match.evidence_text,
        "score_awarded": float(match.score_awarded),
        "created_at": (match.created_at or datetime.now(timezone.utc)).isoformat(),
    }
