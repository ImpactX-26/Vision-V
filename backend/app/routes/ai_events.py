from fastapi import APIRouter, HTTPException

from app.websocket.manager import manager


router = APIRouter(
    prefix="/api/internal",
    tags=["AI Events"]
)


@router.post("/ai-results")
async def broadcast_ai_result(payload: dict):

    incident_id = payload.get("incident_id")

    if incident_id is None:
        raise HTTPException(
            status_code=400,
            detail="incident_id is required"
        )

    event = {
        "type": "ai_classification_update",
        "incident_id": incident_id,
        "incident_type": payload.get("incident_type"),
        "severity": payload.get("severity"),
        "people_count": payload.get("people_count"),
        "resources": payload.get("resources", []),
        "summary": payload.get("summary"),
        "confidence": payload.get("confidence"),
        "requires_human_review": payload.get(
            "requires_human_review",
            True
        )
    }

    await manager.broadcast(event)

    return {
        "status": "success",
        "message": "AI result broadcast completed",
        "incident_id": incident_id
    }