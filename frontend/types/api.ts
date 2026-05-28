export type InterviewStatus = "created" | "pending" | "in_progress" | "completed" | "cancelled";
export type DocumentType = "cv" | "job_description";
export type TranscriptRole = "interviewer" | "candidate";
export type DifficultyLevel = "junior" | "mid" | "senior";

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

export interface Interview {
  id: string;
  user_id: string;
  candidate_name: string;
  job_title: string;
  status: InterviewStatus;
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
