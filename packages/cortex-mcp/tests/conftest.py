from __future__ import annotations

import asyncio

import pytest


def pytest_addoption(parser: pytest.Parser) -> None:
    """
    Register compatibility options for async tests when pytest-asyncio is unavailable.

    This function adds the 'asyncio_mode' ini option to pytest, acting as a compatibility
    shim to allow async test execution in environments where pytest-asyncio is not installed.
    """
    parser.addini("asyncio_mode", "Compatibility shim for pytest-asyncio", default="auto")


def pytest_configure(config: pytest.Config) -> None:
    """Ensure the asyncio marker is always defined."""

    config.addinivalue_line("markers", "asyncio: mark test as async-compatible")


@pytest.hookimpl(tryfirst=True)
def pytest_pyfunc_call(pyfuncitem: pytest.Function) -> bool | None:
    """Execute coroutine tests without requiring pytest-asyncio."""

    if pyfuncitem.config.pluginmanager.hasplugin("asyncio"):
        return None

    test_obj = pyfuncitem.obj
    if asyncio.iscoroutinefunction(test_obj):
        loop = asyncio.new_event_loop()
        try:
            asyncio.set_event_loop(loop)
            fixture_info = getattr(pyfuncitem, '_fixtureinfo', None)
            if fixture_info is not None:
                call_args = {
                    name: pyfuncitem.funcargs[name]
                    for name in fixture_info.argnames
                    if name in pyfuncitem.funcargs
                }
            else:
                call_args = pyfuncitem.funcargs
            loop.run_until_complete(test_obj(**call_args))
        finally:
            loop.run_until_complete(loop.shutdown_asyncgens())
            asyncio.set_event_loop(None)
            loop.close()
        return True

    return None
