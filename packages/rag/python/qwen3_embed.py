import json
import sys
import torch
from transformers import AutoTokenizer, AutoModel
import numpy as np


def mean_pooling(model_output, attention_mask):
    token_embeddings = model_output[0]
    input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)


def main():
    try:
        data = json.loads(sys.stdin.read())
        model_path = data["model_path"]
        texts = data["texts"]
        max_tokens = data.get("max_tokens", 512)

        tokenizer = AutoTokenizer.from_pretrained(model_path)
        model = AutoModel.from_pretrained(model_path)

        encoded_input = tokenizer(texts, padding=True, truncation=True, max_length=max_tokens, return_tensors="pt")

        with torch.no_grad():
            model_output = model(**encoded_input)

        embeddings = mean_pooling(model_output, encoded_input['attention_mask'])
        embeddings = torch.nn.functional.normalize(embeddings, p=2, dim=1)

        result = {
            "embeddings": embeddings.cpu().numpy().tolist(),
            "model": model_path,
            "dimension": embeddings.shape[1],
        }
        print(json.dumps(result))
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
