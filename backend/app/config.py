import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    APP_NAME = os.getenv("APP_NAME", "VisionV Backend")
    APP_HOST = os.getenv("APP_HOST", "0.0.0.0")
    APP_PORT = int(os.getenv("APP_PORT", "8000"))

    AI_SERVICE_URL = os.getenv(
        "AI_SERVICE_URL",
        "http://localhost:8001"
    )

    USE_MOCK_AI = os.getenv(
        "USE_MOCK_AI",
        "true"
    ).lower() == "true"


settings = Settings()