export function buildQwen3EmbedScript(
	modelPath: string,
	texts: string[],
	maxTokens: number,
	useGPU: boolean,
): string {
	return `
import json
import sys
import torch
from transformers import AutoTokenizer, AutoModel
import numpy as np
use_gpu = ${useGPU ? "True" : "False"}
device = 'cuda' if use_gpu and torch.cuda.is_available() else 'cpu'

def mean_pooling(model_output, attention_mask):
    token_embeddings = model_output[0]
    input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)

try:
    tokenizer = AutoTokenizer.from_pretrained("${modelPath}")
    model = AutoModel.from_pretrained("${modelPath}")
    model = model.to(device)
    texts = ${JSON.stringify(texts)}
    encoded_input = tokenizer(texts, padding=True, truncation=True, max_length=${maxTokens}, return_tensors='pt')
    encoded_input = {k: v.to(device) for k, v in encoded_input.items()}
    with torch.no_grad():
        model_output = model(**encoded_input)
    embeddings = mean_pooling(model_output, encoded_input['attention_mask'])
    embeddings = torch.nn.functional.normalize(embeddings, p=2, dim=1)
    result = {"embeddings": embeddings.cpu().numpy().tolist(), "model": "${modelPath}", "dimension": embeddings.shape[1]}
    print(json.dumps(result))
except Exception as e:
    print(f"Error: {str(e)}", file=sys.stderr)
    sys.exit(1)
`;
}
