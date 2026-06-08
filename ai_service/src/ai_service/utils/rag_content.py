def _build_user_content(text: str, ocr_text: str | None) -> str:
    """ text, ocr_text로 llm에 요청할 요청 문자열 생성 """
    if not ocr_text:
        return text
    return f"{text}\n\n[OCR 추출 텍스트]\n{ocr_text}"