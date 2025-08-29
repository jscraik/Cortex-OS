import json
import sys
import torch
from transformers import AutoTokenizer, AutoModel
import os


def rerank_documents():
    try:
        input_data = json.loads(sys.stdin.read())
        query = input_data["query"]
        documents = input_data["documents"]
        model_path = input_data["model_path"]
        max_length = input_data.get("max_length", 512)

        cache_dir = os.getenv("TRANSFORMERS_CACHE", "/tmp/qwen3-reranker-cache")
        os.makedirs(cache_dir, exist_ok=True)

        tokenizer = AutoTokenizer.from_pretrained(
            model_path,
            cache_dir=cache_dir,
            trust_remote_code=True,
        )
        model = AutoModel.from_pretrained(
            model_path,
            cache_dir=cache_dir,
            trust_remote_code=True,
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
        )

        if torch.cuda.is_available():
            model = model.cuda()
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            model = model.to("mps")

        model.eval()

        scores = []
        with torch.no_grad():
            for doc_text in documents:
                inputs = tokenizer(
                    query,
                    doc_text,
                    return_tensors="pt",
                    max_length=max_length,
                    truncation=True,
                    padding=True,
                )

                if torch.cuda.is_available():
                    inputs = {k: v.cuda() for k, v in inputs.items()}
                elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                    inputs = {k: v.to("mps") for k, v in inputs.items()}

                outputs = model(**inputs)

                if hasattr(outputs, "logits"):
                    score = torch.sigmoid(outputs.logits).item()
                elif hasattr(outputs, "last_hidden_state"):
                    cls_embedding = outputs.last_hidden_state[:, 0, :]
                    score = torch.sigmoid(cls_embedding.mean()).item()
                else:
                    score = torch.sigmoid(outputs.last_hidden_state.mean()).item()

                scores.append(float(score))

        result = {"scores": scores}
        print(json.dumps(result))
    except Exception as e:
        error_result = {"error": str(e)}
        print(json.dumps(error_result))
        sys.exit(1)


if __name__ == "__main__":
    rerank_documents()
