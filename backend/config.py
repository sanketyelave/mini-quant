import os
from typing import List

class Settings:
    PROJECT_NAME: str = "Mini-Quant API"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./stock_data.db")
    
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost",
        "http://127.0.0.1:3000",
    ]
    
    # Add production URL when deployed
    if os.getenv("PRODUCTION_URL"):
        CORS_ORIGINS.append(os.getenv("PRODUCTION_URL"))

settings = Settings()