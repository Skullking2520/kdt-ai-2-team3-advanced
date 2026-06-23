"""데모 공통 설정 — 환경변수 한 곳 관리.

.env 파일은 test-code/ 루트에서 자동 로드.
각 run.py는 이 파일을 import할 필요 없이 pipeline.config 사용 가능
(pipeline.config도 동일한 .env를 로드하기 때문).
이 파일은 데모에서 어떤 변수들이 필요한지 한눈에 확인하기 위한 문서 역할.

필요한 환경변수 (.env):
    AWS_ACCESS_KEY_ID       AWS S3 접근 키
    AWS_SECRET_ACCESS_KEY   AWS S3 비밀 키
    AWS_DEFAULT_REGION      리전 (기본: ap-northeast-2)
    S3_BUCKET               S3 버킷명
    MYSQL_HOST              RDS 엔드포인트
    MYSQL_PORT              MySQL 포트 (기본: 3306)
    MYSQL_USER              DB 사용자
    MYSQL_PASSWORD          DB 비밀번호
    MYSQL_DATABASE          DB명
    VIRUSTOTAL_API_KEY      VT API 키 (무료: 분당 4회, 일 500회)
    URLHAUS_AUTH_KEY        URLhaus API 인증 키
    PINECONE_API_KEY        Pinecone API 키
    PINECONE_INDEX_NAME     Pinecone 인덱스명 (smishing-cases-v01)
    EMBEDDING_MODEL         임베딩 모델 (jhgan/ko-sroberta-multitask)
    GEMINI_API_KEY          Gemini API 키 (web_to_rag 전용)
"""
import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).parent.parent  # test-code/ 디렉터리

load_dotenv(ROOT / ".env", override=True)

# ── AWS ───────────────────────────────────────────────────────────────
AWS_ACCESS_KEY_ID     = os.getenv("AWS_ACCESS_KEY_ID", "")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "")
AWS_DEFAULT_REGION    = os.getenv("AWS_DEFAULT_REGION", "ap-northeast-2")
S3_BUCKET             = os.getenv("S3_BUCKET", "smishing-s3-bucket")

# ── MySQL (RDS) ───────────────────────────────────────────────────────
MYSQL_HOST     = os.getenv("MYSQL_HOST", "127.0.0.1")
MYSQL_PORT     = int(os.getenv("MYSQL_PORT", "3306"))
MYSQL_USER     = os.getenv("MYSQL_USER", "admin")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "smishing_db")

# ── API Keys ──────────────────────────────────────────────────────────
VIRUSTOTAL_API_KEY = os.getenv("VIRUSTOTAL_API_KEY", "")
URLHAUS_AUTH_KEY   = os.getenv("URLHAUS_AUTH_KEY", "")
PINECONE_API_KEY   = os.getenv("PINECONE_API_KEY", "")
GEMINI_API_KEY     = os.getenv("GEMINI_API_KEY", "")

# ── VectorDB ──────────────────────────────────────────────────────────
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "smishing-cases-v01")
EMBEDDING_MODEL     = os.getenv("EMBEDDING_MODEL", "jhgan/ko-sroberta-multitask")

# ── ChromaDB ──────────────────────────────────────────────────────────
CHROMA_PATH       = os.getenv("CHROMA_PATH", str(ROOT / "chroma_db"))
CHROMA_COLLECTION = "smishing_cases"

# ── Pipeline 임계값 ───────────────────────────────────────────────────
SCORE_RAG_LOW   = 40   # 이상이면 RAG 사용
SCORE_RAG_HIGH  = 70   # 이하면 RAG 사용
SCORE_THRESHOLD = 70   # 위험 높음 기준

# ── VT 할당량 ─────────────────────────────────────────────────────────
VT_DAILY_AUTO_LIMIT   = 400
VT_DAILY_MANUAL_LIMIT = 100
VT_RATE_LIMIT_PER_MIN = 4
