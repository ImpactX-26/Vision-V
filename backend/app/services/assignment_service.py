from sqlalchemy.orm import Session

from app.models.incident import Incident
from app.models.team import Team


def assign_team_to_incident(
    incident: Incident,
    db: Session
):

    # Find an available rescue team
    team = (
        db.query(Team)
        .filter(
            Team.team_type == "Rescue",
            Team.available == True
        )
        .first()
    )

    # No team available
    if not team:
        return None

    # Assign team
    team.available = False
    team.current_task = incident.id

    incident.status = "Assigned"

    db.commit()

    db.refresh(team)
    db.refresh(incident)

    return team