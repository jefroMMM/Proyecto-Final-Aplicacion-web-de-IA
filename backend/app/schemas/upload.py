from pydantic import BaseModel

from app.schemas.document import DocumentRead


class UploadDocumentResponse(BaseModel):
    document: DocumentRead
    extracted_characters: int
