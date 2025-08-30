#!/usr/bin/env python3
import os
import sys


def main():
    api_key = os.getenv("AGENTOPS_API_KEY")
    if not api_key:
        print("[agentops] Skipping: AGENTOPS_API_KEY not set")
        return 0
    # Placeholder for AgentOps evals
    print("[agentops] Running agent evaluations...")
    # Implement real calls when library is available
    return 0


if __name__ == "__main__":
    sys.exit(main())
