from pydantic import BaseSettings, Field


class Settings(BaseSettings):
    app_name: str = "Banorte MCP Advanced"
    redis_url: str = Field("redis://redis:6379/0", env="REDIS_URL")
    broker_url: str = Field("redis://redis:6379/1", env="BROKER_URL")
    result_backend: str = Field("redis://redis:6379/2", env="RESULT_BACKEND")
    stan_model_dir: str = Field("/app/stan_cache", env="STAN_MODEL_DIR")
    supabase_url: str = Field("http://supabase_db:5432", env="SUPABASE_URL")
    supabase_user: str = Field("postgres", env="SUPABASE_USER")
    supabase_password: str = Field("postgres", env="SUPABASE_PASSWORD")

    class Config:
        env_file = ".env"
        case_sensitive = False


def get_settings() -> Settings:
    return Settings()
