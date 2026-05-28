from dataclasses import dataclass

from app.services.openai_client import OpenAIClientFactory


@dataclass(slots=True)
class InterviewerAgent:
    openai_factory: OpenAIClientFactory

    async def build_next_question(
        self,
        transcript: str,
        role: str,
        retrieved_context: str | None = None,
    ) -> str:
        client = self.openai_factory.create()
        context_block = (
            f"\nRelevant retrieved context:\n{retrieved_context}\n"
            if retrieved_context
            else ""
        )
        response = await client.responses.create(
            model="gpt-4.1-mini",
            input=[
                {
                    "role": "system",
                    "content": (
                        "You are a rigorous technical interviewer. Ask one concise, "
                        "role-relevant follow-up question."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Role: {role}\n"
                        f"Transcript so far:\n{transcript}"
                        f"{context_block}"
                    ),
                },
            ],
        )
        return response.output_text
