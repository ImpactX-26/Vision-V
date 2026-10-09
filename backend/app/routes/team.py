from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.team import Team
from app.schemas.team import TeamCreate
from app.websocket.manager import manager


router = APIRouter(
    prefix="/api/teams",
    tags=["Teams"]
)


@router.post("")
async def create_team(
    team_data: TeamCreate,
    db: Session = Depends(get_db)
):

    team = Team(
        name=team_data.name,
        team_type=team_data.team_type,
        lat=team_data.lat,
        lng=team_data.lng,
        available=team_data.available
    )

    db.add(team)
    db.commit()
    db.refresh(team)

    await manager.broadcast({
        "type": "team_created",
        "team_id": team.id,
        "team_name": team.name,
        "team_type": team.team_type,
        "available": team.available
    })

    return {
        "message": "Team created successfully",
        "team": team
    }


@router.get("")
def get_teams(
    db: Session = Depends(get_db)
):

    teams = db.query(Team).all()

    return teams