# AI Service

이 폴더는 모델 학습, 평가, inference 실험 코드를 관리하는 영역이다.

## Structure

```text
ai_service/
├── encoder/               # KcELECTRA Encoder 학습/평가/선택 모델 정리
├── src/ai_service/        # Python package skeleton
├── README.md
└── pyproject.toml
```

## Encoder

현재 서비스에 연결된 Encoder 모델은 `focal_no_oversampling` 실험 결과다.

Hugging Face:

```text
https://huggingface.co/kdt-2-team4-newbiz/kcelectra-smishing-classifier
```

자세한 내용은 [encoder/README.md](encoder/README.md)를 참고한다.

## Notes

- 대용량 모델 파일과 dataset은 Git에 올리지 않는다.
- 실제 서비스에서 Hugging Face Endpoint를 호출하는 wrapper는 `deploy/`에서 관리한다.
- `ai_service/`는 학습, 평가, 실험 이력을 정리하는 모델링 담당 영역으로 둔다.
