# 백엔드가 ai_service_deploy와 연계하는 방법을 서술한다.

다음 형식의 요청을 백엔드 fastapi상에서 날린다.

다음은 "route_override": "zero_day"인 경우이다. encoder에서 is_smishing=true일경우 "general"로 일반 이유 출력를 출력하는 용도다.

text는 일반 스미싱 문자 메시지 입력한 것, ocr_text는 ocr로 추출한 이미지 (없으면 ""), "route_override"는 강제로 langgraph의 분기 방향을 결정하는 선택적 파라미터다.

```txt
POST https://<modal-app>.modal.run/api/v1/graph/invoke

{
    "text": "[국민건강보험공단] 2026년 건강보험료 과납분 87,600원 환급 대상입니다. 7일 내 신청하지 않으면 소멸됩니다. 신청: http://nhis-refund.net/req",
    "ocr_text": "신청: http://wearebest.co.kr",
    "route_override": "zero_day"
}
```

예상 답변 형식

```json
{
  "final_output": "{\"is_smishing\": true, \"reason\": \"OCR 추출 텍스트의 URL(http://wearebest.co.kr)과 제공된 URL(http://nhis-refund.net/req)가 다릅니다. 이는 사이트가 변경되었음을 시사하며, 실제 공단의 환급 신청 페이지와 다를 가능성이 높습니다.\"}",
  "parsed_output": {
    "is_smishing": true,
    "reason": "OCR 추출 텍스트의 URL(http://wearebest.co.kr)과 제공된 URL(http://nhis-refund.net/req)가 다릅니다. 이는 사이트가 변경되었음을 시사하며, 실제 공단의 환급 신청 페이지와 다를 가능성이 높습니다."
  },
  "context": "[국민건강보험공단] 2026년 건강보험료 과납분 87,600원 환급 대상입니다. 7일 내 신청하지 않으면 소멸됩니다. 신청: http://nhis-refund.net/req\n\ncrawling_foreign\n\n[Web발신] 안녕하세요. OO카드입니다. 해외 결제 500달러가 승인되었습니다. 본인 아닐 경우 즉시 고객센터 080-000-0000으로 연락 바랍니다.",
  "route_override": "zero_day"
}
```

다음은 "route_override": "general"인 경우이다. encoder에서 is_smishing=true일경우 "general"로 일반 이유 출력를 출력하는 용도다.

```txt
POST https://<modal-app>.modal.run/api/v1/graph/invoke

{
    "text": "[국민건강보험공단] 2026년 건강보험료 과납분 87,600원 환급 대상입니다. 7일 내 신청하지 않으면 소멸됩니다. 신청: http://nhis-refund.net/req",
    "ocr_text": "hello your face is booya",
    "route_override": "general"
}
```

예시 응답

```json
{
  "final_output": "{\"is_smishing\": true, \"reason\": \"공식 기관인 국민건강보험공단을 사칭하면서 잘못된 정보와 오류 있는 텍스트를 사용하여 개인 정보를 유도하려고 합니다. 이는 신뢰할 수 없는 링크를 통해 금전적 손실이나 개인 정보 유출의 위험을 초래할 수 있습니다.\"}",
  "parsed_output": {
    "is_smishing": true,
    "reason": "공식 기관인 국민건강보험공단을 사칭하면서 잘못된 정보와 오류 있는 텍스트를 사용하여 개인 정보를 유도하려고 합니다. 이는 신뢰할 수 없는 링크를 통해 금전적 손실이나 개인 정보 유출의 위험을 초래할 수 있습니다."
  },
  "context": null,
  "route_override": "general"
}
```

실제 URL은 backend의 `DECODER_ENDPOINT_URL` 환경변수로만 관리한다. 서버리스이므로
cold start와 timeout 대비 정책을 백엔드에서 적용한다.

내부적으로 vectordb, llm 호출은 스스로 처리하나 딜레이가 있다.
