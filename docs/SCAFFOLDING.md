# 🚀 Team AI Project — 환경 세팅 가이드

> **대상:** 린팅·포맷팅·커밋 훅 설정이 처음인 팀원
> **목표:** conda + uv + pre-commit 기반의 재현 가능한 Python AI 개발 환경 구축 및 GitHub 첫 푸시

---

## 목차

1. [전제 조건 — 사전 설치](#1-전제-조건--사전-설치)
2. [프로젝트 클론 및 Conda 환경 생성](#2-프로젝트-클론-및-conda-환경-생성)
3. [uv 설치 및 의존성 동기화](#3-uv-설치-및-의존성-동기화)
4. [린터·포맷터 — Ruff](#4-린터포맷터--ruff)
5. [환경변수 관리 — python-dotenv](#5-환경변수-관리--python-dotenv)
6. [커밋 훅 — pre-commit](#6-커밋-훅--pre-commit)
7. [GitHub 첫 푸시 절차](#7-github-첫-푸시-절차)
8. [프로젝트 디렉터리 구조](#8-프로젝트-디렉터리-구조)
9. [일상적인 개발 워크플로](#9-일상적인-개발-워크플로)
10. [자주 묻는 질문 (FAQ)](#10-자주-묻는-질문-faq)

---

## 1. 전제 조건 — 사전 설치

아래 도구들이 시스템에 설치되어 있어야 합니다.

### 1-1. Conda (Miniconda 권장)

Conda는 Python 인터프리터 버전 자체를 프로젝트별로 격리하는 데 사용합니다.

```bash
# macOS/Linux — Miniconda 설치 스크립트 다운로드 및 실행
curl -LO https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh
bash Miniconda3-latest-Linux-x86_64.sh

# 설치 후 셸 재시작 또는 아래 명령 실행
source ~/.bashrc   # bash
source ~/.zshrc    # zsh
```

> **Windows 사용자:** [Miniconda 공식 페이지](https://docs.conda.io/en/latest/miniconda.html)에서 `.exe` 인스톨러를 다운로드하여 실행하세요.

설치 확인:

```bash
conda --version
# 예: conda 24.x.x
```

### 1-2. Git

```bash
# macOS (Homebrew)
brew install git

# Ubuntu/Debian
sudo apt update && sudo apt install git

# 설치 확인
git --version
```

---

## 2. 프로젝트 클론 및 Conda 환경 생성

### 2-1. 저장소 클론

```bash
git clone https://github.com/<your-org>/<your-repo>.git
cd <your-repo>
```

### 2-2. Conda 환경 생성

프로젝트 루트의 `environment.yml`을 사용하여 Conda 환경을 생성합니다.

```bash
conda env create -f environment.yml
```

`environment.yml` 파일 내용 (이 파일은 이미 저장소에 포함되어 있습니다):

```yaml
# environment.yml
name: team-ai
channels:
  - defaults
  - conda-forge
dependencies:
  - python=3.12
  - pip
```

> **핵심 원칙:** Conda는 Python 버전 고정에만 사용하고, 패키지 설치는 전부 `uv`로 처리합니다.
> Conda와 pip를 혼용하면 의존성 충돌이 발생할 수 있으므로 이 규칙을 반드시 지켜 주세요.

### 2-3. Conda 환경 활성화

```bash
conda activate team-ai

# 활성화 확인 — 프롬프트 앞에 (team-ai)가 표시되어야 함
# (team-ai) user@machine:~/your-repo$
python --version
# Python 3.12.x
```

---

## 3. uv 설치 및 의존성 동기화

uv는 pip보다 10–100배 빠른 Python 패키지 관리자입니다. 가상환경 생성, 패키지 설치, 스크립트 실행을 모두 담당합니다.

### 3-1. uv 설치

```bash
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# 설치 후 PATH 적용 (터미널 재시작 또는 아래 실행)
source $HOME/.local/bin/env

# Windows (PowerShell)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# 설치 확인
uv --version
# uv 0.x.x
```

### 3-2. uv 가상환경 생성 (Conda 환경 내부)

> Conda 환경이 활성화된 상태에서 실행합니다.

```bash
# Conda Python을 사용하는 uv 가상환경 생성
uv venv --python $(which python)

# 가상환경 활성화
source .venv/bin/activate        # macOS/Linux
.venv\Scripts\activate           # Windows
```

> 이후 모든 `uv` 명령은 이 가상환경에 자동으로 설치됩니다.

### 3-3. 의존성 동기화 (처음 세팅 시 필수)

저장소를 클론한 후 가장 먼저 실행해야 하는 명령입니다.

```bash
uv sync
```

`uv sync`는 `pyproject.toml`과 `uv.lock`에 기록된 정확한 버전으로 패키지를 설치합니다. 팀 전체가 동일한 환경을 보장하는 핵심 명령입니다.

### 3-4. 패키지 추가 방법

```bash
# 프로덕션 의존성 추가
uv add torch torchvision transformers accelerate

# 개발 전용 의존성 추가 (CI·테스트·린팅 도구)
uv add --dev ruff pytest pytest-cov pre-commit python-dotenv

# 패키지 제거
uv remove <패키지명>
```

> 패키지를 추가하거나 제거할 때마다 `pyproject.toml`과 `uv.lock`이 자동으로 업데이트됩니다.
> **반드시 두 파일 모두 Git에 커밋**해야 합니다.

---

## 4. 린터·포맷터 — Ruff

Ruff는 Black(포맷터), isort(임포트 정렬), Flake8(린터)을 하나로 합친 도구입니다. Rust로 작성되어 기존 도구 대비 수십 배 빠릅니다.

### 4-1. pyproject.toml Ruff 설정

`pyproject.toml`에 아래 설정이 포함되어 있어야 합니다:

```toml
[tool.ruff]
line-length = 88
target-version = "py312"

[tool.ruff.lint]
# E: pycodestyle 오류, F: Pyflakes, I: isort, N: Naming, W: Warning
select = ["E", "F", "I", "N", "W"]
ignore = []

[tool.ruff.format]
quote-style = "double"
indent-style = "space"
```

### 4-2. 수동 실행 방법

```bash
# 린트 검사 + 자동 수정
uv run ruff check --fix .

# 코드 포맷팅
uv run ruff format .

# 두 가지를 한 번에
uv run ruff check --fix . && uv run ruff format .
```

> `uv run`을 앞에 붙이면 가상환경 활성화 여부와 무관하게 올바른 환경에서 명령이 실행됩니다.

---

## 5. 환경변수 관리 — python-dotenv

API Key(OpenAI, WandB, HuggingFace 등)나 DB 접속 정보는 **절대로 코드에 하드코딩하거나 Git에 커밋하지 않습니다.**

### 5-1. .env 파일 생성

```bash
# 프로젝트 루트에 .env 파일 생성
touch .env
```

`.env` 파일 작성 예시:

```dotenv
# .env — 이 파일은 절대 Git에 커밋하지 마세요!
OPENAI_API_KEY=sk-...
WANDB_API_KEY=...
HF_TOKEN=...
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
```

### 5-2. .gitignore에 .env 추가 확인

`.gitignore` 파일에 다음 항목이 포함되어 있는지 확인하세요:

```gitignore
# 환경변수 파일 — 절대 커밋 금지
.env
.env.*
!.env.example
```

### 5-3. .env.example 파일 관리

팀원이 필요한 환경변수 목록을 알 수 있도록 **실제 값 없이** 키 목록만 기재한 `.env.example`을 Git에 포함합니다:

```dotenv
# .env.example — 이 파일은 Git에 커밋합니다
OPENAI_API_KEY=
WANDB_API_KEY=
HF_TOKEN=
DATABASE_URL=
```

### 5-4. Python 코드에서 환경변수 로드

```python
# src/config.py
from dotenv import load_dotenv
import os

load_dotenv()  # .env 파일을 자동으로 탐색하여 로드

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.")
```

---

## 6. 커밋 훅 — pre-commit

pre-commit은 `git commit` 실행 시 자동으로 린팅·포맷팅·보안 검사를 실행합니다. 코드 품질 기준을 통과하지 못하면 커밋이 **자동으로 차단**됩니다.

### 6-1. .pre-commit-config.yaml 확인

프로젝트 루트의 `.pre-commit-config.yaml` 파일:

```yaml
# .pre-commit-config.yaml
repos:
  # 기본 파일 검사 (줄바꿈, 공백, YAML 문법 등)
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.6.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-toml
      - id: check-added-large-files
        args: ["--maxkb=5000"]
      - id: detect-private-key # 실수로 API Key 커밋 방지

  # Ruff 린트 + 포맷팅
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.4.4
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format
```

### 6-2. pre-commit 훅 설치

저장소를 클론한 후 **한 번만** 실행합니다:

```bash
uv run pre-commit install
```

성공 시 출력:

```
pre-commit installed at .git/hooks/pre-commit
```

### 6-3. 전체 파일 대상으로 수동 실행

```bash
# 모든 파일에 대해 훅 실행 (초기 세팅 시 권장)
uv run pre-commit run --all-files
```

### 6-4. 동작 예시

```bash
git add src/model.py
git commit -m "feat: add transformer encoder"

# pre-commit이 자동으로 실행됨
# Ruff가 코드를 수정했다면 커밋이 차단되고 아래 메시지 출력:
# ruff.....................................................................Failed
# - hook id: ruff
# - files were modified by this hook
#
# 수정된 파일을 다시 스테이징 후 커밋:
git add src/model.py
git commit -m "feat: add transformer encoder"  # 이번엔 통과
```

> pre-commit이 파일을 자동 수정했다면, 수정된 파일을 `git add`로 다시 스테이징한 뒤 동일한 커밋 메시지로 재시도하면 됩니다.

---

## 7. GitHub 첫 푸시 절차

> 이 섹션은 **프로젝트를 처음 생성하는 담당자**가 따라야 하는 절차입니다.
> 팀원들은 [2번 섹션](#2-프로젝트-클론-및-conda-환경-생성)부터 시작하세요.

### 7-1. 프로젝트 스캐폴딩

```bash
# uv로 새 프로젝트 초기화
uv init team-ai-project
cd team-ai-project
```

`uv init`이 생성하는 기본 구조:

```
team-ai-project/
├── pyproject.toml
├── README.md
└── hello.py
```

### 7-2. 디렉터리 구조 정리

```bash
# 권장 디렉터리 구조로 재편성
mkdir -p src tests notebooks configs

# hello.py 삭제 후 패키지 초기화
rm hello.py
touch src/__init__.py
touch tests/__init__.py
```

### 7-3. 필수 설정 파일 생성

**environment.yml** (Conda 환경 정의):

```bash
cat > environment.yml << 'EOF'
name: team-ai
channels:
  - defaults
  - conda-forge
dependencies:
  - python=3.12
  - pip
EOF
```

**.gitignore** 생성:

```bash
cat > .gitignore << 'EOF'
# Python
__pycache__/
*.py[cod]
*.pyo
*.pyd
.Python
*.egg-info/
dist/
build/

# 환경
.env
.env.*
!.env.example
.venv/
venv/

# uv
.python-version

# Jupyter
.ipynb_checkpoints/
*.ipynb

# 모델 가중치 / 데이터 (용량이 크므로 Git LFS 또는 제외)
*.pt
*.pth
*.ckpt
*.bin
data/

# IDE
.vscode/
.idea/
*.swp

# macOS
.DS_Store

# 로그
*.log
logs/
wandb/
mlruns/
EOF
```

**.env.example** 생성:

```bash
cat > .env.example << 'EOF'
OPENAI_API_KEY=
WANDB_API_KEY=
HF_TOKEN=
EOF
```

**pyproject.toml** 업데이트 (Ruff 설정 추가):

```toml
[project]
name = "team-ai-project"
version = "0.1.0"
description = "Team AI Project"
requires-python = ">=3.12"
dependencies = []

[project.optional-dependencies]
dev = [
    "ruff>=0.4.0",
    "pytest>=8.0.0",
    "pytest-cov>=5.0.0",
    "pre-commit>=3.7.0",
    "python-dotenv>=1.0.0",
]

[tool.ruff]
line-length = 88
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W"]
ignore = []

[tool.ruff.format]
quote-style = "double"
indent-style = "space"

[tool.pytest.ini_options]
testpaths = ["tests"]
```

**.pre-commit-config.yaml** 생성:

```bash
cat > .pre-commit-config.yaml << 'EOF'
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.6.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-toml
      - id: check-added-large-files
        args: ["--maxkb=5000"]
      - id: detect-private-key

  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.4.4
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format
EOF
```

### 7-4. Conda 환경 생성 및 의존성 설치

```bash
# Conda 환경 생성
conda env create -f environment.yml
conda activate team-ai

# uv 가상환경 생성 및 의존성 설치
uv venv --python $(which python)
source .venv/bin/activate

# 개발 의존성 설치
uv add --dev ruff pytest pytest-cov pre-commit python-dotenv

# pre-commit 훅 등록
uv run pre-commit install
```

### 7-5. GitHub 저장소 연결 및 첫 푸시

```bash
# Git 저장소 초기화
git init

# 사용자 정보 설정 (최초 1회)
git config --global user.name "Your Name"
git config --global user.email "you@example.com"

# 원격 저장소 연결
# (GitHub에서 빈 저장소를 먼저 생성한 뒤 URL을 복사)
git remote add origin https://github.com/<your-org>/<your-repo>.git

# 기본 브랜치를 main으로 설정
git branch -M main

# 전체 파일 스테이징 및 첫 커밋
git add .
git commit -m "chore: initial project scaffolding"

# GitHub에 푸시
git push -u origin main
```

> `git push` 시 GitHub 인증을 요청할 수 있습니다.
> Personal Access Token(PAT) 방식 또는 SSH 키 방식을 사용하세요.
> PAT 생성: GitHub → Settings → Developer settings → Personal access tokens

---

## 8. 프로젝트 디렉터리 구조

```
team-ai-project/
├── .env                     # ❌ Git 제외 — 실제 API Key 등
├── .env.example             # ✅ Git 포함 — 키 목록만 (값 없음)
├── .gitignore
├── .pre-commit-config.yaml
├── .venv/                   # ❌ Git 제외 — uv 가상환경
├── environment.yml          # ✅ Git 포함 — Conda 환경 정의
├── pyproject.toml           # ✅ Git 포함 — 패키지 및 도구 설정
├── uv.lock                  # ✅ Git 포함 — 정확한 버전 잠금
├── README.md
├── configs/                 # 모델·학습 설정 파일 (YAML/JSON)
│   └── train_config.yaml
├── notebooks/               # 탐색적 분석용 Jupyter 노트북
│   └── eda.ipynb
├── src/                     # 메인 소스 코드
│   ├── __init__.py
│   ├── config.py            # 환경변수 로드
│   ├── data/
│   ├── models/
│   └── utils/
└── tests/                   # pytest 테스트
    ├── __init__.py
    └── test_example.py
```

---

## 9. 일상적인 개발 워크플로

### 작업 시작

```bash
# 1. Conda 환경 활성화
conda activate team-ai

# 2. uv 가상환경 활성화
source .venv/bin/activate

# 3. 최신 코드 받기 및 의존성 동기화
git pull origin main
uv sync
```

### 코드 작성 및 커밋

```bash
# 린트 + 포맷팅 수동 실행 (커밋 전 확인)
uv run ruff check --fix . && uv run ruff format .

# 테스트 실행
uv run pytest

# 커밋 (pre-commit이 자동 실행됨)
git add .
git commit -m "feat: add data preprocessing pipeline"
git push origin <브랜치명>
```

### 패키지 추가 시

```bash
uv add <패키지명>
# pyproject.toml과 uv.lock이 자동 업데이트됨
git add pyproject.toml uv.lock
git commit -m "chore: add <패키지명> dependency"
```

---

## 10. 자주 묻는 질문 (FAQ)

**Q. `uv sync`와 `uv add`의 차이는 무엇인가요?**
`uv sync`는 `uv.lock`에 기록된 버전 그대로 설치(재현)합니다. `uv add`는 새 패키지를 추가하고 `uv.lock`을 업데이트합니다. 클론 후 첫 세팅에는 `uv sync`, 새 패키지가 필요할 때는 `uv add`를 사용하세요.

**Q. pre-commit이 코드를 자동 수정했는데 커밋이 실패했습니다.**
Ruff가 파일을 수정했지만 스테이징되지 않은 상태이기 때문입니다. `git add .`로 수정된 파일을 다시 스테이징한 후 동일한 커밋 명령을 재실행하면 됩니다.

**Q. 긴급 상황에 pre-commit을 건너뛸 수 있나요?**
가능은 하지만 권장하지 않습니다. `git commit --no-verify -m "..."` 옵션으로 우회할 수 있습니다. 단, CI에서 동일한 검사가 실행되므로 어차피 수정이 필요합니다.

**Q. `uv.lock` 파일을 Git에 포함해야 하나요?**
반드시 포함해야 합니다. `uv.lock`은 팀 전체가 동일한 패키지 버전을 사용하도록 보장하는 핵심 파일입니다.

**Q. Conda와 uv를 함께 쓰는 이유는 무엇인가요?**
Conda는 Python 인터프리터 버전을 시스템 레벨에서 안정적으로 고정하는 데 강점이 있고, uv는 Python 패키지 설치 속도와 의존성 해결 성능이 매우 뛰어납니다. 두 도구의 장점을 각각 활용하는 구성입니다.

---

_이 문서에서 누락된 내용이나 오류가 있으면 PR 또는 이슈로 알려 주세요._
