# Load Tests

이 폴더는 Locust 부하 테스트 시나리오와 결과를 관리하는 위치다. 현재 repository에는
실행 가능한 `locustfile.py`가 포함되어 있지 않으므로, README만으로 부하 테스트가
실행되지는 않는다.

시나리오를 추가할 때는 다음을 분리해 측정한다.

- `GET /`: 웹 서버 응답 시간과 가용성
- `POST /api/predict`: 문자 분석 처리량과 오류율
- `POST /api/ocr`: 이미지 크기에 따른 OCR 지연 시간

실서비스를 대상으로 부하 테스트할 때는 외부 모델 비용, VirusTotal 호출 한도,
데이터베이스 부하를 고려해 소규모 smoke test부터 시작한다.
