import asyncio
import importlib
import importlib.util
import json
import logging
import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .base import BasePlugin


@dataclass
class PluginManifest:
    name: str
    version: str
    description: str
    author: str
    dependencies: list[str]
    entry_point: str
    config_schema: dict[str, Any]


class PluginHotReloader:
    def __init__(self, plugin_dir: str = "plugins", auto_reload: bool = True):
        self.plugin_dir = Path(plugin_dir)
        self.auto_reload = auto_reload
        self.plugins: dict[str, BasePlugin] = {}
        self.manifests: dict[str, PluginManifest] = {}
        self.plugin_classes: dict[str, type] = {}
        self.logger = logging.getLogger(__name__)
        self.last_reload_times: dict[str, float] = {}
        self.reload_cooldown = 5  # seconds

        if auto_reload:
            self._setup_file_watcher()

    def _setup_file_watcher(self) -> None:
        """Setup file watcher for hot-reloading."""
        try:
            events = importlib.import_module("watchdog.events")
            observers = importlib.import_module("watchdog.observers")
            FileSystemEventHandler = getattr(events, "FileSystemEventHandler")
            Observer = getattr(observers, "Observer")
        except Exception as e:  # pragma: no cover - optional dependency
            self.logger.warning(
                "watchdog not available, disabling auto-reload: %s", e
            )
            self.auto_reload = False
            return

        class PluginFileHandler(FileSystemEventHandler):
            def __init__(self, reloader: "PluginHotReloader"):
                self.reloader = reloader

            def on_modified(self, event: Any) -> None:
                if event.src_path.endswith(".py"):
                    plugin_name = Path(event.src_path).stem
                    self.reloader.schedule_reload(plugin_name)

        observer = Observer()
        observer.schedule(PluginFileHandler(self), str(self.plugin_dir), recursive=True)
        observer.start()
        # Store observer dynamically to avoid strict typing on optional dep
        self.observer = observer

    def schedule_reload(self, plugin_name: str) -> None:
        """Schedule a plugin reload with cooldown."""
        current_time = time.time()
        last_reload = self.last_reload_times.get(plugin_name, 0)

        if current_time - last_reload > self.reload_cooldown:
            asyncio.create_task(self.reload_plugin(plugin_name))
            self.last_reload_times[plugin_name] = current_time
        else:
            self.logger.info("Skipping reload for %s - cooldown active", plugin_name)

    async def initialize(self) -> None:
        """Initialize the plugin hot-reloader."""
        self.logger.info("Initializing Plugin Hot-Reloader")

        # Load all plugins
        for plugin_file in self.plugin_dir.glob("*.py"):
            if plugin_file.name.startswith("__"):
                continue

            try:
                await self.load_plugin(str(plugin_file))
            except Exception as exc:  # noqa: BLE001
                self.logger.error("Failed to load plugin %s: %s", plugin_file, exc)

        self.logger.info("Loaded %d plugins", len(self.plugins))

    async def start(self) -> None:
        """Start the hot-reloader."""
        if self.auto_reload:
            self.logger.info("Plugin hot-reloader started")

    async def stop(self) -> None:
        """Stop the hot-reloader."""
        observer = getattr(self, "observer", None)
        if observer and getattr(observer, "is_alive", lambda: False)():
            observer.stop()
            observer.join()
        self.logger.info("Plugin hot-reloader stopped")

    async def load_plugin(self, plugin_path: str) -> str:
        """Load a plugin from path with dependency resolution."""
        try:
            # Load manifest
            manifest = self._load_manifest(plugin_path)
            self.manifests[manifest.name] = manifest

            # Load module
            spec = importlib.util.spec_from_file_location(manifest.name, plugin_path)
            if spec is None or spec.loader is None:
                raise ImportError(
                    f"Cannot load spec for {manifest.name} from {plugin_path}"
                )
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)

            # Initialize plugin
            plugin_class = getattr(module, manifest.entry_point)
            self.plugin_classes[manifest.name] = plugin_class

            plugin = plugin_class(config=self._get_plugin_config(manifest.name))
            await plugin.initialize()

            self.plugins[manifest.name] = plugin
            self.logger.info("Loaded plugin: %s", manifest.name)

            return manifest.name

        except Exception as exc:  # noqa: BLE001
            self.logger.error("Failed to load plugin %s: %s", plugin_path, exc)
            raise

    async def reload_plugin(self, plugin_name: str) -> None:
        """Reload a plugin."""
        if plugin_name not in self.plugins:
            self.logger.warning("Plugin %s not found for reloading", plugin_name)
            return

        try:
            plugin_file = self._find_plugin_file(plugin_name)
            if not plugin_file:
                self.logger.error("Could not find plugin file for %s", plugin_name)
                return

            await self.plugins[plugin_name].cleanup()
            del self.plugins[plugin_name]

            spec = importlib.util.spec_from_file_location(plugin_name, plugin_file)
            if spec is None or spec.loader is None:
                raise ImportError(
                    f"Cannot load spec for {plugin_name} from {plugin_file}"
                )
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)

            plugin_class = getattr(module, self.manifests[plugin_name].entry_point)
            self.plugin_classes[plugin_name] = plugin_class

            plugin = plugin_class(config=self._get_plugin_config(plugin_name))
            await plugin.initialize()

            self.plugins[plugin_name] = plugin
            self.logger.info("Reloaded plugin: %s", plugin_name)

        except Exception as exc:  # noqa: BLE001
            self.logger.error("Failed to reload plugin %s: %s", plugin_name, exc)
            if plugin_name in self.plugin_classes:
                try:
                    plugin = self.plugin_classes[plugin_name](
                        config=self._get_plugin_config(plugin_name)
                    )
                    await plugin.initialize()
                    self.plugins[plugin_name] = plugin
                    self.logger.info("Restored plugin: %s", plugin_name)
                except Exception as restore_exc:  # noqa: BLE001
                    self.logger.error(
                        "Failed to restore plugin %s: %s", plugin_name, restore_exc
                    )

    def _find_plugin_file(self, plugin_name: str) -> str | None:
        """Find the plugin file for a given plugin name."""
        for root, _, files in os.walk(self.plugin_dir):
            for file in files:
                if file.endswith(".py") and file == f"{plugin_name}.py":
                    return os.path.join(root, file)
        return None

    def _load_manifest(self, plugin_path: str) -> PluginManifest:
        """Load plugin manifest from file."""
        manifest_path = Path(plugin_path).with_name("manifest.json")
        if not manifest_path.exists():
            raise ValueError(f"Manifest not found for plugin: {plugin_path}")

        with open(manifest_path) as f:
            data = json.load(f)

        return PluginManifest(**data)

    def _get_plugin_config(self, _plugin_name: str) -> dict[str, Any]:
        """Get configuration for a plugin."""
        return {}

    def get_plugin(self, plugin_name: str) -> BasePlugin:
        """Get a loaded plugin."""
        if plugin_name not in self.plugins:
            raise ValueError(f"Plugin {plugin_name} not loaded")
        return self.plugins[plugin_name]

    def list_plugins(self) -> list[str]:
        """List all loaded plugins."""
        return list(self.plugins.keys())

    async def unload_plugin(self, plugin_name: str) -> None:
        """Unload a plugin."""
        if plugin_name in self.plugins:
            await self.plugins[plugin_name].cleanup()
            del self.plugins[plugin_name]
            self.logger.info("Unloaded plugin: %s", plugin_name)
