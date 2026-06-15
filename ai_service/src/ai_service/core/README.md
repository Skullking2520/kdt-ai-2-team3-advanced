# 프로젝트에 사용한 랭그래프 핵심 정리

# graph.py의 흐름 시각화

```mermaid
graph TD
    %% 스타일 정의
    classDef entry fill:#4D96FF,stroke:#333,stroke-width:2px,color:#fff;
    classDef node fill:#ECEFF1,stroke:#607D8B,stroke-width:2px,color:#000;
    classDef edgeNode fill:#FFF59D,stroke:#FBC02D,stroke-width:2px,color:#000;
    classDef endNode fill:#FF6B6B,stroke:#333,stroke-width:2px,color:#fff;

    %% 인풋 데이터 정의 및 진입
    START([FastAPI 요청 수신<br>본문 텍스트 + OCR 추출 텍스트]):::entry -->|state_init: State 주입| RouterNode[router_node<br>제로데이 패턴 여부 분류]:::node

    %% 조건부 분기 (Router)
    RouterNode --> CondEdge{route_after_router<br>조건부 분기 결정}:::edgeNode

    %% 갈림길 1: 제로데이인 경우 (RAG)
    CondEdge -->|ZERODAY_SMISHING_PATTERN| RagNode[naive_rag_node<br>tools.py 연동<br>VectorDB문서 검색 및 RAG 추론]:::node
    RagNode -->|JSON 문자열 바인딩| END_NODE([END<br>FastAPI 결과 리턴]):::endNode

    %% 갈림길 2: 일반 명백한 스미싱인 경우 (Few-shot)
    CondEdge -->|GENERAL_SMISHING_REASON| SimpleNode[simple_reason_node<br>Few-shot 프롬프트 기반<br>고속 사유 추출]:::node
    SimpleNode -->|JSON 문자열 바인딩| END_NODE:::endNode
```

## 테스트 메모

- 로컬 로직 테스트에서는 `route_override="zero_day"`를 state에 넣어 RAG 경로를 강제로 검증할 수 있다.
- `naive_rag_node`는 검색 context와 최종 JSON 문자열을 각각 `context`, `final_output`에 저장한다.
- Chroma 검색은 저장 시 사용한 임베딩 모델과 동일하게 `query_embeddings`로 수행한다.
