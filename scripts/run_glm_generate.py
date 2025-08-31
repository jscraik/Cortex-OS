#!/usr/bin/env python3
"""
Download/load `brAInwav/GLM-4.5-mlx-4Bit` using mlx_lm.load and run a short generation.
"""
import sys
from pathlib import Path

try:
    from mlx_lm import load, generate
except Exception as e:
    print('failed importing mlx_lm:', e)
    sys.exit(2)

model_name = 'brAInwav/GLM-4.5-mlx-4Bit'
cache_dir = '/Volumes/ExternalSSD/ai-models/local-models'

print('loading', model_name, '— this may download many GBs and take long')
try:
    model, tokenizer = load(model_name, cache_dir=cache_dir)
except TypeError:
    # older mlx-lm may not accept cache_dir arg
    model, tokenizer = load(model_name)

prompt = 'Write a story about Einstein'
messages = [{"role": "user", "content": prompt}]
try:
    prompt_text = tokenizer.apply_chat_template(messages, add_generation_prompt=True)
except Exception:
    prompt_text = prompt

print('generating...')
text = generate(model, tokenizer, prompt=prompt_text, verbose=False, max_length=200)
print('=== OUTPUT ===')
print(text)
