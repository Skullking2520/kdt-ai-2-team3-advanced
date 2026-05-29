from pydantic import Field
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    langfuse_public_key: str = Field(default=...) # ...은 반드시 값이 있어야함!
    langfuse_secret_key: str = Field(default=...)
    langfuse_base_url: str = "https://jp.cloud.langfuse.com"
    openai_api_key: str = Field(default=...)
    
    model_config = {"env_file": ".env", "case_sensitive": False}

settings = Settings()


