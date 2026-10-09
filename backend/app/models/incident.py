from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from datetime import datetime, timezone

from app.database import Base


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)

    text = Column(Text, nullable=False)

    incident_type = Column(String, nullable=True)

    severity = Column(String, nullable=True)

    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)

    people_count = Column(Integer, nullable=True)

    resources = Column(String, nullable=True)

    summary = Column(Text, nullable=True)

    confidence = Column(Float, nullable=True)

    status = Column(String, default="Pending")

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc)
    )