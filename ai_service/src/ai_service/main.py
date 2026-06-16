"""FastAPI 진입점."""

from fastapi import FastAPI

from .api.routes import router
from .utils.langfuse_init import get_langfuse_client

app = FastAPI(
    title="AI Service",
    description="Smishing LangGraph + Chroma RAG test API",
    version="0.1.0",
)

# ensure Langfuse client is instantiated at import/startup time
langfuse = get_langfuse_client()

app.include_router(router)


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "ai_service is running"}


def main() -> None:
    import uvicorn

    uvicorn.run("ai_service.main:app", host="0.0.0.0", port=8080, reload=True)
