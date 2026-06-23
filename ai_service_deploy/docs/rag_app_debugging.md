# Modal RAG 앱 디버깅 메모

> 이 문서는 Modal CLI를 사용한 개발·장애 확인 메모다. 배포 URL과 Secret 값은
> 기록하지 않는다.

1. 개발 모드로 실시간 로그 확인 (modal serve)

프로덕션 환경에 영구 배포(modal deploy)하기 전, 로컬 코드의 변경 사항을 컨테이너에 즉시 반영하고 터미널에서 실시간 출력을 확인하려면 modal serve 명령어를 사용합니다.

```bash
modal serve ai_service_deploy/src/ai_service_deploy/rag_app.py
```

modal deploy는 멈추기 위해 modal app stop 을 해야하지만 serve는 ctrl + c를 누르면 자동으로 app이 사라집니다.

동작 원리: 이 명령을 실행하면 터미널이 열려 있는 동안 컨테이너가 유지되며, FastAPI 진입 단계의 print() 출력 및 사용자가 API 엔드포인트를 호출할 때 발생하는 라우터 로그가 터미널에 실시간으로 스트리밍됩니다. 로컬 소스코드를 수정하면 자동으로 컨테이너에 동기화(Hot-reload)되므로 초기 디버깅에 가장 적합합니다.

2. 이미 배포된 앱의 로그 추적 (modal logs)

modal deploy를 통해 프로덕션 상태로 올라간 애플리케이션의 런타임 에러나 경고를 원격으로 모니터링하고자 할 때는 Modal CLI의 로깅 시스템을 조회합니다.

```bash
# 특정 앱의 로그 실시간 스트리밍 (--follow)
modal logs ai-service-rag --follow
```

특징: 컨테이너 내부에서 FastAPI가 기동되면서 출력한 sys.stdout과 sys.stderr 데이터가 버퍼링 없이 개발자의 호스트 터미널로 실시간 파이프라인 전송됩니다.

3. 컨테이너 내부 대화형 진입 (modal shell)

정적 파일 복사 상태, uv sync를 통한 의존성 패키지 설치 경로, 환경 변수 주입 상태 등을 컨테이너 내부에 직접 들어가서 검증하고 싶다면 modal shell 기능을 활용해야 합니다. 이는 Docker의 docker exec -it [container_id] /bin/bash와 동일한 역할을 수행합니다.

```bash
modal shell ai_service_deploy/src/ai_service_deploy/rag_app.py
```

대화형 셸 내부에서의 디버깅 팁:

위 명령어를 실행하면 rag_image 정의를 기반으로 가상 컨테이너가 즉시 프로비저닝되며, 내부 데비안 OS의 터미널 셸(root@modal:~#)로 진입합니다. 진입 후 아래 명령들을 통해 인프라 상태를 직접 검증할 수 있습니다.

```bash
# 1. 소스코드 복사 상태 및 패스 확인
ls -la /root/ai_service

# 2. 팩토리 함수 내 환경변수와 동일하게 설정 후 임베딩 수동 다운로드 테스트
export HF_HOME="/models_cache"
python3 -c "from langchain_huggingface import HuggingFaceEmbeddings; HuggingFaceEmbeddings(model_name='jhgan/ko-sroberta-multitask', cache_folder='/models_cache')"

# 3. 다운로드된 가중치 파일 볼륨 마운트 상태 확인
ls -lh /models_cache
```
