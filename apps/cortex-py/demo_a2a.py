#!/usr/bin/env python3
"""
Cortex-Py A2A Integration Demonstration

This script demonstrates the A2A (Agent-to-Agent) communication capabilities
of the cortex-py MLX server integration.
"""

import asyncio
import json

from cortex_py.a2a import (
    MLXEventTypes,
    create_a2a_bus,
    create_mlx_embedding_event,
    create_mlx_model_event,
    create_mlx_thermal_event,
)


async def demonstrate_a2a_integration():
    """Demonstrate A2A integration with mock events."""

    print("🚀 Starting Cortex-Py A2A Integration Demonstration")
    print("=" * 60)

    # Create A2A bus
    bus = create_a2a_bus(source="urn:cortex:py:demo")

    # Set up event handlers
    received_events = []

    def thermal_handler(envelope):
        print(
            f"🌡️  Thermal Event: {envelope.data['device_id']} at {envelope.data['temperature']}°C"
        )
        received_events.append(envelope)

    def embedding_handler(envelope):
        print(
            f"🧠 Embedding Event: {envelope.data['text_count']} texts in {envelope.data['processing_time']:.2f}s"
        )
        received_events.append(envelope)

    def model_handler(envelope):
        print(
            f"🤖 Model Event: {envelope.data['model_name']} - {envelope.data['event_type']}"
        )
        received_events.append(envelope)

    # Subscribe to events
    bus.subscribe(MLXEventTypes.THERMAL_WARNING, thermal_handler)
    bus.subscribe(MLXEventTypes.THERMAL_CRITICAL, thermal_handler)
    bus.subscribe(MLXEventTypes.EMBEDDING_COMPLETED, embedding_handler)
    bus.subscribe(MLXEventTypes.EMBEDDING_BATCH_COMPLETED, embedding_handler)
    bus.subscribe(MLXEventTypes.MODEL_LOADED, model_handler)
    bus.subscribe(MLXEventTypes.MODEL_ERROR, model_handler)

    print("📡 Event handlers registered")
    print("")

    # Simulate MLX thermal monitoring
    print("1️⃣  Simulating MLX thermal monitoring...")
    thermal_event = create_mlx_thermal_event(
        device_id="mlx_gpu_0",
        temperature=78.5,
        threshold=80.0,
        status="warning",
        action_taken="reduced_clock_speed",
    )
    await bus.handle_message(thermal_event)

    # Simulate critical thermal event
    critical_thermal = create_mlx_thermal_event(
        device_id="mlx_gpu_0",
        temperature=85.2,
        threshold=80.0,
        status="critical",
        action_taken="emergency_shutdown_initiated",
    )
    await bus.handle_message(critical_thermal)

    print("")

    # Simulate model loading
    print("2️⃣  Simulating MLX model lifecycle...")
    model_loaded = create_mlx_model_event(
        model_id="sentence-transformers-384",
        model_name="sentence-transformers/all-MiniLM-L6-v2",
        event_type="loaded",
        memory_usage=1024 * 1024 * 512,  # 512MB
        load_time=2.3,
    )
    await bus.handle_message(model_loaded)

    model_error = create_mlx_model_event(
        model_id="llama3-8b",
        model_name="meta-llama/Llama-3-8B",
        event_type="error",
        error_message="Insufficient GPU memory",
    )
    await bus.handle_message(model_error)

    print("")

    # Simulate embedding generation
    print("3️⃣  Simulating MLX embedding generation...")
    embedding_single = create_mlx_embedding_event(
        request_id="embed_001",
        text_count=1,
        total_chars=156,
        processing_time=0.15,
        model_used="sentence-transformers/all-MiniLM-L6-v2",
        dimension=384,
        success=True,
    )
    await bus.handle_message(embedding_single)

    embedding_batch = create_mlx_embedding_event(
        request_id="batch_002",
        text_count=25,
        total_chars=4096,
        processing_time=1.87,
        model_used="sentence-transformers/all-MiniLM-L6-v2",
        dimension=384,
        success=True,
    )
    await bus.handle_message(embedding_batch)

    print("")

    # Show health status
    print("4️⃣  A2A Bus Health Status:")
    health = await bus.health_check()
    for key, value in health.items():
        print(f"   {key}: {value}")

    print("")
    print("📊 Summary:")
    print(f"   Total events processed: {len(received_events)}")
    print(f"   Event types: {set(e.type for e in received_events)}")

    # Show example event JSON
    if received_events:
        print("")
        print("📋 Example A2A Event (JSON):")
        print(json.dumps(received_events[0].dict(), indent=2))

    print("")
    print("✅ Cortex-Py A2A Integration Demonstration Complete!")


if __name__ == "__main__":
    asyncio.run(demonstrate_a2a_integration())
