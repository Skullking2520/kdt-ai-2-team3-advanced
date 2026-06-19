"""MySQL 접속 확인 스크립트."""

import pymysql

CONFIG = {
    "host": "127.0.0.1",
    "port": 3306,
    "user": "smishing_user",
    "password": "dev1234",
    "database": "smishing",
    "charset": "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor,
    "autocommit": True,
    "init_command": "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
}


def main() -> None:
    print("1. MySQL 접속 시도")
    conn = pymysql.connect(**CONFIG)
    print(f"   완료. 서버 버전: {conn.get_server_info()}")

    print("\n2. 테이블 목록")
    with conn.cursor() as cur:
        cur.execute("SHOW TABLES")
        for row in cur.fetchall():
            (table_name,) = row.values()
            print(f"   - {table_name}")

    print("\n3. blacklist 샘플 조회 (ID만)")
    with conn.cursor() as cur:
        cur.execute("SELECT id, pattern_type FROM blacklist")
        for row in cur.fetchall():
            print(f"   id={row['id']} | type={row['pattern_type']}")

    print("\n4. INSERT 테스트")
    with conn.cursor() as cur:
        cur.execute(
            "INSERT IGNORE INTO blacklist "
            "(pattern_type, pattern_value, pattern_hash, category, source, severity) "
            "VALUES (%s, %s, SHA2(%s, 256), %s, %s, %s)",
            ("url", "http://python-test.com", "http://python-test.com",
             "테스트", "python_test", "low"),
        )
        print(f"   추가된 행 수: {cur.rowcount}")

    print("\n5. 다시 조회")
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) AS cnt FROM blacklist")
        result = cur.fetchone()
        print(f"   현재 blacklist 총 건수: {result['cnt']}")

    conn.close()
    print("\n[OK] MySQL 연결 확인 완료.")


if __name__ == "__main__":
    main()