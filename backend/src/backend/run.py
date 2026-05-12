import uvicorn

from backend.main import app  # main.py의 FastAPI 인스턴스 가져오기

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
