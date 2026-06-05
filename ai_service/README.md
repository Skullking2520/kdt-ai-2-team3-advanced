# AI Service

이 폴더는 모델 학습, 평가, inference 실험 코드를 관리하는 영역이다.

## Structure

```text
ai_service/
├── encoder/               # KcELECTRA Encoder 학습/평가/선택 모델
├── decoder/               # Qwen2.5 1.7b Decoder 모델 정리
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

## Decoder

기본 프로젝트 때 사용한 few-shot smsishing 이유 출력기이다.

자세한 내용은 [decoder/README.md](decoder/README.md)를 참고한다.

## ai_service 폴더

심화 프로젝트 때 사용할 LLM(로컬 ollama, 운영 vllm) + RAG (vectordb + langgraph) 코드를 둔다. 랭그래프는 인코더가 스미싱 판별 시 llm-only의 일반 디코더 역할과 스미싱 모호 판단시 llm-with-rag의 rag pipeline을 구성하는 용도로 사용한다.

폴더 중 data/chroma_db 폴더는 .gitignore에 등록하였습니다.

## Notes

- 대용량 모델 파일과 dataset은 Git에 올리지 않는다.
- 실제 서비스에서 Hugging Face Endpoint를 호출하는 wrapper는 `deploy_wrapper/`에서 관리한다.
- `ai_service/`는 학습, 평가, 실험 이력을 정리하는 모델링 담당 영역으로 둔다.
