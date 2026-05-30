import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


DifficultyLevel = Literal["easy", "medium", "hard"]
EvaluationStatus = Literal["correct", "partially_correct", "incorrect", "unknown"]
InterviewLifecycleStatus = Literal["pending", "in_progress", "finalized"]
Recommendation = Literal[
    "highly_recommended",
    "recommended",
    "needs_review",
    "not_recommended",
]


class TemplateRequirementCreate(BaseModel):
    skill_name: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=4000)
    weight: float = Field(default=1, ge=0, le=100)


class TemplateRequirementUpdate(BaseModel):
    skill_name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=4000)
    weight: float | None = Field(default=None, ge=0, le=100)


class TemplateRequirementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    template_id: uuid.UUID
    skill_name: str
    description: str
    weight: float
    created_at: datetime


class TemplateQuestionCreate(BaseModel):
    requirement_id: uuid.UUID | None = None
    question_text: str = Field(min_length=1, max_length=6000)
    expected_answer: str = Field(min_length=1, max_length=6000)
    difficulty: DifficultyLevel = "medium"
    points: float = Field(default=1, ge=0, le=100)
    is_required: bool = True
    order_index: int = Field(default=0, ge=0)


class TemplateQuestionUpdate(BaseModel):
    requirement_id: uuid.UUID | None = None
    question_text: str | None = Field(default=None, min_length=1, max_length=6000)
    expected_answer: str | None = Field(default=None, min_length=1, max_length=6000)
    difficulty: DifficultyLevel | None = None
    points: float | None = Field(default=None, ge=0, le=100)
    is_required: bool | None = None
    order_index: int | None = Field(default=None, ge=0)


class TemplateQuestionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    template_id: uuid.UUID
    requirement_id: uuid.UUID | None
    question_text: str
    expected_answer: str
    difficulty: DifficultyLevel
    points: float
    is_required: bool
    order_index: int
    created_at: datetime


class InterviewTemplateCreate(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    description: str = Field(min_length=1, max_length=6000)
    role_name: str = Field(min_length=1, max_length=180)
    requirements: list[TemplateRequirementCreate] = Field(default_factory=list)
    questions: list[TemplateQuestionCreate] = Field(default_factory=list)


class InterviewTemplateUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=180)
    description: str | None = Field(default=None, min_length=1, max_length=6000)
    role_name: str | None = Field(default=None, min_length=1, max_length=180)


class InterviewTemplateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: str
    role_name: str
    created_at: datetime
    updated_at: datetime
    requirements: list[TemplateRequirementRead] = Field(default_factory=list)
    questions: list[TemplateQuestionRead] = Field(default_factory=list)


class CandidateSkillMatchRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    interview_id: uuid.UUID
    requirement_id: uuid.UUID
    skill_name: str
    matched: bool
    evidence_text: str
    score_awarded: float
    created_at: datetime


class CVRequirementMatch(BaseModel):
    skill_name: str = Field(min_length=1)
    matched: bool
    evidence_text: str = ""


class CVMatchAnalysisResult(BaseModel):
    matches: list[CVRequirementMatch] = Field(default_factory=list)


class AnalyzeCVResponse(BaseModel):
    interview_id: uuid.UUID
    initial_cv_score: float
    matches: list[CandidateSkillMatchRead]


class InterviewAnswerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    interview_id: uuid.UUID
    question_id: uuid.UUID
    transcript_text: str
    evaluation_status: EvaluationStatus
    base_question_score: float
    bonus_score: float
    final_question_score: float
    feedback: str
    reason: str
    created_at: datetime


class InterviewCreateV2(BaseModel):
    template_id: uuid.UUID
    candidate_name: str = Field(min_length=1, max_length=160)
    candidate_email: str | None = Field(default=None, max_length=320)


class InterviewScoreResponse(BaseModel):
    interview_id: uuid.UUID
    status: str
    initial_cv_score: float
    question_score: float
    bonus_score: float
    final_score: float
    max_score: float
    percentage: float
    matched_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)


class StartInterviewResponse(BaseModel):
    interview_id: uuid.UUID
    status: InterviewLifecycleStatus
    current_question: str
    question_index: int
    total_questions: int
    progress_percentage: float


class AnswerRequest(BaseModel):
    answer: str = Field(min_length=1, max_length=12000)


class AnswerEvaluation(BaseModel):
    status: EvaluationStatus
    base_score: float = Field(ge=0)
    bonus_score: float = Field(ge=0)
    final_score: float = Field(ge=0)
    feedback: str
    reasoning_summary: str
    detected_knowledge: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0, le=1)


class AnswerTurnResponse(BaseModel):
    interview_id: uuid.UUID
    status: InterviewLifecycleStatus
    candidate_transcript: str
    evaluation: AnswerEvaluation
    next_question: str | None = None
    can_finalize: bool = False
    progress_percentage: float
    question_index: int
    total_questions: int


class NextQuestionPayload(BaseModel):
    id: uuid.UUID | None = None
    question_text: str | None = None


class CurrentScoreSnapshot(BaseModel):
    initial_cv_score: float
    question_score: float
    bonus_score: float
    final_score: float
    max_score: float
    percentage: float


class AudioAnswerResponse(BaseModel):
    candidate_transcript: str
    evaluation: AnswerEvaluation
    current_score: CurrentScoreSnapshot
    next_question: NextQuestionPayload
    interview_status: str


class InterviewFinalReport(BaseModel):
    candidate_name: str
    role_name: str
    template_title: str
    detected_cv_skills: list[str]
    missing_cv_skills: list[str]
    questions_answered: int
    answer_evaluations: list[InterviewAnswerRead]
    initial_cv_score: float
    question_score: float
    bonus_score: float
    final_score: float
    max_score: float
    percentage: float
    strengths: list[str]
    weaknesses: list[str]
    recommendation: Recommendation
    final_summary: str
