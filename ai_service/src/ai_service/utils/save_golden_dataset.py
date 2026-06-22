import json

def load_jsonl(path: str) -> list[dict]:
    dataset = []

    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                dataset.append(json.loads(line))

    return dataset


def safe_model_name(model_name: str) -> str:
    safe_name = model_name.replace(":", "_")
    safe_name = safe_name.replace(".", "_")
    safe_name = safe_name.replace("/", "_")
    safe_name = safe_name.replace("-", "_")
    return safe_name