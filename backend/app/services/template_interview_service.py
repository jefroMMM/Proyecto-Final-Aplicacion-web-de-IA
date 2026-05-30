import json
import logging
import uuid
from decimal import Decimal

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

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
    AnswerEvaluation,
    InterviewCreateV2,
    InterviewFinalReport,
)
from app.services.document_service import save_interview_document
from app.services.openai_client import OpenAIClientFactory

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
    interview.max_score = _to_decimal(
        sum(float(question.points) for question in template.questions)
        + (0.5 * len(template.requirements))
        + (0.5 * len(template.requirements))
    )
    await session.commit()
    await session.refresh(interview)
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

    raw_matches = await _run_cv_match_llm(
        cv_text=cv_document.content_text,
        requirements=[item.skill_name for item in requirements],
    )
    match_by_skill = {item["skill_name"].lower(): item for item in raw_matches}

    db_matches: list[CandidateSkillMatch] = []
    initial_score = Decimal("0")
    for requirement in requirements:
        matched_payload = match_by_skill.get(requirement.skill_name.lower(), {})
        matched = bool(matched_payload.get("matched", False))
        evidence = str(matched_payload.get("evidence_text", "")).strip()
        score_awarded = Decimal("0.5") if matched else Decimal("0")
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
    interview.initial_cv_score = initial_score
    _refresh_interview_totals(interview)
    await session.commit()
    return await match_repository.list_skill_matches(session, interview.id)


async def start_template_interview(
    session: AsyncSession,
    interview_id: uuid.UUID,
):
    interview = await _require_interview_with_template(session, interview_id)
    first_question = await answer_repository.get_next_question(
        session,
        template_id=interview.template_id,
        already_answered_question_ids=set(),
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
    if interview.status == "created":
        raise HTTPException(status_code=409, detail="Interview has not started")
    all_answers = await answer_repository.list_answers(session, interview_id)
    answered_ids = {item.question_id for item in all_answers}
    current_question = await answer_repository.get_next_question(
        session,
        template_id=interview.template_id,
        already_answered_question_ids=answered_ids,
    )
    if not current_question:
        raise HTTPException(status_code=409, detail="No pending questions")

    await transcript_repository.create_transcript(
        session,
        interview_id=interview.id,
        role="candidate",
        content=answer_text,
    )

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
        skill_in_cv=cv_match.matched if cv_match else False,
    )

    base_score = _to_decimal(evaluation.base_score)
    if evaluation.status == "correct":
        base_score = _to_decimal(current_question.points)
    elif evaluation.status == "partially_correct":
        base_score = _to_decimal(float(current_question.points) / 2)
    elif evaluation.status in {"incorrect", "unknown"}:
        base_score = Decimal("0")

    bonus_score = Decimal("0")
    if (
        evaluation.status == "correct"
        and current_question.requirement_id
        and cv_match
        and not cv_match.matched
    ):
        bonus_score = Decimal("0.5")

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
    interview.question_score = _to_decimal(interview.question_score) + base_score
    interview.bonus_score = _to_decimal(interview.bonus_score) + bonus_score
    _refresh_interview_totals(interview)

    updated_answers = await answer_repository.list_answers(session, interview_id)
    next_question = await answer_repository.get_next_question(
        session,
        template_id=interview.template_id,
        already_answered_question_ids={item.question_id for item in updated_answers},
    )
    total_questions = len(interview.template.questions)
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
        "question_index": len(updated_answers),
        "total_questions": total_questions,
        "candidate_transcript": answer_text,
        "progress_percentage": _progress_percentage(len(updated_answers), total_questions),
    }


async def get_score(session: AsyncSession, interview_id: uuid.UUID):
    interview = await _require_interview_with_template(session, interview_id)
    percentage = 0.0
    if float(interview.max_score) > 0:
        percentage = round((float(interview.final_score) / float(interview.max_score)) * 100, 2)
    return {
        "interview_id": interview.id,
        "status": "finalized" if interview.status == "completed" else interview.status,
        "initial_cv_score": float(interview.initial_cv_score),
        "question_score": float(interview.question_score),
        "bonus_score": float(interview.bonus_score),
        "final_score": float(interview.final_score),
        "max_score": float(interview.max_score),
        "percentage": percentage,
    }


async def finalize_interview(session: AsyncSession, interview_id: uuid.UUID):
    interview = await _require_interview_with_template(session, interview_id)
    answers = await answer_repository.list_answers(session, interview_id)
    skill_matches = await match_repository.list_skill_matches(session, interview_id)
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
        percentage=(
            round((float(interview.final_score) / float(interview.max_score)) * 100, 2)
            if float(interview.max_score) > 0
            else 0
        ),
    )

    detected = [item.skill_name for item in skill_matches if item.matched]
    missing = [item.skill_name for item in skill_matches if not item.matched]
    report_payload = {
        "candidate_name": interview.candidate_name,
        "role_name": interview.template.role_name,
        "template_title": interview.template.title,
        "detected_cv_skills": detected,
        "missing_cv_skills": missing,
        "questions_answered": len(answers),
        "answer_evaluations": [serialize_answer(item) for item in answers],
        "initial_cv_score": float(interview.initial_cv_score),
        "question_score": float(interview.question_score),
        "bonus_score": float(interview.bonus_score),
        "final_score": float(interview.final_score),
        "max_score": float(interview.max_score),
        "percentage": (
            round((float(interview.final_score) / float(interview.max_score)) * 100, 2)
            if float(interview.max_score) > 0
            else 0
        ),
        "strengths": report_data.get("strengths", []),
        "weaknesses": report_data.get("weaknesses", []),
        "recommendation": report_data.get("recommendation", "needs_review"),
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
    if not interview.report:
        return await finalize_interview(session, interview_id)
    return InterviewFinalReport.model_validate(interview.report.report_json)


async def _require_interview_with_template(session: AsyncSession, interview_id: uuid.UUID):
    interview = await interview_repository.get_interview_detail(session, interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    if not interview.template_id or not interview.template:
        raise HTTPException(status_code=409, detail="Interview is not linked to a template")
    return interview


def _to_decimal(value: float | Decimal) -> Decimal:
    return Decimal(str(value))


def _refresh_interview_totals(interview) -> None:
    interview.final_score = _to_decimal(interview.initial_cv_score) + _to_decimal(
        interview.question_score
    ) + _to_decimal(interview.bonus_score)


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
                "content": json.dumps({"cv_text": cv_text[:18000], "requirements": requirements}),
            },
        ],
    )
    payload_text = response.choices[0].message.content or "{}"
    payload = json.loads(payload_text)
    matches = payload.get("matches", [])
    if not isinstance(matches, list):
        return []
    normalized = []
    for item in matches:
        if not isinstance(item, dict):
            continue
        normalized.append(
            {
                "skill_name": str(item.get("skill_name", "")).strip(),
                "matched": bool(item.get("matched", False)),
                "evidence_text": str(item.get("evidence_text", "")),
            }
        )
    return normalized


async def _run_answer_evaluation_llm(
    *,
    question: str,
    expected_answer: str,
    skill_name: str,
    candidate_answer: str,
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


async def _run_report_generation_llm(
    *,
    candidate_name: str,
    role_name: str,
    template_title: str,
    answer_rows: list[dict],
    final_score: float,
    percentage: float,
) -> dict:
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
    if "recommendation" not in payload:
        payload["recommendation"] = "needs_review"
    return payload


def serialize_answer(answer) -> dict:
    return {
        "id": str(answer.id),
        "interview_id": str(answer.interview_id),
        "question_id": str(answer.question_id),
        "transcript_text": answer.transcript_text,
        "evaluation_status": answer.evaluation_status,
        "base_question_score": float(answer.base_question_score),
        "bonus_score": float(answer.bonus_score),
        "final_question_score": float(answer.final_question_score),
        "feedback": answer.feedback,
        "reason": answer.reason,
        "created_at": answer.created_at.isoformat(),
    }
