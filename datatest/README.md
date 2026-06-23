## Data Test And Preparation

`datatest/`는 운영 API의 실행 경로가 아니라 데이터 수집·전처리·라벨 품질 점검을
검토하는 영역이다.

- `cleanlab/`: Cleanlab audit 실행 및 `cleaned_dataset.jsonl` 산출물 설명
- `smishing-pipeline-schema.md`: 장기 데이터 플랫폼 설계 참고 문서
- `test-code/`: MySQL, S3, Vector DB 연결을 검증한 실험 코드

현재 Encoder 재학습은 `encoder_retraining/`에서 수행한다. Cleanlab 결과는 S3 또는
로컬 audit 폴더에서 받아 `encoder_retraining/pipeline/prepare_from_cleanlab_audit.py`로
prepared dataset으로 변환한다.
