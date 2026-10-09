from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI

from app.database import Base, engine

# Models
from app.models.incident import Incident
from app.models.team import Team

# REST routes
from app.routes.incidents import router as incident_router
from app.routes.reports import router as report_router
from app.routes.team import router as team_router
from app.routes.ai_events import router as ai_events_router

# WebSocket
from app.websocket.routes import router as websocket_router


# Create database tables
Base.metadata.create_all(bind=engine)


# Initialize application
app = FastAPI(
    title="VisionV Backend",
    description="Backend API for VisionV emergency coordination",
    version="1.0.0"
)
app = FastAPI(
    title="VisionV Backend",
    description="Backend API for VisionV emergency coordination",
    version="1.0.0"
)

# Allow the React frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register existing routes
app.include_router(report_router)
app.include_router(incident_router)
app.include_router(team_router)
app.include_router(ai_events_router)
app.include_router(websocket_router)

# Register routes
app.include_router(report_router)
app.include_router(incident_router)
app.include_router(team_router)
app.include_router(ai_events_router)
app.include_router(websocket_router)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "message": "VisionV backend is running"
    }
