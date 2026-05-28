import uuid
from typing import Any, Literal

from pydantic import BaseModel, Field


DifficultyLevel = Literal["junior", "mid", "senior"]
InterviewStatus = Literal["not_started", "in_progress", "completed"]
NextAction = Literal["continue", "deepen", "finalize"]


class CandidateProfile(BaseModel):
    detected_skills: list[str] = Field(default_factory=list)
    seniority_estimation: DifficultyLevel
    primary_technologies: list[str] = Field(default_factory=list)
    evidence_summary: str


class GeneratedQuestion(BaseModel):
    question: str = Field(min_length=1)
    difficulty_level: DifficultyLevel
    target_skill: str
    rationale: str


class InterviewIntervention(BaseModel):
    interviewer_message: str = Field(min_length=1)
    should_probe_deeper: bool
    focus_area: str


class AnswerEvaluation(BaseModel):
    question: str
    answer: str
    technical_score: int = Field(ge=0, le=100)
    communication_score: int = Field(ge=0, le=100)
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    follow_up_reason: str


class NextStepDecision(BaseModel):
    action: NextAction
    reason: str


class InterviewReport(BaseModel):
    candidate_name: str
    detected_skills: list[str] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    communication_score: int = Field(ge=0, le=100)
    technical_score: int = Field(ge=0, le=100)
    seniority_estimation: DifficultyLevel
    recommendation: str
    final_summary: str
    asked_questions: list[str] = Field(default_factory=list)
    answer_evaluations: list[AnswerEvaluation] = Field(default_factory=list)


class InterviewMessageRequest(BaseModel):
    answer: str = Field(min_length=1, max_length=12000)


class InterviewTurnResponse(BaseModel):
    interview_id: uuid.UUID
    status: InterviewStatus
    current_question: str | None = None
    difficulty_level: DifficultyLevel | None = None
    detected_skills: list[str] = Field(default_factory=list)
    latest_evaluation: AnswerEvaluation | None = None
    final_report: InterviewReport | None = None


class InterviewStateResponse(BaseModel):
    interview_id: uuid.UUID
    state: dict[str, Any]


class CVSkillsToolInput(BaseModel):
    cv_context: str


class TechnicalScoreToolInput(BaseModel):
    answer: str
    criteria: str


class SeniorityToolInput(BaseModel):
    skills: list[str]
    experience_summary: str
    answer_summaries: list[str] = Field(default_factory=list)


class FeedbackToolInput(BaseModel):
    candidate_name: str
    evaluations: list[dict[str, Any]]
    seniority_estimation: str
