from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.incident import Incident
from app.websocket.manager import manager
from app.kafka.producer import publish_incident


router = APIRouter(
    prefix="/api",
    tags=["Reports"]
)


class ReportCreate(BaseModel):
    title: str
    description: str
    location: str
    lat: float
    lng: float
    category: Optional[str] = "Other"
    severity: Optional[str] = "Medium"


@router.post("/reports")
async def create_report(
    report: ReportCreate,
    db: Session = Depends(get_db)
):

    # 1. Save incident to database
    new_incident = Incident(
        text=report.description,
        incident_type=report.category,
        severity=report.severity,
        lat=report.lat,
        lng=report.lng,
        summary=report.title,
        status="Reported"
    )

    db.add(new_incident)
    db.commit()
    db.refresh(new_incident)

    # 2. Create Kafka event
    kafka_message = {
        "event": "new_incident",
        "incident_id": new_incident.id,
        "title": new_incident.summary,
        "description": new_incident.text,
        "category": new_incident.incident_type,
        "severity": new_incident.severity,
        "lat": new_incident.lat,
        "lng": new_incident.lng,
        "status": new_incident.status
    }

    # 3. Publish incident to Kafka
    publish_incident(kafka_message)

    # 4. Send real-time WebSocket update
    await manager.broadcast({
        "type": "new_incident",
        "incident_id": new_incident.id,
        "title": new_incident.summary,
        "category": new_incident.incident_type,
        "severity": new_incident.severity,
        "status": new_incident.status
    })

    # 5. Return API response
    return {
        "message": "Report created successfully",
        "report": {
            "id": new_incident.id,
            "title": new_incident.summary,
            "description": new_incident.text,
            "location": report.location,
            "lat": new_incident.lat,
            "lng": new_incident.lng,
            "category": new_incident.incident_type,
            "severity": new_incident.severity,
            "status": new_incident.status
        }
    }