from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import Iterable


CV_MAX_SCORE = Decimal("1.5")
BONUS_MAX_SCORE = Decimal("1.5")
AGENT_EXTRA_MAX_SCORE = Decimal("3")
AGENT_EXTRA_MIN_QUESTIONS = 2
AGENT_EXTRA_MAX_QUESTIONS = 5


def to_decimal(value: float | int | str | Decimal | None) -> Decimal:
    if value is None:
        return Decimal("0")
    return Decimal(str(value))


def round_score(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP).normalize()


def clamp_score(value: Decimal, maximum: Decimal) -> Decimal:
    return max(Decimal("0"), min(to_decimal(value), maximum))


def is_agent_question(question) -> bool:
    return getattr(question, "source", "template") == "agent"


def is_base_question(question) -> bool:
    return not is_agent_question(question) and getattr(question, "generated_for_interview_id", None) is None


def base_questions(questions: Iterable) -> list:
    return [question for question in questions if is_base_question(question)]


def agent_questions(questions: Iterable, interview_id=None) -> list:
    items = [question for question in questions if is_agent_question(question)]
    if interview_id is None:
        return items
    return [question for question in items if getattr(question, "generated_for_interview_id", None) == interview_id]


def base_questions_max(questions: Iterable) -> Decimal:
    return sum((to_decimal(question.points) for question in base_questions(questions)), Decimal("0"))


def cv_requirement_value(requirement_count: int) -> Decimal:
    if requirement_count <= 0:
        return Decimal("0")
    return round_score(CV_MAX_SCORE / Decimal(requirement_count))


def cv_max_score(requirement_count: int) -> Decimal:
    return CV_MAX_SCORE if requirement_count > 0 else Decimal("0")


def bonus_question_value(base_question_count: int) -> Decimal:
    if base_question_count <= 0:
        return Decimal("0")
    return round_score(BONUS_MAX_SCORE / Decimal(base_question_count))


def bonus_max_score(base_question_count: int) -> Decimal:
    return BONUS_MAX_SCORE if base_question_count > 0 else Decimal("0")


def agent_question_value(question_count: int) -> Decimal:
    if question_count <= 0:
        return Decimal("0")
    return round_score(AGENT_EXTRA_MAX_SCORE / Decimal(question_count))


def agent_extra_max_score(base_question_count: int) -> Decimal:
    return AGENT_EXTRA_MAX_SCORE if base_question_count > 0 else Decimal("0")


def calculate_max_score_for_template(template) -> Decimal:
    questions = list(getattr(template, "questions", []) or [])
    requirements = list(getattr(template, "requirements", []) or [])
    base_count = len(base_questions(questions))
    return round_score(
        base_questions_max(questions)
        + cv_max_score(len(requirements))
        + bonus_max_score(base_count)
        + agent_extra_max_score(base_count)
    )


def split_answer_scores(answers: Iterable) -> dict[str, Decimal]:
    base_total = Decimal("0")
    extra_total = Decimal("0")
    bonus_total = Decimal("0")
    for answer in answers:
        question = getattr(answer, "question", None)
        question_score = to_decimal(getattr(answer, "final_question_score", 0)) - to_decimal(
            getattr(answer, "bonus_score", 0)
        )
        question_score = max(question_score, Decimal("0"))
        if question is not None and is_agent_question(question):
            extra_total += question_score
        else:
            base_total += question_score
        bonus_total += to_decimal(getattr(answer, "bonus_score", 0))
    return {
        "base_question_score": round_score(base_total),
        "extra_question_score": round_score(extra_total),
        "bonus_score": round_score(clamp_score(bonus_total, BONUS_MAX_SCORE)),
        "question_score": round_score(base_total + extra_total),
    }
