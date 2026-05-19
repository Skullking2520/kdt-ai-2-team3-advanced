from fastapi import APIRouter

router = APIRouter()  # tags=[]는 swagger 기능으로 묶임


@router.get("/")
def read_root():  # await할게 없으면 async하지 않는다.
    return {"message": "Hello!"}


@router.get("/health")
def health_check():
    return {"status": "ok"}
