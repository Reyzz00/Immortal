from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Longevity OS"
    database_url: str = f"sqlite:///{Path(__file__).resolve().parent.parent.parent}/longevity.db"
    demo_user_id: int = 1

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
