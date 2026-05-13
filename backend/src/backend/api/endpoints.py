from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db.session import get_db
from ..models.inference_log import InferenceLog

router = APIRouter()


@router.get("/tests")
def read_tests():
    return [{"users": "user1"}]


# 4. 테스트 API 엔드포인트
@router.get("/db_test")
def db_test(db: Session = Depends(get_db)):
    # 가짜 추론 데이터 생성 및 저장
    new_log = InferenceLog(model_name="my_model_v1", prediction=0.98)
    db.add(new_log)
    db.commit()
    db.refresh(new_log)

    return {"status": "success", "saved_id": new_log.id, "data": new_log}
