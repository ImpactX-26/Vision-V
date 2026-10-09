from pydantic import BaseModel


class TeamCreate(BaseModel):

    name: str
    team_type: str
    lat: float
    lng: float
    available: bool = True