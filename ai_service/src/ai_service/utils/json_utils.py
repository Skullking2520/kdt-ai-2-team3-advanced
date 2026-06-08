import json
import re
from typing import Any

def _try_parse_json(raw: str) -> dict[str, Any] | None:
    """ json 파서 헬퍼 함수, 딕셔너리 체크 포함 """
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return None
    return parsed if isinstance(parsed, dict) else None

def _response_content_into_str(content: str | list | dict) -> str:
    # 1. 안전하게 str 타입으로 추출합니다.
    if isinstance(content, str):
        raw_content = content
    elif isinstance(content, list):
        # 리스트 형태인 경우 텍스트 요소들을 하나로 합칩니다.
        raw_content = " ".join([item if isinstance(item, str) else str(item) for item in content])
    else:
        raw_content = str(content)
    return raw_content


def _normalize_json_output(content: str) -> str:
    """LLM 응답에서 마지막 JSON 객체를 추출해 표준 JSON 문자열로 변환한다."""
    """
    네, 분석 결과는 다음과 같습니다:
    {
    "is_smishing": true,
    "reason": "택배 사칭"
    }
    위 결과를 참고하세요.

    json이 위와 같이 응답이 나오면 추출해야 되고,

    LLM 에러 출력 예시: {"is_smishing": True} (올바르지 않은 JSON 표준)
    이렇게 true가 아닌 파이썬 True가 나오면 json 에러이므로 변경하기
    """
    candidates = [content, *re.findall(r"\{.*?\}", content, flags=re.DOTALL)]
    for candidate in reversed(candidates): 
        # 마지막에 있는 json응답부터 시도해봄.
        normalized = re.sub(r"\bTrue\b", "true", candidate)
        normalized = re.sub(r"\bFalse\b", "false", normalized)
        try:
            parsed = json.loads(normalized)
        except json.JSONDecodeError:
            continue
        if isinstance(parsed, dict):
            return json.dumps(parsed, ensure_ascii=False)
    return content.strip()