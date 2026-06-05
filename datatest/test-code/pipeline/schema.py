# pipeline/schema.py

def make_blacklist_inference(pattern_type: str) -> dict:
    return {
        "label": 1,
        "label_name": "스미싱",
        "score": 100,
        "risk_level": "위험 높음",
        "prob_1_risk": 1.0,
        "prob_0_normal": 0.0,
        "features": f"blacklist_hit={pattern_type}",
        "model_version": "blacklist",
    }

def make_model_inference(
    score: int,
    features: str = "",
    model_version: str = "mock_v0.0",
) -> dict:
    label = 1 if score >= 70 else 0
    if score >= 70:
        risk_level = "위험 높음"
    elif score >= 40:
        risk_level = "주의"
    else:
        risk_level = "정상 가능성 높음"
    return {
        "label": label,
        "label_name": "스미싱" if label == 1 else "정상",
        "score": score,
        "risk_level": risk_level,
        "prob_1_risk": round(score / 100, 3),
        "prob_0_normal": round(1 - score / 100, 3),
        "features": features,
        "model_version": model_version,
    }