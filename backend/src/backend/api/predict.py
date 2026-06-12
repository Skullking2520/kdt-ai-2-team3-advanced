from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.session import get_db
from ..schemas.predict_api import PredictRequest, PredictResponse
from ..services.predict_service import predict_smishing

router = APIRouter(prefix="/api/predict")


@router.post("", response_model=PredictResponse)
async def predict_sms_message(
    request: PredictRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    프론트엔드의 predictSmishing() 함수와 호환되는 스미싱 예측 API.
    """

    return await predict_smishing(db, request)
