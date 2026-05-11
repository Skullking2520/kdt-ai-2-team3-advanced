# src/backend/main.py
from fastapi import Depends, FastAPI
from sqlalchemy.orm import Session

from .db import InferenceLog, get_db

app = FastAPI()


@app.get("/")
def read_root():
    return {"message": "Hello from uv monorepo!"}


@app.get("/items/{item_id}")
def read_item(item_id: int):
    return {"item_id": item_id}


# 4. 테스트 API 엔드포인트
@app.get("/db_test")
def db_test(db: Session = Depends(get_db)):
    # 가짜 추론 데이터 생성 및 저장
    new_log = InferenceLog(model_name="my_model_v1", prediction=0.98)
    db.add(new_log)
    db.commit()
    db.refresh(new_log)

    return {"status": "success", "saved_id": new_log.id, "data": new_log}
