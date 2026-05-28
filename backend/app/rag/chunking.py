import re
from dataclasses import dataclass

from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.schemas.rag import SourceType

WHITESPACE_PATTERN = re.compile(r"[ \t]+")
MULTIPLE_NEWLINES_PATTERN = re.compile(r"\n{3,}")


@dataclass(frozen=True, slots=True)
class TextChunk:
    chunk_index: int
    chunk_text: str
    source_type: SourceType
    page_number: int | None = None


class DocumentChunker:
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 150) -> None:
        self._splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", ". ", " ", ""],
        )

    def split(self, text: str, source_type: SourceType) -> list[TextChunk]:
        cleaned_text = clean_text(text)
        chunks = self._splitter.split_text(cleaned_text)
        return [
            TextChunk(
                chunk_index=index,
                chunk_text=chunk,
                source_type=source_type,
            )
            for index, chunk in enumerate(chunks)
            if chunk.strip()
        ]


def clean_text(text: str) -> str:
    normalized_lines = [
        WHITESPACE_PATTERN.sub(" ", line).strip()
        for line in text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    ]
    normalized_text = "\n".join(line for line in normalized_lines if line)
    return MULTIPLE_NEWLINES_PATTERN.sub("\n\n", normalized_text).strip()
