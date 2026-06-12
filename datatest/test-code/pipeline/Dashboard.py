"""스미싱 파이프라인 모니터링 대시보드.

DuckDB로 S3 데이터를 직접 조회하고 Streamlit으로 시각화.

실행:
    uv run streamlit run pipeline/dashboard.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import duckdb
import plotly.express as px
import pymysql
import streamlit as st

from pipeline.config import MYSQL_CONFIG, S3_BUCKET, S3_REGION
import chromadb
from pipeline.config import CHROMA_PATH, CHROMA_COLLECTION

# ─────────────────────────────────────────────────
# 설정
# ─────────────────────────────────────────────────

st.set_page_config(
    page_title="스미싱 파이프라인 대시보드",
    page_icon="🛡️",
    layout="wide",
)

S3_PREFIX = f"s3://{S3_BUCKET}"


# ─────────────────────────────────────────────────
# 연결
# ─────────────────────────────────────────────────

@st.cache_resource
def get_duckdb():
    con = duckdb.connect()
    con.execute("INSTALL httpfs; LOAD httpfs;")
    con.execute(f"""
        SET s3_region='{S3_REGION}';
        SET s3_access_key_id='{os.getenv('AWS_ACCESS_KEY_ID', '')}';
        SET s3_secret_access_key='{os.getenv('AWS_SECRET_ACCESS_KEY', '')}';
    """)
    return con


@st.cache_resource
def get_mysql():
    return pymysql.connect(
        **MYSQL_CONFIG,
        cursorclass=pymysql.cursors.DictCursor,
    )


def mysql_query(sql: str) -> list[dict]:
    try:
        conn = get_mysql()
        with conn.cursor() as cur:
            cur.execute(sql)
            return cur.fetchall()
    except Exception as e:
        st.error(f"MySQL 오류: {e}")
        return []


def duckdb_query(con, sql: str):
    try:
        return con.execute(sql).df()
    except Exception:
        return None


# ─────────────────────────────────────────────────
# 데이터 조회
# ─────────────────────────────────────────────────

def get_stage_counts(con) -> dict:
    stages = ["raw", "labeled", "processed", "reason"]
    counts = {}
    for stage in stages:
        df = duckdb_query(con, f"""
            SELECT COUNT(*) as cnt
            FROM read_ndjson_auto('{S3_PREFIX}/{stage}/**/*.jsonl')
        """)
        counts[stage] = int(df.iloc[0]["cnt"]) if df is not None else 0
    return counts


def get_daily_sms(con):
    return duckdb_query(con, f"""
        SELECT
            CAST(received_at AS DATE) as date,
            COUNT(*) as count
        FROM read_ndjson_auto('{S3_PREFIX}/reason/**/*.jsonl')
        GROUP BY CAST(received_at AS DATE)
        ORDER BY date
    """)


def get_rag_ratio(con):
    return duckdb_query(con, f"""
        SELECT reasoning_method, COUNT(*) as count
        FROM read_ndjson_auto('{S3_PREFIX}/reason/**/*.jsonl')
        GROUP BY reasoning_method
    """)


def get_risk_distribution(con):
    return duckdb_query(con, f"""
        SELECT risk_level, COUNT(*) as count
        FROM read_ndjson_auto('{S3_PREFIX}/processed/**/*.jsonl')
        WHERE risk_level IS NOT NULL
        GROUP BY risk_level
    """)


def get_vt_summary(con) -> dict:
    df = duckdb_query(con, f"""
        SELECT
            COUNT(*) as total,
            COUNT(CASE WHEN json_extract_string(summary, '$.위험등급') = '매우 위험' THEN 1 END) as very_high,
            COUNT(CASE WHEN json_extract_string(summary, '$.위험등급') = '위험' THEN 1 END) as high,
            COUNT(CASE WHEN json_extract_string(summary, '$.위험등급') = '의심' THEN 1 END) as suspicious,
            COUNT(CASE WHEN json_extract_string(summary, '$.위험등급') = '정상' THEN 1 END) as normal
        FROM read_ndjson_auto('{S3_PREFIX}/analytics/virustotal/**/*.jsonl')
    """)
    if df is None:
        return {"total": 0, "매우 위험": 0, "위험": 0, "의심": 0, "정상": 0}
    row = df.iloc[0]
    return {
        "total": int(row["total"]),
        "매우 위험": int(row["very_high"]),
        "위험": int(row["high"]),
        "의심": int(row["suspicious"]),
        "정상": int(row["normal"]),
    }


def get_vt_score_hist(con):
    return duckdb_query(con, f"""
        SELECT
            CAST(split_part(
                json_extract_string(summary, '$.위험점수'), ' / ', 1
            ) AS INTEGER) as malicious_count
        FROM read_ndjson_auto('{S3_PREFIX}/analytics/virustotal/**/*.jsonl')
    """)

def get_avg_times(con):
    return duckdb_query(con, f"""
        SELECT
            AVG(
                epoch(CAST(processed_at AS TIMESTAMP)) -
                epoch(CAST(received_at AS TIMESTAMP))
            ) as avg_model_sec,
            AVG(
                epoch(CAST(reasoned_at AS TIMESTAMP)) -
                epoch(CAST(processed_at AS TIMESTAMP))
            ) as avg_reason_sec
        FROM read_ndjson_auto('{S3_PREFIX}/reason/**/*.jsonl')
    """)

def get_log_summary(con):
    error_df = duckdb_query(con, f"""
        SELECT COUNT(*) as cnt
        FROM read_ndjson_auto('{S3_PREFIX}/logs/errors/**/*.jsonl')
    """)
    error_count = int(error_df.iloc[0]["cnt"]) if error_df is not None else 0

    recent_errors = duckdb_query(con, f"""
        SELECT timestamp, module, function, message
        FROM read_ndjson_auto('{S3_PREFIX}/logs/errors/**/*.jsonl')
        ORDER BY timestamp DESC
        LIMIT 10
    """)
    return error_count, recent_errors


def get_chroma_info() -> dict:
    try:
        client = chromadb.PersistentClient(path=CHROMA_PATH)
        collection = client.get_or_create_collection(
            name=CHROMA_COLLECTION,
            metadata={"hnsw:space": "cosine"},
        )
        total = collection.count()
        results = collection.get(include=["metadatas"])
        category_counts = {}
        for meta in results["metadatas"]:
            cat = meta.get("category", "미분류")
            category_counts[cat] = category_counts.get(cat, 0) + 1
        return {"total": total, "categories": category_counts}
    except Exception as e:
        return {"total": 0, "categories": {}}


# ─────────────────────────────────────────────────
# 대시보드 UI
# ─────────────────────────────────────────────────

def main():
    st.title("🛡️ 스미싱 파이프라인 모니터링")

    con = get_duckdb()

    # ── 섹션 1: 파이프라인 현황 ──────────────────
    st.header("📊 파이프라인 처리 현황")

    counts = get_stage_counts(con)
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Raw", f"{counts['raw']:,}건")
    col2.metric("Labeled", f"{counts['labeled']:,}건")
    col3.metric("Processed", f"{counts['processed']:,}건")
    col4.metric("Reason", f"{counts['reason']:,}건")

    col_left, col_right = st.columns(2)

    # 일별 SMS 처리량
    with col_left:
        daily_df = get_daily_sms(con)
        if daily_df is not None and not daily_df.empty:
            fig = px.line(
                daily_df, x="date", y="count",
                title="일별 SMS 처리량",
                markers=True,
            )
            st.plotly_chart(fig, use_container_width=True)

    # RAG 사용 비율
    with col_right:
        rag_df = get_rag_ratio(con)
        if rag_df is not None and not rag_df.empty:
            fig = px.pie(
                rag_df, values="count", names="reasoning_method",
                title="RAG 사용 비율",
                color_discrete_map={
                    "llm_with_rag": "#6366f1",
                    "llm_only": "#94a3b8",
                    "skipped_blacklist": "#ef4444",
                },
            )
            st.plotly_chart(fig, use_container_width=True)

    # 위험등급 분포
    risk_df = get_risk_distribution(con)
    if risk_df is not None and not risk_df.empty:
        fig = px.bar(
            risk_df, x="risk_level", y="count",
            title="위험등급 분포",
            color="risk_level",
            color_discrete_map={
                "위험 높음": "#ef4444",
                "주의": "#f97316",
                "정상 가능성 높음": "#22c55e",
            },
        )
        st.plotly_chart(fig, use_container_width=True)

    st.divider()

    # ── 섹션 2: VectorDB 현황 ────────────────────
    st.header("🧠 VectorDB (ChromaDB) 현황")

    chroma = get_chroma_info()
    st.metric("총 적재 사례 수", f"{chroma['total']:,}건")

    if chroma["categories"]:
        cat_df = {"category": list(chroma["categories"].keys()),
                  "count": list(chroma["categories"].values())}
        fig = px.bar(
            cat_df, x="category", y="count",
            title="카테고리별 스미싱 사례 분포",
            color="category",
        )
        st.plotly_chart(fig, use_container_width=True)

    st.divider()

    # ── 섹션 3: VT 조회 현황 ─────────────────────
    st.header("🔍 VirusTotal 조회 현황")

    vt = get_vt_summary(con)
    col1, col2, col3, col4, col5 = st.columns(5)
    col1.metric("총 조회", f"{vt['total']:,}건")
    col2.metric("매우 위험", f"{vt['매우 위험']:,}건")
    col3.metric("위험", f"{vt['위험']:,}건")
    col4.metric("의심", f"{vt['의심']:,}건")
    col5.metric("정상", f"{vt['정상']:,}건")

    col_left, col_right = st.columns(2)

    with col_left:
        if vt["total"] > 0:
            vt_data = {k: v for k, v in vt.items() if k != "total"}
            fig = px.pie(
                values=list(vt_data.values()),
                names=list(vt_data.keys()),
                title="VT 위험등급 분포",
                color_discrete_map={
                    "매우 위험": "#ef4444",
                    "위험": "#f97316",
                    "의심": "#eab308",
                    "정상": "#22c55e",
                },
            )
            st.plotly_chart(fig, use_container_width=True)

    with col_right:
        score_df = get_vt_score_hist(con)
        if score_df is not None and not score_df.empty:
            fig = px.histogram(
                score_df, x="malicious_count",
                title="악성 탐지 엔진 수 분포",
                nbins=20,
                color_discrete_sequence=["#f97316"],
            )
            fig.update_layout(xaxis_title="악성 탐지 엔진 수", yaxis_title="건수")
            st.plotly_chart(fig, use_container_width=True)

    st.divider()

    # ── 섹션 4: 로그 요약 ────────────────────────
    st.header("📋 로그 요약")

    error_count, recent_errors = get_log_summary(con)
    st.metric("총 오류 건수", f"{error_count:,}건")

    if recent_errors is not None and not recent_errors.empty:
        st.subheader("최근 오류 목록")
        st.dataframe(recent_errors, use_container_width=True)
    else:
        st.success("최근 오류 없음 ✅")

    st.divider()

    # ── 섹션 5: MySQL 현황 ───────────────────────
    st.header("🗄️ MySQL 현황")

    col1, col2 = st.columns(2)

    with col1:
        # blacklist
        blacklist = mysql_query("""
            SELECT pattern_type, COUNT(*) as count
            FROM blacklist WHERE is_active = TRUE
            GROUP BY pattern_type
        """)
        if blacklist:
            total_bl = sum(r["count"] for r in blacklist)
            st.metric("총 블랙리스트", f"{total_bl:,}건")
            for row in blacklist:
                st.write(f"- {row['pattern_type']}: {row['count']:,}건")

        # vt_quota
        quota = mysql_query("""
            SELECT auto_used, manual_used FROM vt_quota WHERE date = CURDATE()
        """)
        if quota:
            st.subheader("VT 오늘 사용량")
            st.metric("자동", f"{quota[0]['auto_used']} / 400회")
            st.metric("수동", f"{quota[0]['manual_used']} / 100회")

        # Cleanlab 의심 라벨
        audit = mysql_query("""
            SELECT status, COUNT(*) as count
            FROM label_audit GROUP BY status
        """)
        if audit:
            st.subheader("Cleanlab 의심 라벨 현황")
            for row in audit:
                st.write(f"- {row['status']}: {row['count']:,}건")

    with col2:
        # processing_log 단계별
        stages = mysql_query("""
            SELECT current_stage, COUNT(*) as count
            FROM processing_log GROUP BY current_stage
        """)
        if stages:
            st.subheader("Processing Log 현황")
            for row in stages:
                st.write(f"- {row['current_stage']}: {row['count']:,}건")

        # 위험등급별
        risk = mysql_query("""
            SELECT risk_level, COUNT(*) as count
            FROM processing_log WHERE risk_level IS NOT NULL
            GROUP BY risk_level
        """)
        if risk:
            st.subheader("위험등급별 현황")
            for row in risk:
                st.write(f"- {row['risk_level']}: {row['count']:,}건")

    st.divider()
    if st.button("🔄 새로고침"):
        st.cache_resource.clear()
        st.rerun()


if __name__ == "__main__":
    main()