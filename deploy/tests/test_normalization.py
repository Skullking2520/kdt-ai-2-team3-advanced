import unittest

from deploy.app.main import (
    ResponseNormalizationError,
    Settings,
    collect_settings_errors,
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

    def test_endpoint_mode_requires_endpoint_urls(self) -> None:
        settings = Settings(
            serving_mode="hf_endpoint",
            hf_serving_type="endpoint",
            encoder_endpoint_url="",
            decoder_endpoint_url="",
        )

        errors = collect_settings_errors(settings)

        self.assertIn("ENCODER_ENDPOINT_URL is required", errors)
        self.assertIn("DECODER_ENDPOINT_URL is required", errors)


if __name__ == "__main__":
    unittest.main()
