from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.incident import Incident
from app.schemas.status import StatusUpdate
from app.services.assignment_service import assign_team_to_incident
from app.websocket.manager import manager


router = APIRouter(
    prefix="/api",
    tags=["Incidents"]
)


# --------------------------------------------------
# GET ALL INCIDENTS
# --------------------------------------------------

@router.get("/incidents")
def get_incidents(
    db: Session = Depends(get_db)
):
    incidents = db.query(Incident).all()

    return {
        "count": len(incidents),
        "incidents": incidents
    }


# --------------------------------------------------
# GET SINGLE INCIDENT
# --------------------------------------------------

@router.get("/incidents/{incident_id}")
def get_incident(
    incident_id: int,
    db: Session = Depends(get_db)
):
    incident = (
        db.query(Incident)
        .filter(Incident.id == incident_id)
        .first()
    )

    if not incident:
        raise HTTPException(
            status_code=404,
            detail="Incident not found"
        )

    return incident


# --------------------------------------------------
# UPDATE INCIDENT STATUS
# --------------------------------------------------

@router.put("/incidents/{incident_id}/status")
async def update_incident_status(
    incident_id: int,
    status_update: StatusUpdate,
    db: Session = Depends(get_db)
):
    incident = (
        db.query(Incident)
        .filter(Incident.id == incident_id)
        .first()
    )

    if not incident:
        raise HTTPException(
            status_code=404,
            detail="Incident not found"
        )

    incident.status = status_update.status

    db.commit()
    db.refresh(incident)

    # Real-time WebSocket update
    await manager.broadcast({
        "type": "incident_status_update",
        "incident_id": incident.id,
        "status": incident.status
    })

    return {
        "message": "Incident status updated successfully",
        "incident": incident
    }


# --------------------------------------------------
# ASSIGN TEAM TO INCIDENT
# --------------------------------------------------

@router.post("/incidents/{incident_id}/assign")
async def assign_team(
    incident_id: int,
    db: Session = Depends(get_db)
):
    incident = (
        db.query(Incident)
        .filter(Incident.id == incident_id)
        .first()
    )

    if not incident:
        raise HTTPException(
            status_code=404,
            detail="Incident not found"
        )

    team = assign_team_to_incident(
        incident,
        db
    )

    if not team:
        raise HTTPException(
            status_code=404,
            detail="No available rescue team found"
        )

    # Real-time assignment update
    await manager.broadcast({
        "type": "team_assigned",
        "incident_id": incident.id,
        "team_id": team.id,
        "team_name": team.name,
        "status": incident.status
    })

    return {
        "message": "Team assigned successfully",
        "incident": incident,
        "team": team
    }


# --------------------------------------------------
# UPDATE RESPONSE STATUS
# --------------------------------------------------

@router.put("/incidents/{incident_id}/response")
async def update_incident_response(
    incident_id: int,
    status_update: StatusUpdate,
    db: Session = Depends(get_db)
):
    incident = (
        db.query(Incident)
        .filter(Incident.id == incident_id)
        .first()
    )

    if not incident:
        raise HTTPException(
            status_code=404,
            detail="Incident not found"
        )

    allowed_statuses = [
        "Assigned",
        "Accepted",
        "In Progress",
        "Completed"
    ]

    if status_update.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Use one of: {allowed_statuses}"
        )

    incident.status = status_update.status

    db.commit()
    db.refresh(incident)

    # Real-time response update
    await manager.broadcast({
        "type": "incident_response_update",
        "incident_id": incident.id,
        "status": incident.status
    })

    return {
        "message": "Incident response status updated successfully",
        "incident": incident
    }