import logging
import uuid
from typing import Any, Literal, TypedDict

from fastapi import HTTPException, status
from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.prompts.interview_workflow import (
    ANSWER_EVALUATION_PROMPT,
    CONVERSATION_PROMPT,
    NEXT_STEP_PROMPT,
    PROFILE_ANALYSIS_PROMPT,
    QUESTION_GENERATION_PROMPT,
    REPORT_GENERATION_PROMPT,
)
from app.rag.retrieval import retrieve_context_text
from app.repositories import interviews as interview_repository
from app.repositories import reports as report_repository
from app.repositories import transcripts as transcript_repository
from app.repositories import workflow_states as workflow_state_repository
from app.schemas.interview_agent import (
    AnswerEvaluation,
    CandidateProfile,
    GeneratedQuestion,
    InterviewIntervention,
    InterviewReport,
    NextStepDecision,
)
from app.services.interview_service import ensure_interview_exists
from app.tools.interview_tools import (
    analyze_cv_skills_tool,
    calculate_technical_score_tool,
    detect_seniority_tool,
    generate_feedback_tool,
)

logger = logging.getLogger(__name__)

GraphMode = Literal["start", "message", "finalize"]
GraphStatus = Literal["not_started", "in_progress", "completed"]


class InterviewState(TypedDict, total=False):
    interview_id: str
    mode: GraphMode
    candidate_name: str
    job_title: str
    candidate_profile: dict[str, Any]
    cv_context: str
    job_context: str
    current_question: str | None
    candidate_answer: str | None
    candidate_audio_url: str | None
    interviewer_intervention: dict[str, Any]
    conversation_history: list[dict[str, str]]
    detected_skills: list[str]
    difficulty_level: str
    asked_questions: list[str]
    evaluations: list[dict[str, Any]]
    final_report: dict[str, Any] | None
    next_action: str
    status: GraphStatus
    generated_question_this_turn: bool


class InterviewGraphRunner:
    def __init__(self, session: AsyncSession) -> None:
        if not settings.OPENAI_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="OPENAI_API_KEY is not configured",
            )

        self._session = session
        self._llm = ChatOpenAI(
            model="gpt-4.1",
            api_key=settings.OPENAI_API_KEY,
            temperature=0.2,
        )
        self._graph = build_interview_graph(self)

    async def run(self, state: InterviewState) -> InterviewState:
        logger.info(
            "Running interview graph mode=%s interview_id=%s",
            state.get("mode"),
            state.get("interview_id"),
        )
        result = await self._graph.ainvoke(state)
        return InterviewState(**result)

    async def load_interview_context(self, state: InterviewState) -> InterviewState:
        interview_id = uuid.UUID(state["interview_id"])
        interview = await ensure_interview_exists(self._session, interview_id)
        transcripts = await transcript_repository.list_transcripts_by_interview_id(
            self._session,
            interview_id,
        )

        cv_context = await retrieve_context_text(
            self._session,
            interview_id=interview_id,
            query="candidate technical skills, projects, experience, responsibilities",
            source_type="cv",
            top_k=8,
        )
        job_context = await retrieve_context_text(
            self._session,
            interview_id=interview_id,
            query="job requirements, responsibilities, technologies, seniority expectations",
            source_type="job_description",
            top_k=8,
        )

        return {
            **state,
            "candidate_name": interview.candidate_name,
            "job_title": interview.job_title,
            "cv_context": cv_context,
            "job_context": job_context,
            "conversation_history": [
                {"role": transcript.role, "content": transcript.content}
                for transcript in transcripts
            ],
            "status": state.get("status", "not_started"),
        }

    async def analyze_candidate_profile(self, state: InterviewState) -> InterviewState:
        cv_context = state.get("cv_context", "")
        tool_skills = await analyze_cv_skills_tool.ainvoke({"cv_context": cv_context})
        seniority_tool_result = await detect_seniority_tool.ainvoke(
            {
                "skills": tool_skills,
                "experience_summary": cv_context[:4000],
                "answer_summaries": [],
            }
        )

        structured_llm = self._llm.with_structured_output(CandidateProfile)
        profile = await structured_llm.ainvoke(
            [
                ("system", PROFILE_ANALYSIS_PROMPT),
                (
                    "human",
                    "\n".join(
                        [
                            f"Candidate: {state.get('candidate_name', '')}",
                            f"Role: {state.get('job_title', '')}",
                            f"CV context:\n{cv_context or 'No CV context available.'}",
                            f"Job context:\n{state.get('job_context', '') or 'No job context available.'}",
                            f"Tool detected skills: {tool_skills}",
                            f"Tool seniority estimate: {seniority_tool_result}",
                        ]
                    ),
                ),
            ]
        )

        detected_skills = sorted(set([*tool_skills, *profile.detected_skills]))
        seniority = seniority_tool_result.get("seniority") or profile.seniority_estimation

        return {
            **state,
            "candidate_profile": profile.model_dump(),
            "detected_skills": detected_skills,
            "difficulty_level": seniority,
            "status": "in_progress",
        }

    async def generate_question(self, state: InterviewState) -> InterviewState:
        structured_llm = self._llm.with_structured_output(GeneratedQuestion)
        question = await structured_llm.ainvoke(
            [
                ("system", QUESTION_GENERATION_PROMPT),
                (
                    "human",
                    "\n".join(
                        [
                            f"Candidate: {state.get('candidate_name', '')}",
                            f"Role: {state.get('job_title', '')}",
                            f"Difficulty: {state.get('difficulty_level', 'mid')}",
                            f"Detected skills: {state.get('detected_skills', [])}",
                            f"Asked questions: {state.get('asked_questions', [])}",
                            f"CV context:\n{state.get('cv_context', '') or 'No CV context available.'}",
                            f"Job context:\n{state.get('job_context', '') or 'No job context available.'}",
                            f"Conversation history: {state.get('conversation_history', [])[-8:]}",
                            f"Latest intervention: {state.get('interviewer_intervention', {})}",
                        ]
                    ),
                ),
            ]
        )

        asked_questions = [*state.get("asked_questions", []), question.question]
        return {
            **state,
            "current_question": question.question,
            "difficulty_level": question.difficulty_level,
            "asked_questions": asked_questions,
            "generated_question_this_turn": True,
            "status": "in_progress",
        }

    async def interview_conversation(self, state: InterviewState) -> InterviewState:
        structured_llm = self._llm.with_structured_output(InterviewIntervention)
        intervention = await structured_llm.ainvoke(
            [
                ("system", CONVERSATION_PROMPT),
                (
                    "human",
                    "\n".join(
                        [
                            f"Current question: {state.get('current_question')}",
                            f"Candidate answer: {state.get('candidate_answer')}",
                            f"Role: {state.get('job_title', '')}",
                            f"Conversation history: {state.get('conversation_history', [])[-8:]}",
                        ]
                    ),
                ),
            ]
        )
        return {**state, "interviewer_intervention": intervention.model_dump()}

    async def evaluate_answer(self, state: InterviewState) -> InterviewState:
        answer = state.get("candidate_answer")
        if not answer:
            return state

        criteria = "\n".join(
            [
                f"Question: {state.get('current_question')}",
                f"Job context: {state.get('job_context', '')[:3000]}",
                f"Difficulty: {state.get('difficulty_level', 'mid')}",
            ]
        )
        baseline_score = await calculate_technical_score_tool.ainvoke(
            {"answer": answer, "criteria": criteria}
        )

        structured_llm = self._llm.with_structured_output(AnswerEvaluation)
        evaluation = await structured_llm.ainvoke(
            [
                ("system", ANSWER_EVALUATION_PROMPT),
                (
                    "human",
                    "\n".join(
                        [
                            criteria,
                            f"Candidate answer: {answer}",
                            f"Baseline technical score tool output: {baseline_score}",
                        ]
                    ),
                ),
            ]
        )

        evaluations = [*state.get("evaluations", []), evaluation.model_dump()]
        return {**state, "evaluations": evaluations}

    async def decide_next_step(self, state: InterviewState) -> InterviewState:
        structured_llm = self._llm.with_structured_output(NextStepDecision)
        decision = await structured_llm.ainvoke(
            [
                ("system", NEXT_STEP_PROMPT),
                (
                    "human",
                    "\n".join(
                        [
                            f"Asked question count: {len(state.get('asked_questions', []))}",
                            f"Latest evaluation: {state.get('evaluations', [])[-1:]}",
                            f"Difficulty: {state.get('difficulty_level', 'mid')}",
                            f"Detected skills: {state.get('detected_skills', [])}",
                        ]
                    ),
                ),
            ]
        )

        updated_state = {
            **state,
            "next_action": decision.action,
            "difficulty_level": adapt_difficulty(
                state.get("difficulty_level", "mid"),
                state.get("evaluations", []),
            ),
        }
        if len(state.get("asked_questions", [])) >= 6:
            updated_state["next_action"] = "finalize"
        return updated_state

    async def report_generation(self, state: InterviewState) -> InterviewState:
        seniority_tool_result = await detect_seniority_tool.ainvoke(
            {
                "skills": state.get("detected_skills", []),
                "experience_summary": state.get("cv_context", "")[:4000],
                "answer_summaries": [
                    item.get("answer", "")
                    for item in state.get("evaluations", [])
                ],
            }
        )
        feedback = await generate_feedback_tool.ainvoke(
            {
                "candidate_name": state.get("candidate_name", ""),
                "evaluations": state.get("evaluations", []),
                "seniority_estimation": seniority_tool_result.get(
                    "seniority",
                    state.get("difficulty_level", "mid"),
                ),
            }
        )

        structured_llm = self._llm.with_structured_output(InterviewReport)
        report = await structured_llm.ainvoke(
            [
                ("system", REPORT_GENERATION_PROMPT),
                (
                    "human",
                    "\n".join(
                        [
                            f"Candidate: {state.get('candidate_name', '')}",
                            f"Role: {state.get('job_title', '')}",
                            f"Detected skills: {state.get('detected_skills', [])}",
                            f"Asked questions: {state.get('asked_questions', [])}",
                            f"Evaluations: {state.get('evaluations', [])}",
                            f"CV context:\n{state.get('cv_context', '')[:5000] or 'No CV context available.'}",
                            f"Job context:\n{state.get('job_context', '')[:5000] or 'No job context available.'}",
                            f"Feedback tool output: {feedback}",
                            f"Seniority tool output: {seniority_tool_result}",
                        ]
                    ),
                ),
            ]
        )

        return {
            **state,
            "final_report": report.model_dump(),
            "status": "completed",
            "next_action": "finalize",
        }

    async def persist_results(self, state: InterviewState) -> InterviewState:
        interview_id = uuid.UUID(state["interview_id"])

        if state.get("candidate_answer"):
            await transcript_repository.create_transcript(
                self._session,
                interview_id=interview_id,
                role="candidate",
                content=state["candidate_answer"] or "",
                audio_url=state.get("candidate_audio_url"),
            )

        if state.get("generated_question_this_turn") and state.get("current_question"):
            await transcript_repository.create_transcript(
                self._session,
                interview_id=interview_id,
                role="interviewer",
                content=state["current_question"] or "",
            )

        if state.get("final_report"):
            report = InterviewReport.model_validate(state["final_report"])
            await report_repository.upsert_report(
                self._session,
                interview_id=interview_id,
                report_json=report.model_dump(),
                technical_score=report.technical_score,
                communication_score=report.communication_score,
                seniority_estimation=report.seniority_estimation,
                recommendation=report.recommendation,
                final_score=report.technical_score,
                max_score=100,
                percentage=report.technical_score,
            )

        await interview_repository.update_interview_status(
            self._session,
            interview_id,
            state.get("status", "in_progress"),
        )

        persisted_state = clean_state_for_persistence(state)
        await workflow_state_repository.upsert_workflow_state(
            self._session,
            interview_id=interview_id,
            state_json=persisted_state,
        )
        await self._session.commit()

        return InterviewState(**persisted_state)


def build_interview_graph(runner: InterviewGraphRunner):
    graph = StateGraph(InterviewState)
    graph.add_node("load_interview_context", runner.load_interview_context)
    graph.add_node("analyze_candidate_profile", runner.analyze_candidate_profile)
    graph.add_node("generate_question", runner.generate_question)
    graph.add_node("interview_conversation", runner.interview_conversation)
    graph.add_node("evaluate_answer", runner.evaluate_answer)
    graph.add_node("decide_next_step", runner.decide_next_step)
    graph.add_node("report_generation", runner.report_generation)
    graph.add_node("persist_results", runner.persist_results)

    graph.set_entry_point("load_interview_context")
    graph.add_conditional_edges(
        "load_interview_context",
        route_after_context_load,
        {
            "start": "analyze_candidate_profile",
            "message": "interview_conversation",
            "finalize": "report_generation",
        },
    )
    graph.add_edge("analyze_candidate_profile", "generate_question")
    graph.add_edge("interview_conversation", "evaluate_answer")
    graph.add_edge("evaluate_answer", "decide_next_step")
    graph.add_conditional_edges(
        "decide_next_step",
        route_after_decision,
        {
            "question": "generate_question",
            "report": "report_generation",
        },
    )
    graph.add_edge("generate_question", "persist_results")
    graph.add_edge("report_generation", "persist_results")
    graph.add_edge("persist_results", END)
    return graph.compile()


def route_after_context_load(state: InterviewState) -> str:
    return state.get("mode", "start")


def route_after_decision(state: InterviewState) -> str:
    return "report" if state.get("next_action") == "finalize" else "question"


def adapt_difficulty(current_difficulty: str, evaluations: list[dict[str, Any]]) -> str:
    if not evaluations:
        return current_difficulty

    latest_score = int(evaluations[-1].get("technical_score", 0))
    if latest_score >= 85 and current_difficulty == "junior":
        return "mid"
    if latest_score >= 85 and current_difficulty == "mid":
        return "senior"
    if latest_score <= 45 and current_difficulty == "senior":
        return "mid"
    if latest_score <= 45 and current_difficulty == "mid":
        return "junior"
    return current_difficulty


def clean_state_for_persistence(state: InterviewState) -> InterviewState:
    clean_state = dict(state)
    clean_state.pop("candidate_answer", None)
    clean_state.pop("candidate_audio_url", None)
    clean_state.pop("generated_question_this_turn", None)
    clean_state["mode"] = "message" if clean_state.get("status") != "completed" else "finalize"
    return InterviewState(**clean_state)
