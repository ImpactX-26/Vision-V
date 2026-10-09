from sqlalchemy import Column, Integer, String, Float, Boolean

from app.database import Base


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String, nullable=False)

    team_type = Column(String, nullable=False)

    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)

    available = Column(Boolean, default=True)

    current_task = Column(Integer, nullable=True)