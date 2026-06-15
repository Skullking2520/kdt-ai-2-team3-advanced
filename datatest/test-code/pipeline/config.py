"""파이프라인 공통 설정.

환경변수는 .env 파일에서 자동 로드된다.
"""

import os

from dotenv import load_dotenv

load_dotenv(override=True)

# ─ S3 ─────────────────────────────────────────
S3_BUCKET = os.getenv("S3_BUCKET", "smishing-dev-newbies-2026")
S3_REGION = os.getenv("AWS_DEFAULT_REGION", "ap-northeast-2")

# ─ MySQL ──────────────────────────────────────
MYSQL_CONFIG = {
    "host": os.getenv("MYSQL_HOST", "127.0.0.1"),
    "port": int(os.getenv("MYSQL_PORT", "3306")),
    "user": os.getenv("MYSQL_USER", "smishing_user"),
    "password": os.getenv("MYSQL_PASSWORD", "dev1234"),
    "database": os.getenv("MYSQL_DATABASE", "smishing"),
    "charset": "utf8mb4",
    "autocommit": True,
    "init_command": "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
}

# ─ ChromaDB ──────────────────────────────────
CHROMA_PATH = os.getenv("CHROMA_PATH", "./chroma_db")
CHROMA_COLLECTION = "smishing_cases"
EMBEDDING_MODEL = "jhgan/ko-sroberta-multitask"

# ─ 파이프라인 임계값 ──────────────────────────
SCORE_RAG_LOW = 40   # 이 이상이면 RAG 사용
SCORE_RAG_HIGH = 70  # 이 이하면 RAG 사용
SCORE_THRESHOLD = 70 # 위험 높음 기준

# ─ VirusTotal ─────────────────────────────────
VT_API_KEY = os.getenv("VIRUSTOTAL_API_KEY", "")
VT_DAILY_AUTO_LIMIT = 400
VT_DAILY_MANUAL_LIMIT = 100
VT_RATE_LIMIT_PER_MIN = 4

# ─ 배치 크기 ──────────────────────────────────
BATCH_SIZE_PIPELINE = 100   # raw/labeled/processed/reason
BATCH_SIZE_VT = 1000        # analytics/virustotal

# ─ URLhaus ────────────────────────────────────
URLHAUS_AUTH_KEY = os.getenv("URLHAUS_AUTH_KEY", "")

# - pinecone
PINECONE_INDEX_NAME = "smishing-cases-v01"
EMBEDDING_MODEL = "jhgan/ko-sroberta-multitask"
PINECONE_API_KEY = os.environ["PINECONE_API_KEY"]
