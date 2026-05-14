from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.session import get_db
from ..models.inference_log import InferenceLog

router = APIRouter(prefix="/endpoints")  # tags=[]는 swagger 기능으로 묶임


# 테스트 API 엔드포인트
@router.get("/db_test")
async def db_test(db: AsyncSession = Depends(get_db)):
    # 가짜 추론 데이터 생성 및 저장
    new_log = InferenceLog(model_name="my_model_v1", prediction=0.98)
    db.add(new_log)  # 메모리에만 추가하므로 await 없음
    await db.commit()
    await db.refresh(new_log)

    return {"status": "success", "saved_id": new_log.id, "data": new_log}
