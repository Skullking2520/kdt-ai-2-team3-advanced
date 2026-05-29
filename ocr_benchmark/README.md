# OCR Benchmark

스미싱 문자 이미지에 적합한 OCR 도구를 선정하기 위한 성능 비교 테스트 모듈입니다.

## 비교 대상

- Tesseract OCR
- CLOVA OCR
- EasyOCR
- PaddleOCR

## 평가 기준

- 전체 텍스트 유사도
- URL 보존 여부
- 전화번호 및 숫자 보존 여부
- 기관명 보존 여부
- 특수문자 보존 여부
- 이미지 1장당 처리 시간

## 폴더 구조

- images/: 테스트용 문자 이미지 저장
- ground_truth.csv: 이미지별 정답 텍스트
- ocr_tesseract.py: Tesseract OCR 테스트 코드
- ocr_clova.py: CLOVA OCR 테스트 코드
- ocr_easyocr.py: EasyOCR 테스트 코드
- ocr_paddleocr.py: PaddleOCR 테스트 코드
- evaluate_ocr.py: OCR 결과 평가 코드
- benchmark_result.csv: 성능 비교 결과 저장
