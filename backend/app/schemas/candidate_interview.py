import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.template import InterviewAnswerRead


EvaluationStatus = Literal["correct", "partially_correct", "incorrect", "unknown"]


class CandidateTokenValidationRequest(BaseModel):
    token: str = Field(min_length=16, max_length=128)


class CandidateTokenValidationResponse(BaseModel):
    interview_id: uuid.UUID
    candidate_name: str
    candidate_email: str | None = None
    job_title: str
    status: str
    greeting: str
    total_questions: int


class CandidateQuestionRead(BaseModel):
    id: uuid.UUID
    question_text: str
    source: str = "template"
    difficulty: str
    order_index: int
    points: float
    is_required: bool


class CandidateQuestionsResponse(BaseModel):
    interview_id: uuid.UUID
    questions: list[CandidateQuestionRead]


class CandidateVoiceAnswerResponse(BaseModel):
    interview_id: uuid.UUID
    candidate_transcript: str
    question: CandidateQuestionRead
    evaluation_status: EvaluationStatus
    matched_keywords: list[str]
    keyword_score: float
    quality_score: float
    final_question_score: float
    feedback: str
    next_question: CandidateQuestionRead | None = None
    completed: bool
    progress_percentage: float


class CandidateFinalResultQuestion(BaseModel):
    question: str
    expected_answer: str
    source: str = "template"
    candidate_answer: str
    base_score: float = 0
    bonus_score: float = 0
    score: float
    max_score: float
    feedback: str


class CandidateFinalResultResponse(BaseModel):
    interview_id: uuid.UUID
    candidate_name: str
    status: str
    initial_cv_score: float = 0
    max_cv_score: float = 0
    base_question_score: float = 0
    max_base_question_score: float = 0
    bonus_score: float = 0
    max_bonus_score: float = 0
    extra_question_score: float = 0
    max_extra_question_score: float = 0
    total_score: float
    max_score: float
    percentage: float
    questions: list[CandidateFinalResultQuestion]
    recommendation_lines: list[str]
    farewell: str
    finished_at: datetime
