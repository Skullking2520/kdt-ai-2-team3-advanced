import ast
import json
import re

from typing import Dict, Any

def _response_content_into_str(content: str | list | dict) -> str:
    # 1. 안전하게 str 타입으로 추출합니다.
    if isinstance(content, str):
        return content
    if isinstance(content, dict):
        return json.dumps(content, ensure_ascii=False)
    if isinstance(content, list):
        normalized_items = []
        for item in content:
            if isinstance(item, dict):
                normalized_items.append(json.dumps(item, ensure_ascii=False))
            else:
                normalized_items.append(str(item))
        return " ".join(normalized_items)
    return str(content)

def _remove_think_blocks(text: str) -> str:
    """Qwen 계열 thinking 출력에서 <think>...</think> 블록을 제거한다."""
    if not isinstance(text, str):
        text = str(text)

    # 정상적으로 닫힌 <think>...</think> 제거
    text = re.sub(
        r"<think>.*?</think>",
        "",
        text,
        flags=re.DOTALL | re.IGNORECASE
    )

    # 닫히지 않은 <think> 이후 내용 제거
    text = re.sub(
        r"<think>.*",
        "",
        text,
        flags=re.DOTALL | re.IGNORECASE
    )

    # 혹시 남은 닫는 태그 제거
    text = text.replace("</think>", "")

    return text.strip()


def _escape_unescaped_quotes_in_json_string(text: str) -> str:
    result = []
    in_string = False
    escape = False

    for idx, ch in enumerate(text):
        if in_string:
            if escape:
                result.append(ch)
                escape = False
                continue
            if ch == "\\":
                result.append(ch)
                escape = True
                continue
            if ch == '"':
                remaining = text[idx + 1 :]
                next_non_space = re.search(r"\S", remaining)
                next_char = next_non_space.group(0) if next_non_space else ""
                if next_char not in {",", "}", "]", ":"}:
                    result.append('\\"')
                    continue
                in_string = False
            result.append(ch)
            continue

        if ch == '"':
            in_string = True
        result.append(ch)

    return "".join(result)


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
    # 0. think tag 제거
    content = _remove_think_blocks(content)
    # 1. 텍스트 내에서 중괄호 {} 쌍이 맞는 모든 후보들을 추출합니다.
    # Non-greedy 방식과 Greedy 방식을 모두 커버하기 위해 텍스트 전체와 정규식 결과를 결합합니다.
    candidates = [content]

    # {로 시작해서 }로 끝나는 덩어리들을 찾되, 내부 노이즈를 방지하기 위해 최소 매칭 사용
    # 단, 정규식만으로는 한계가 있으므로 문자열 내부의 모든 중괄호 위치를 기반으로 후보군을 넓힙니다.
    matches = re.findall(r"\{.*?\}", content, flags=re.DOTALL)
    if matches:
        candidates.extend(matches)

    # 추가로 전체 텍스트에서 가장 처음 { 와 가장 마지막 } 범위를 한 번 더 후보에 넣습니다 (중첩 구조 대비)
    start_idx = content.find("{")
    end_idx = content.rfind("}")
    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
        candidates.append(content[start_idx : end_idx + 1])

    # 2. 마지막에 위치한 JSON 응답부터 역순으로 시도합니다.
    # 중복된 후보를 제거하되, 원래 순서(뒤에 있는 것이 먼저 오도록)를 유지합니다.
    seen = set()
    unique_candidates = []
    for c in reversed(candidates):
        if c not in seen:
            seen.add(c)
            unique_candidates.append(c)
    
    for candidate in unique_candidates:
        # 파이썬 스타일 불리언 및 None 변환 (json 표준 value값은 js 참조)
        normalized = re.sub(r"\bTrue\b", "true", candidate)
        normalized = re.sub(r"\bFalse\b", "false", normalized)
        normalized = re.sub(r"\bNone\b", "null", normalized)

        # 파이썬 스타일 작은따옴표 처리 (json에서 key는 오직 큰따옴표만 허용됨)
        normalized = re.sub(r"'(.*?)'", r'"\1"', normalized)
        # JSON 문자열 내부의 비이스케이프된 따옴표들을 이스케이프 처리합니다.
    
        normalized = _escape_unescaped_quotes_in_json_string(normalized)
        
        try:
            parsed = json.loads(normalized)
            
            if isinstance(parsed, dict):
                return json.dumps(parsed, ensure_ascii=False)
            
        except json.JSONDecodeError:
            try:
                parsed = ast.literal_eval(normalized)
                if isinstance(parsed, dict):
                    return json.dumps(parsed, ensure_ascii=False)
            except (ValueError, SyntaxError):
                continue

    return content.strip()

def _try_parse_json(json_str: str) -> Dict[str, Any]:
    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        return {"parsing_error": True}


# 다음 프로젝트에서는 instructor와 LangChain 중 더 가볍고 유지보수하기 좋은 조합으로 
# json 응답을 강제하게끔 해서 유지보수하기 좋게 한다.