# 🚀 하위 프로젝트 생성 및 의존성 추가 순서

하위 패키지 초기화 (Init)단순히 폴더를 만드는 게 아니라, 해당 경로에서 uv init --lib 명령어를 사용해 기본 파일들을 생성합니다.

```python
1. 프론트엔드 (Streamlit)

mkdir -p frontend
cd frontend
uv init --package

2. 백엔드 (FastAPI)

cd ..
mkdir -p backend
cd backend
uv init --package

3. AI 모델 (PyTorch)

cd ..
mkdir -p ai_service
cd ai_service
uv init --package
```

이제 특정 경로에서 의존성 추가 (uv add)이제 각 폴더로 들어가서 필요한 라이브러리를 추가합니다. uv는 현재 디렉토리에서 가장 가까운 pyproject.toml을 찾아 업데이트합니다.

```python
# Frontend에 Streamlit 추가
cd frontend
uv add streamlit

# Backend에 FastAPI 추가
cd ../backend
uv add fastapi

# AI Core에 PyTorch 추가
cd ../ai_service
uv add torch --extra-index-url https://pytorch.org # GPU 버전 예시
```

3. 루트에서 전체 동기화어느 폴더에서든 의존성을 추가한 후, 프로젝트 루트에서 uv sync를 실행하면 전체 워크스페이스의 상태가 uv.lock 파일 하나에 통합되어 관리됩니다.

💡 꿀팁: 이동하지 않고 추가하기 (-p 옵션)

매번 cd로 폴더를 옮겨 다니기 귀찮다면, 루트 디렉토리에서 -p (package) 옵션을 사용하여 특정 프로젝트에 패키지를 바로 꽂아 넣을 수 있습니다.

```
# 루트 위치에서 실행
uv add streamlit -p frontend
uv add fastapi -p backend
uv add torch -p ai_service
# 이 방식을 쓰려면 루트 pyproject.toml에 [tool.uv.workspace] members = [...] 설정이 미리 되어 있어야 합니다.
```

⚠️ 주의사항

파일 위치:

각 하위 폴더에 pyproject.toml이 있어야 합니다. (루트에만 있으면 모든 의존성이 하나로 뒤섞입니다.)

이름 중복: 각 pyproject.toml 안의 name = "..." 값이 서로 중복되지 않도록 주의하세요.

# 워크스페이스 설정을 완성하기 위한 루트 설정법과 내부 라이브러리 참조 방식

1. 루트 pyproject.toml 작성 (전체 연결)

루트 디렉토리에 아래 내용을 작성하여 하위 폴더들을 하나의 워크스페이스로 묶어줍니다.

```toml
[project]
name = "my-ai-monorepo"
version = "0.1.0"
description = "FE, BE, AI 통합 프로젝트"
readme = "README.md"
requires-python = ">=3.10"
dependencies = [
    "loguru>=0.7.2", # 모든 앱에서 공통으로 쓸 라이브러리
]

[tool.uv.workspace]
members = ["apps/*", "libs/*"]
```

2. 하위 패키지간 연결 (AI Core -> Backend)

libs/ai-core에 있는 모델 로직을 apps/backend에서 사용하고 싶을 때, 백엔드의 pyproject.toml을 다음과 같이 설정합니다.apps/backend/pyproject.toml

```toml
[project]
name = "backend"
version = "0.1.0"
dependencies = [
    "fastapi>=0.100.0",
    "uvicorn>=0.22.0",
    "ai-core", # 워크스페이스 내 패키지 이름 사용
]

[tool.uv.sources]
ai-core = { workspace = true } # 로컬 워크스페이스에서 가져오겠다고 명시
```

3. 실제 코드 사용 예시 (import)

패키지 구조가 src 레이아웃을 사용한다고 가정했을 때의 예시입니다.

libs/ai-core/src/ai_core/model.py

```python
class AICalculator:
    def predict(self, data: str):
        return f"AI가 분석한 결과: {data}"
```

apps/backend/src/backend/main.py

```python
from fastapi import FastAPI
from ai_core.model import AICalculator  # 별도 설치 없이 바로 임포트 가능

app = FastAPI()
model = AICalculator()

@app.get("/")
def read_root():
    return {"message": model.predict("Hello UV!")}
```

🛠️ 실무 팁

실행 방법: 루트 폴더에서 uv run -p backend uvicorn backend.main:app 처럼 -p 옵션으로 특정 앱을 지정해서 실행할 수 있습니다.

환경 변수: FE, BE, AI가 공유해야 하는 환경 변수는 루트에 .env를 두고 python-dotenv 등으로 불러오면 편리합니다.

Docker: 빌드 시 uv lock과 pyproject.toml을 모두 복사해야 워크스페이스 의존성이 정상적으로 해결됩니다.
