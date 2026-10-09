from pydantic import BaseModel
from typing import Optional


class ReportCreate(BaseModel):
    text: str
    audio_url: Optional[str] = None
    image_url: Optional[str] = None
    lat: float
    lng: float