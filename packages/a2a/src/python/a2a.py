"""
file_path: packages/python-agents/src/bridge/a2a.py
description: Defines the Agent2Agent (A2A) protocol for standardized agent messaging.
maintainer: @jamiescottcraik
last_updated: 2025-08-07
version: 1.0.0
status: active
ai_generated_by: gemini-cli
ai_provenance_hash: N/A
"""

from dataclasses import dataclass, field
from typing import Dict, Any, Optional
from datetime import datetime
import json

@dataclass
class A2AMessage:
    """Standardized message format for agent-to-agent communication."""
    sender_id: str
    receiver_id: str
    action: str
    params: Dict[str, Any] = field(default_factory=dict)
    message_id: str = field(default_factory=lambda: f"a2a-{int(datetime.now().timestamp() * 1000)}")
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_json(self) -> str:
        """Serialize the message to a JSON string."""
        return json.dumps(self.__dict__)

    @staticmethod
    def from_json(json_str: str) -> "A2AMessage":
        """Deserialize a JSON string to an A2AMessage."""
        data = json.loads(json_str)
        return A2AMessage(**data)
