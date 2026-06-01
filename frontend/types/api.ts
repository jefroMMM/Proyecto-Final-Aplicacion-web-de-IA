export type InterviewStatus = "created" | "pending" | "in_progress" | "completed" | "cancelled";
export type DocumentType = "cv" | "job_description";
export type TranscriptRole = "interviewer" | "candidate";
export type DifficultyLevel = "junior" | "mid" | "senior";
export type TemplateDifficulty = "easy" | "medium" | "hard";
export type AnswerStatus = "correct" | "partially_correct" | "incorrect" | "unknown";

export interface HealthResponse {
  status: string;
  service: string;
}

export interface UserCreate {
  name: string;
  email: string;
}

export interface InterviewCreate {
  user?: UserCreate;
  user_id?: string;
  candidate_name: string;
  job_title: string;
}

export interface InterviewCreateFromTemplate {
  template_id: string;
  candidate_name: string;
  candidate_email?: string | null;
  send_invite?: boolean;
}

export interface Interview {
  id: string;
  user_id: string;
  template_id?: string | null;
  candidate_name: string;
  candidate_email?: string | null;
  job_title: string;
  status: InterviewStatus;
  initial_cv_score: number;
  question_score: number;
  bonus_score: number;
  final_score: number;
  max_score: number;
  candidate_access_token?: string | null;
  candidate_interview_url?: string | null;
  candidate_email_sent?: boolean | null;
  archived_at?: string | null;
  is_archived?: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentRead {
  id: string;
  interview_id: string;
  document_type: DocumentType;
  filename: string;
  content_text: string;
  created_at: string;
}

export interface Transcript {
  id: string;
  interview_id: string;
  role: TranscriptRole;
  content: string;
  audio_url?: string | null;
  created_at: string;
}

export interface AnswerEvaluation {
  question: string;
  answer: string;
  technical_score: number;
  communication_score: number;
  strengths: string[];
  weaknesses: string[];
  follow_up_reason: string;
}

export interface InterviewReport {
  candidate_name: string;
  detected_skills: string[];
  strengths: string[];
  weaknesses: string[];
  communication_score: number;
  technical_score: number;
  seniority_estimation: DifficultyLevel;
  recommendation: string;
  final_summary: string;
  asked_questions: string[];
  answer_evaluations: AnswerEvaluation[];
}

export interface ReportRead {
  id: string;
  interview_id: string;
  report_json: InterviewReport;
  technical_score: number;
  communication_score: number;
  seniority_estimation: DifficultyLevel;
  recommendation: string;
  final_score: number;
  max_score: number;
  percentage: number;
  created_at: string;
}

export interface InterviewDetail extends Interview {
  user: {
    id: string;
    name: string;
    email: string;
    created_at: string;
  };
  documents: DocumentRead[];
  transcripts: Transcript[];
  report?: ReportRead | null;
}

export interface UploadDocumentResponse {
  document: DocumentRead;
  extracted_characters: number;
}

export interface VoiceStartResponse {
  interview_id: string;
  interviewer_response: string;
  audio_url: string;
  audio_base64?: string | null;
  interview_status: string;
}

export interface VoiceTurnResponse {
  interview_id: string;
  candidate_transcript: string;
  interviewer_response: string;
  audio_url: string;
  audio_base64?: string | null;
  interview_status: string;
}

export interface InterviewTurnResponse {
  interview_id: string;
  status: "not_started" | "in_progress" | "completed";
  current_question?: string | null;
  difficulty_level?: DifficultyLevel | null;
  detected_skills: string[];
  latest_evaluation?: AnswerEvaluation | null;
  final_report?: InterviewReport | null;
}

export interface TemplateRequirement {
  id: string;
  template_id: string;
  skill_name: string;
  description: string;
  weight: number;
  created_at: string;
}

export interface TemplateQuestion {
  id: string;
  template_id: string;
  requirement_id?: string | null;
  requirement_ids?: string[];
  related_requirements?: TemplateRequirement[];
  question_text: string;
  expected_answer: string;
  question_type?: string;
  difficulty: TemplateDifficulty;
  points: number;
  is_required: boolean;
  order_index: number;
  created_at: string;
}

export interface InterviewTemplate {
  id: string;
  title: string;
  description: string;
  role_name: string;
  requirements: TemplateRequirement[];
  questions: TemplateQuestion[];
  created_at: string;
  updated_at: string;
}

export interface AnswerEvaluationV2 {
  status: AnswerStatus;
  base_score: number;
  bonus_score: number;
  final_score: number;
  feedback: string;
  reasoning_summary: string;
  detected_knowledge: string[];
  confidence: number;
}

export interface StartInterviewResponse {
  interview_id: string;
  status: "pending" | "in_progress" | "finalized";
  current_question: string;
  question_index: number;
  total_questions: number;
  progress_percentage: number;
}

export interface AnswerTurnResponse {
  interview_id: string;
  status: "pending" | "in_progress" | "finalized";
  candidate_transcript: string;
  evaluation: AnswerEvaluationV2;
  next_question?: string | null;
  progress_percentage: number;
  question_index: number;
  total_questions: number;
}

export interface AudioAnswerResponse {
  candidate_transcript: string;
  evaluation: AnswerEvaluationV2;
  current_score: {
    initial_cv_score: number;
    question_score: number;
    bonus_score: number;
    final_score: number;
    max_score: number;
    percentage: number;
  };
  next_question: {
    id?: string | null;
    question_text?: string | null;
  };
  interview_status: "in_progress" | "finalized" | "pending" | string;
}

export interface InterviewScore {
  interview_id: string;
  status: string;
  initial_cv_score: number;
  base_question_score?: number;
  extra_question_score?: number;
  question_score: number;
  bonus_score: number;
  final_score: number;
  max_score: number;
  percentage: number;
  matched_skills?: string[];
  missing_skills?: string[];
}

export interface AnalyzeCVResponse {
  interview_id: string;
  initial_cv_score: number;
  matches: Array<{
    id: string;
    interview_id: string;
    requirement_id: string;
    skill_name: string;
    matched: boolean;
    evidence_text: string;
    score_awarded: number;
    created_at: string;
  }>;
}

export interface CandidateReport {
  candidate_name: string;
  role_name: string;
  template_title: string;
  detected_cv_skills: string[];
  missing_cv_skills: string[];
  cv_requirement_matches?: Array<{
    id: string;
    interview_id: string;
    requirement_id: string;
    skill_name: string;
    matched: boolean;
    evidence_text: string;
    score_awarded: number;
    created_at: string;
  }>;
  questions_answered: number;
  answer_evaluations: Array<{
    id: string;
    interview_id: string;
    question_id: string;
    question_points?: number;
    question_text?: string;
    question_source?: string;
    transcript_text: string;
    evaluation_status: AnswerStatus;
    base_question_score: number;
    bonus_score: number;
    ai_question_score?: number;
    manual_question_score?: number | null;
    final_question_score: number;
    feedback: string;
    reason: string;
    created_at: string;
  }>;
  initial_cv_score: number;
  base_question_score?: number;
  extra_question_score?: number;
  question_score: number;
  bonus_score: number;
  final_score: number;
  max_score: number;
  percentage: number;
  strengths: string[];
  weaknesses: string[];
  recommendation: "highly_recommended" | "recommended" | "needs_review" | "not_recommended";
  final_summary: string;
}

export interface CandidateTokenValidationResponse {
  interview_id: string;
  candidate_name: string;
  candidate_email?: string | null;
  job_title: string;
  status: string;
  greeting: string;
  total_questions: number;
}

export interface CandidateQuestion {
  id: string;
  question_text: string;
  expected_answer?: string;
  source?: string;
  difficulty: TemplateDifficulty | string;
  order_index: number;
  points: number;
  is_required: boolean;
}

export interface CandidateQuestionsResponse {
  interview_id: string;
  questions: CandidateQuestion[];
}

export interface CandidateVoiceAnswerResponse {
  interview_id: string;
  candidate_transcript: string;
  question: CandidateQuestion;
  evaluation_status: AnswerStatus;
  matched_keywords: string[];
  keyword_score: number;
  quality_score: number;
  final_question_score: number;
  feedback: string;
  next_question?: CandidateQuestion | null;
  completed: boolean;
  progress_percentage: number;
}

export interface CandidateFinalResultResponse {
  interview_id: string;
  candidate_name: string;
  status: string;
  initial_cv_score: number;
  max_cv_score: number;
  base_question_score: number;
  max_base_question_score: number;
  bonus_score: number;
  max_bonus_score: number;
  extra_question_score: number;
  max_extra_question_score: number;
  total_score: number;
  max_score: number;
  percentage: number;
  questions: Array<{
    question: string;
    expected_answer: string;
    source?: string;
    candidate_answer: string;
    base_score: number;
    bonus_score: number;
    score: number;
    max_score: number;
    feedback: string;
  }>;
  recommendation_lines: string[];
  farewell: string;
  finished_at: string;
}
