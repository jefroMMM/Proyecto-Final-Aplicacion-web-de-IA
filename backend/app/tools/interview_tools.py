import re
from statistics import mean
from typing import Any

from langchain_core.tools import tool

from app.schemas.interview_agent import (
    CVSkillsToolInput,
    FeedbackToolInput,
    SeniorityToolInput,
    TechnicalScoreToolInput,
)

KNOWN_SKILLS = [
    "python",
    "fastapi",
    "django",
    "flask",
    "sqlalchemy",
    "postgresql",
    "pgvector",
    "mysql",
    "redis",
    "docker",
    "kubernetes",
    "aws",
    "azure",
    "gcp",
    "react",
    "next.js",
    "typescript",
    "javascript",
    "node.js",
    "langchain",
    "langgraph",
    "openai",
    "rag",
    "machine learning",
    "microservices",
    "rest",
    "graphql",
    "testing",
    "ci/cd",
]


@tool(args_schema=CVSkillsToolInput)
def analyze_cv_skills_tool(cv_context: str) -> list[str]:
    """Detect technical skills explicitly mentioned in CV context."""
    lower_context = cv_context.lower()
    detected = [
        skill
        for skill in KNOWN_SKILLS
        if re.search(rf"(?<![a-z0-9]){re.escape(skill)}(?![a-z0-9])", lower_context)
    ]
    return sorted(set(detected))


@tool(args_schema=TechnicalScoreToolInput)
def calculate_technical_score_tool(answer: str, criteria: str) -> dict[str, Any]:
    """Calculate a baseline technical score from answer substance and criteria coverage."""
    normalized_answer = answer.strip().lower()
    normalized_criteria = criteria.strip().lower()
    criteria_terms = {
        term
        for term in re.findall(r"[a-zA-Z][a-zA-Z0-9+#.-]{2,}", normalized_criteria)
        if term not in {"the", "and", "with", "for", "that", "this", "from"}
    }
    matched_terms = [term for term in criteria_terms if term in normalized_answer]
    length_score = min(45, max(0, len(normalized_answer.split()) // 3))
    coverage_score = 0
    if criteria_terms:
        coverage_score = int((len(matched_terms) / len(criteria_terms)) * 45)
    specificity_score = 10 if any(token in normalized_answer for token in ["because", "tradeoff", "latency", "test", "scale", "error"]) else 0
    score = min(100, length_score + coverage_score + specificity_score)
    return {
        "technical_score": score,
        "matched_criteria": matched_terms[:10],
        "criteria_terms": sorted(criteria_terms)[:20],
    }


@tool(args_schema=SeniorityToolInput)
def detect_seniority_tool(
    skills: list[str],
    experience_summary: str,
    answer_summaries: list[str] | None = None,
) -> dict[str, str]:
    """Estimate seniority from skills, experience evidence, and answer summaries."""
    answer_summaries = answer_summaries or []
    combined = " ".join([experience_summary, *answer_summaries]).lower()
    senior_signals = ["architecture", "lead", "mentoring", "scalability", "distributed", "strategy"]
    mid_signals = ["design", "debug", "testing", "api", "database", "deployment"]

    if len(skills) >= 8 or any(signal in combined for signal in senior_signals):
        level = "senior"
    elif len(skills) >= 4 or any(signal in combined for signal in mid_signals):
        level = "mid"
    else:
        level = "junior"

    return {
        "seniority": level,
        "explanation": (
            f"Detected {len(skills)} relevant skills and evidence signals consistent with {level} level."
        ),
    }


@tool(args_schema=FeedbackToolInput)
def generate_feedback_tool(
    candidate_name: str,
    evaluations: list[dict[str, Any]],
    seniority_estimation: str,
) -> dict[str, Any]:
    """Generate concise professional feedback from accumulated answer evaluations."""
    technical_scores = [
        int(item["technical_score"])
        for item in evaluations
        if "technical_score" in item
    ]
    communication_scores = [
        int(item["communication_score"])
        for item in evaluations
        if "communication_score" in item
    ]
    strengths = sorted(
        {
            strength
            for item in evaluations
            for strength in item.get("strengths", [])
            if strength
        }
    )
    weaknesses = sorted(
        {
            weakness
            for item in evaluations
            for weakness in item.get("weaknesses", [])
            if weakness
        }
    )

    technical_average = round(mean(technical_scores)) if technical_scores else 0
    communication_average = round(mean(communication_scores)) if communication_scores else 0

    return {
        "candidate_name": candidate_name,
        "technical_score": technical_average,
        "communication_score": communication_average,
        "seniority_estimation": seniority_estimation,
        "strengths": strengths[:5],
        "weaknesses": weaknesses[:5],
        "recommendation": build_recommendation(technical_average, communication_average),
    }


def build_recommendation(technical_score: int, communication_score: int) -> str:
    average_score = (technical_score + communication_score) / 2
    if average_score >= 80:
        return "Strong hire recommendation for the evaluated role."
    if average_score >= 65:
        return "Hire recommendation with targeted follow-up on weaker areas."
    if average_score >= 50:
        return "Borderline recommendation; continue evaluation with practical exercises."
    return "Do not recommend hiring for this role at the current evidence level."
