"""Simple CLI for cortex-mcp-bridge.

Reads JSON lines from stdin and forwards to HTTP endpoint with optional
rate limiting and queue backpressure. Optionally subscribes to an SSE URL and
prints events to stdout.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
import threading
from typing import Any

from .bridge import MCPBridge, RateConfig


def _stdin_reader_thread(loop: asyncio.AbstractEventLoop, bridge: MCPBridge) -> None:
    for line in sys.stdin:
        line = line.rstrip("\n")
        if not line:
            continue
        asyncio.run_coroutine_threadsafe(bridge.enqueue_stdio(line), loop)


async def _run(args: argparse.Namespace) -> None:
    bridge = MCPBridge(
        outbound_url=args.outbound_url,
        rate=RateConfig(
            messages_per_sec=args.rate if args.rate and args.rate > 0 else None,
            max_queue=args.queue_limit if args.queue_limit is not None else None,
        ),
    )

    # Start stdin reader thread
    loop = asyncio.get_running_loop()
    t = threading.Thread(target=_stdin_reader_thread, args=(loop, bridge), daemon=True)
    t.start()

    # Fire forward loop
    forward_task = asyncio.create_task(bridge.forward_loop())

    # Optionally subscribe to SSE and print events
    sse_task = None
    if args.sse_subscribe_url:
        def on_evt(evt: dict[str, Any]) -> None:
            print(json.dumps(evt), flush=True)

        sse_task = asyncio.create_task(bridge.subscribe_sse(args.sse_subscribe_url, on_evt))

    # Run until Ctrl+C
    try:
        await forward_task
    except asyncio.CancelledError:  # pragma: no cover
        pass
    finally:
        if sse_task:
            sse_task.cancel()


def main() -> None:
    parser = argparse.ArgumentParser(description="cortex-mcp-bridge CLI")
    parser.add_argument("--outbound-url", required=True, help="HTTP endpoint to forward JSON lines")
    parser.add_argument("--rate", type=float, default=None, help="Messages per second rate limit")
    parser.add_argument("--queue-limit", type=int, default=100, help="Max queue size for outgoing messages")
    parser.add_argument("--drop-strategy", choices=["drop_newest", "drop_oldest", "block"], default="drop_newest")
    parser.add_argument("--sse-subscribe-url", default=None, help="Optional SSE URL to subscribe; prints events to stdout")

    args = parser.parse_args()

    try:
        asyncio.run(_run(args))
    except KeyboardInterrupt:  # pragma: no cover
        pass


if __name__ == "__main__":  # pragma: no cover
    main()

