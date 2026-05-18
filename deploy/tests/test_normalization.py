import unittest

from deploy.app.main import (
    ResponseNormalizationError,
    Settings,
    build_decoder_payload,
    build_encoder_payload,
    clean_text_for_encoder,
    collect_settings_errors,
    normalize_decoder_response,
    normalize_encoder_response,
)


class EncoderNormalizationTest(unittest.TestCase):
    def test_nested_hf_text_classification_response(self) -> None:
        response = [
            [
                {"label": "LABEL_0", "score": 0.09},
                {"label": "LABEL_1", "score": 0.91},
            ]
        ]

        label, confidence, score, risk_level, features = normalize_encoder_response(
            response
        )

        self.assertEqual(label, "phishing")
        self.assertEqual(confidence, 0.91)
        self.assertEqual(score, 91)
        self.assertEqual(risk_level, "위험 높음")
        self.assertEqual(features, [])

    def test_flat_hf_text_classification_response(self) -> None:
        response = [
            {"label": "LABEL_0", "score": 0.92},
            {"label": "LABEL_1", "score": 0.08},
        ]

        label, confidence, score, _risk_level, _features = (
            normalize_encoder_response(response)
        )

        self.assertEqual(label, "normal")
        self.assertEqual(confidence, 0.92)
        self.assertEqual(score, 8)

    def test_prototype_response_with_pred_zero(self) -> None:
        response = {
            "pred": 0,
            "prob_0_normal": 0.88,
            "prob_1_risk": 0.12,
            "features": "- 특이 사항 없음",
        }

        label, confidence, score, _risk_level, features = normalize_encoder_response(
            response
        )

        self.assertEqual(label, "normal")
        self.assertEqual(confidence, 0.88)
        self.assertEqual(score, 12)
        self.assertEqual(features, [])

    def test_prototype_response_with_features_string(self) -> None:
        response = {
            "label_name": "스미싱",
            "prob_1_risk": 0.91,
            "score": 91,
            "risk_level": "위험 높음",
            "features": "- 외부 링크 포함: http://fake.kr/track",
        }

        label, confidence, score, risk_level, features = normalize_encoder_response(
            response
        )

        self.assertEqual(label, "phishing")
        self.assertEqual(confidence, 0.91)
        self.assertEqual(score, 91)
        self.assertEqual(risk_level, "위험 높음")
        self.assertEqual(features, ["외부 링크 포함: http://fake.kr/track"])

    def test_malformed_confidence_raises_normalization_error(self) -> None:
        with self.assertRaises(ResponseNormalizationError):
            normalize_encoder_response({"pred": 1, "confidence": "not-a-number"})


class SettingsValidationTest(unittest.TestCase):
    def test_mock_mode_is_ready_without_hf_values(self) -> None:
        errors = collect_settings_errors(Settings(serving_mode="mock"))

        self.assertEqual(errors, [])

    def test_serverless_mode_requires_token_and_model_ids(self) -> None:
        settings = Settings(
            serving_mode="hf_endpoint",
            hf_serving_type="serverless",
            hf_token="",
            encoder_model_id="",
            decoder_model_id="",
        )

        errors = collect_settings_errors(settings)

        self.assertIn("HF_TOKEN is required", errors)
        self.assertIn("ENCODER_MODEL_ID is required", errors)
        self.assertIn("DECODER_MODEL_ID is required", errors)

    def test_endpoint_mode_allows_encoder_only_by_default(self) -> None:
        settings = Settings(
            serving_mode="hf_endpoint",
            hf_serving_type="endpoint",
            hf_token="test-token",
            encoder_endpoint_url="https://encoder.example",
            decoder_endpoint_url="",
        )

        errors = collect_settings_errors(settings)

        self.assertEqual(errors, [])

    def test_endpoint_mode_requires_decoder_url_when_decoder_is_required(
        self,
    ) -> None:
        settings = Settings(
            serving_mode="hf_endpoint",
            hf_serving_type="endpoint",
            hf_token="",
            decoder_required=True,
            encoder_endpoint_url="",
            decoder_endpoint_url="",
        )

        errors = collect_settings_errors(settings)

        self.assertIn("HF_TOKEN is required", errors)
        self.assertIn("ENCODER_ENDPOINT_URL is required", errors)
        self.assertIn("DECODER_ENDPOINT_URL is required", errors)

    def test_endpoint_chat_completion_decoder_does_not_require_decoder_url(
        self,
    ) -> None:
        settings = Settings(
            serving_mode="hf_endpoint",
            hf_serving_type="endpoint",
            hf_token="test-token",
            encoder_endpoint_url="https://encoder.example",
            decoder_endpoint_url="",
            decoder_api_type="chat_completion",
            decoder_model_id="Qwen/Qwen2.5-7B-Instruct",
        )

        errors = collect_settings_errors(settings)

        self.assertEqual(errors, [])


class RequestPayloadTest(unittest.TestCase):
    def test_encoder_preprocess_matches_training_text_rule(self) -> None:
        text = (
            "[Web발신] 배송 주소 오류로 반송 예정입니다. "
            "http://fake.kr/track"
        )

        cleaned = clean_text_for_encoder(text)

        self.assertEqual(
            cleaned,
            "배송 주소 오류로 반송 예정입니다. <URL>",
        )

    def test_encoder_preprocess_keeps_short_verification_code(self) -> None:
        text = "[Web발신] 인증번호 123456 입니다."

        cleaned = clean_text_for_encoder(text)

        self.assertEqual(cleaned, "인증번호 123456 입니다.")

    def test_encoder_preprocess_masks_long_phone_number(self) -> None:
        text = "연락주세요 010-1234-5678"

        cleaned = clean_text_for_encoder(text)

        self.assertEqual(cleaned, "연락주세요 <PHONE>")

    def test_encoder_text_json_payload(self) -> None:
        settings = Settings(encoder_request_format="text_json")

        payload = build_encoder_payload(settings, "[Web발신] hello")

        self.assertEqual(payload, {"text": "hello"})

    def test_encoder_preprocess_can_be_disabled(self) -> None:
        settings = Settings(
            encoder_request_format="hf_inputs",
            encoder_preprocess_enabled=False,
        )

        payload = build_encoder_payload(settings, "[Web발신] hello")

        self.assertEqual(payload, {"inputs": "[Web발신] hello"})

    def test_decoder_chat_completion_payload(self) -> None:
        settings = Settings(
            decoder_api_type="chat_completion",
            decoder_model_id="Qwen/Qwen2.5-7B-Instruct",
            decoder_max_new_tokens=80,
            decoder_temperature=0.2,
        )

        payload = build_decoder_payload(settings, "explain")

        self.assertEqual(payload["model"], "Qwen/Qwen2.5-7B-Instruct")
        self.assertEqual(payload["messages"][0]["content"], "explain")
        self.assertEqual(payload["max_tokens"], 80)


class DecoderNormalizationTest(unittest.TestCase):
    def test_openai_compatible_chat_completion_response(self) -> None:
        response = {
            "choices": [
                {
                    "message": {
                        "content": "스미싱으로 의심되는 이유입니다.",
                    }
                }
            ]
        }

        reason = normalize_decoder_response(response)

        self.assertEqual(reason, "스미싱으로 의심되는 이유입니다.")


if __name__ == "__main__":
    unittest.main()
