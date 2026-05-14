# custom exceptions
from fastapi import Request
from fastapi.responses import JSONResponse


async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(
        status_code=400, content={"detail": f"잘못된 입력값입니다. {str(exc)}"}
    )


async def custom_runtime_error_handler(request: Request, exc: RuntimeError):
    return JSONResponse(status_code=500, content={"detail: 서버 오류가 발생했습니다. "})


# main.py에서 한번에 등록하기 위한 매핑 딕셔너리 생성
exception_handlers = {
    ValueError: value_error_handler,
    RuntimeError: custom_runtime_error_handler,
}
