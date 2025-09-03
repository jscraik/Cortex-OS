import json
import logging
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml


@dataclass
class ConfigSchema:
    type: type
    default: Any
    description: str
    required: bool = False
    enum: list[Any] | None = None
    items: dict[str, Any] | None = None


class ConfigManager:
    def __init__(self, config_dir: str = "config", env_prefix: str = "MCP_"):
        self.config_dir = Path(config_dir)
        self.env_prefix = env_prefix
        self.config_data: dict[str, Any] = {}
        self.config_schemas: dict[str, ConfigSchema] = {}
        self.logger = logging.getLogger(__name__)

        self.config_dir.mkdir(exist_ok=True)
        self._load_config()

    def _load_config(self) -> None:
        config_files = ["config.yaml", "config.yml"]
        for file_name in config_files:
            file_path = self.config_dir / file_name
            if file_path.exists():
                with open(file_path) as f:
                    if file_name.endswith((".yaml", ".yml")):
                        data = yaml.safe_load(f)
                    else:
                        data = json.load(f)
                    self.config_data.update(data)

        for key, value in os.environ.items():
            if key.startswith(self.env_prefix):
                config_key = key[len(self.env_prefix) :].lower()
                self.config_data[config_key] = self._convert_env_value(value)

    def _convert_env_value(self, value: str) -> str | int | float | bool | list[str]:
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            pass
        if value.lower() in ("true", "false"):
            return value.lower() == "true"
        try:
            return int(value)
        except ValueError:
            pass
        try:
            return float(value)
        except ValueError:
            pass
        if "," in value:
            return [item.strip() for item in value.split(",")]
        return value

    def get(self, key: str, default: Any = None) -> Any:
        return self.config_data.get(key, default)

    def set(self, key: str, value: Any) -> None:
        self.config_data[key] = value

    def has(self, key: str) -> bool:
        return key in self.config_data

    def remove(self, key: str) -> None:
        if key in self.config_data:
            del self.config_data[key]

    def register_schema(self, key: str, schema: ConfigSchema) -> None:
        self.config_schemas[key] = schema

    def validate_config(self) -> list[str]:
        errors = []
        for key, schema in self.config_schemas.items():
            if key not in self.config_data:
                if schema.required:
                    errors.append(f"Required configuration key '{key}' is missing")
                continue
            value = self.config_data[key]
            if not isinstance(value, schema.type):
                errors.append(
                    f"Configuration key '{key}' should be of type {schema.type.__name__}"
                )
            if schema.enum is not None and value not in schema.enum:
                errors.append(
                    f"Configuration key '{key}' should be one of {schema.enum}"
                )
        return errors

    def save_config(self, format: str = "yaml") -> None:
        file_name = f"config.{format}"
        file_path = self.config_dir / file_name
        with open(file_path, "w") as f:
            if format == "yaml":
                yaml.dump(self.config_data, f, default_flow_style=False)
            else:
                json.dump(self.config_data, f, indent=2)
        self.logger.info("Saved configuration to %s", file_path)

    def get_all(self) -> dict[str, Any]:
        return self.config_data.copy()

    def reset_to_defaults(self) -> None:
        for key, schema in self.config_schemas.items():
            if hasattr(schema, "default"):
                self.config_data[key] = schema.default

    def merge_config(self, other_config: dict[str, Any]) -> None:
        self.config_data.update(other_config)
