"""FastAPI 진입점."""

from fastapi import FastAPI
import uvicorn

from .api.routes import router
from .config.settings import settings

app = FastAPI(
    title="AI Service",
    description="Smishing LangGraph + Chroma RAG test API",
    version="0.1.0",
)

app.include_router(router)


@app.get("/")
def root() -> dict[str, str]:
    return {"message": f'ai_service is running in {settings.APP_ENV}'}


def main() -> None:
    is_prod = settings.APP_ENV == "production"
    uvicorn.run("ai_service.main:app", host="0.0.0.0", port=8080, reload=not is_prod)

if __name__ == "__main__":
    main()