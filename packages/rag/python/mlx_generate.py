import importlib.util
import json
import sys
import tempfile
import os

if (
    importlib.util.find_spec("mlx") is None
    or importlib.util.find_spec("mlx_lm") is None
):
    raise ImportError("MLX and mlx_lm are required dependencies")

import mlx.core as mx  # noqa: F401
from mlx_lm import generate, load


def validate_input_data(input_data):
    """Validate input data structure and values."""
    if not isinstance(input_data, dict):
        raise ValueError("Input data must be a dictionary")

    if "model" not in input_data or "prompt" not in input_data:
        raise ValueError("Missing required fields: model, prompt")

    # Validate virtual token mode
    virtual_token_mode = input_data.get("virtualTokenMode", "pass-through")
    valid_modes = ["ignore", "decode", "pass-through"]
    if virtual_token_mode not in valid_modes:
        raise ValueError(f"Invalid virtualTokenMode: {virtual_token_mode}. Must be one of {valid_modes}")

    # Validate band C structure
    band_c = input_data.get("bandC", [])
    if not isinstance(band_c, list):
        raise ValueError("bandC must be a list")

    for i, fact in enumerate(band_c):
        if not isinstance(fact, dict):
            raise ValueError(f"bandC[{i}] must be a dictionary")

        required_fields = ["type", "value", "context", "confidence"]
        for field in required_fields:
            if field not in fact:
                raise ValueError(f"Invalid bandC fact structure: missing field '{field}' at index {i}")

        if not isinstance(fact["confidence"], (int, float)) or not (0 <= fact["confidence"] <= 1):
            raise ValueError(f"Confidence must be between 0 and 1 at bandC[{i}]")


def parse_input_data(json_input):
    """Parse and validate JSON input with default values."""
    input_data = json.loads(json_input)

    # Set default values
    defaults = {
        "max_tokens": 2048,
        "temperature": 0.7,
        "top_p": 0.9,
        "bandA": "",
        "bandB": [],
        "bandC": [],
        "virtualTokenMode": "pass-through",
        "enableStructuredOutput": False
    }

    # Merge defaults with input
    for key, default_value in defaults.items():
        if key not in input_data:
            input_data[key] = default_value

    # Validate the input data
    validate_input_data(input_data)

    return input_data


def format_output(text=None, band_usage=None, virtual_token_mode=None, structured_facts_processed=None, error=None):
    """Format output data as JSON."""
    result = {}

    if error:
        result["error"] = error
    else:
        result["text"] = text or ""

        # Default band usage if not provided
        if band_usage is None:
            band_usage = {"bandAChars": 0, "bandBVirtualTokens": 0, "bandCFacts": 0}

        result["bandUsage"] = band_usage
        result["virtualTokenMode"] = virtual_token_mode or "pass-through"
        result["structuredFactsProcessed"] = bool(structured_facts_processed)

    return json.dumps(result)


def main():
    try:
        input_data = json.loads(sys.stdin.read())
        model_path = input_data["model"]
        prompt = input_data["prompt"]
        max_tokens = input_data.get("max_tokens", 2048)
        temperature = input_data.get("temperature", 0.7)
        top_p = input_data.get("top_p", 0.9)

        # REF‑RAG tri-band context support
        band_a = input_data.get("bandA", "")
        band_b = input_data.get("bandB", [])
        band_c = input_data.get("bandC", [])
        virtual_token_mode = input_data.get("virtualTokenMode", "pass-through")
        enable_structured_output = input_data.get("enableStructuredOutput", False)

        # Build enhanced prompt with tri-band context
        enhanced_prompt = build_enhanced_prompt(
            prompt, band_a, band_b, band_c, virtual_token_mode
        )

        # Load model and tokenizer
        model, tokenizer = load(model_path)

        # Handle virtual tokens if provided
        if band_b and virtual_token_mode == "pass-through":
            # For MLX, we can incorporate virtual tokens as additional context
            virtual_context = process_virtual_tokens(band_b, model, tokenizer)
            enhanced_prompt += f"\n\nAdditional Context: {virtual_context}"

        # Generate response
        response = generate(
            model,
            tokenizer,
            prompt=enhanced_prompt,
            temp=temperature,
            top_p=top_p,
            max_tokens=max_tokens,
        )
        generated_text = response[len(prompt) :].strip()

        # Post-process with structured facts if enabled
        if enable_structured_output and band_c:
            generated_text = post_process_with_facts(generated_text, band_c)

        # Calculate band usage statistics
        band_usage = {
            "bandAChars": len(band_a) if band_a else 0,
            "bandBVirtualTokens": len(band_b) if band_b else 0,
            "bandCFacts": len(band_c) if band_c else 0,
        }

        result = {
            "text": generated_text,
            "bandUsage": band_usage,
            "virtualTokenMode": virtual_token_mode,
            "structuredFactsProcessed": enable_structured_output and len(band_c) > 0,
        }
        print(json.dumps(result))
    except Exception as e:
        result = {"error": str(e)}
        print(json.dumps(result))
        sys.exit(1)


def build_enhanced_prompt(
    query: str,
    band_a: str,
    band_b: list,
    band_c: list,
    virtual_token_mode: str,
) -> str:
    """Build enhanced prompt with tri-band context."""
    prompt = query

    # Add Band A context (full text)
    if band_a:
        prompt += f"\n\nContext:\n{band_a}"

    # Add Band C context (structured facts)
    if band_c:
        prompt += "\n\nKey Facts:\n"
        for fact in band_c:
            fact_type = fact.get("type", "unknown")
            fact_value = fact.get("value", "")
            confidence = fact.get("confidence", 0.0)
            confidence_str = f" (confidence: {int(confidence * 100)}%)" if confidence < 0.8 else ""
            prompt += f"- {fact_type}: {fact_value}{confidence_str}\n"

    # Add instructions based on available context
    if band_a or band_c:
        prompt += "\n\nPlease provide a comprehensive answer based on the provided context. "
        if band_c:
            prompt += "Pay special attention to the numerical facts and structured data provided. "
        prompt += "Cite your sources when appropriate."

    return prompt


def process_virtual_tokens(
    virtual_tokens: list,
    model,
    tokenizer,
) -> str:
    """Process virtual tokens for MLX backend."""
    try:
        # Convert virtual tokens to MLX array
        token_array = mx.array(virtual_tokens)

        # Simple approach: use the first few tokens as a summary
        # In production, this would involve more sophisticated decoding
        summary_size = min(10, len(virtual_tokens))
        summary_tokens = virtual_tokens[:summary_size]

        # Create a text representation of the virtual tokens
        token_summary = f"[Virtual context: {len(virtual_tokens)} compressed tokens]"

        # If we have projection weights, we could decode them here
        # For now, return a summary representation
        return token_summary

    except Exception as e:
        # Fallback to simple representation
        return f"[Virtual context: {len(virtual_tokens)} tokens (processing failed: {str(e)})]"


def post_process_with_facts(generated_text: str, band_c: list) -> str:
    """Post-process generated text to ensure structured facts are included."""
    if not band_c:
        return generated_text

    # Extract numerical facts for verification
    numerical_facts = [fact for fact in band_c if fact.get("type") == "number"]

    if not numerical_facts:
        return generated_text

    # Check if response includes these facts
    response_lower = generated_text.lower()
    missing_facts = []

    for fact in numerical_facts:
        fact_value = str(fact.get("value", ""))
        if fact_value and fact_value not in response_lower:
            missing_facts.append(fact_value)

    if missing_facts:
        # Add a note about missing numerical precision
        note = f"\n\nNote: The following specific numerical data was available: {', '.join(missing_facts)}."
        generated_text += note

    return generated_text


if __name__ == "__main__":
    main()
