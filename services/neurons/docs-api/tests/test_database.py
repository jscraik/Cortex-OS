import asyncio
import importlib

import pytest
from sqlalchemy import select


def test_init_db_creates_tables(monkeypatch, tmp_path):
    db_path = tmp_path / "test.db"
    db_url = f"sqlite+aiosqlite:///{db_path}"
    monkeypatch.setenv("DATABASE_URL", db_url)

    from core import config, database

    importlib.reload(config)
    importlib.reload(database)
    import sys
    sys.modules.pop("models", None)
    importlib.import_module("models")
    from models import Example

    async def run():
        await database.init_db()
        async with database.AsyncSessionLocal() as session:
            result = await session.execute(select(Example))
            assert result.all() == []

    asyncio.run(run())


def test_get_db_rollback_on_error(monkeypatch, tmp_path):
    db_path = tmp_path / "test.db"
    db_url = f"sqlite+aiosqlite:///{db_path}"
    monkeypatch.setenv("DATABASE_URL", db_url)

    from core import config, database

    importlib.reload(config)
    importlib.reload(database)
    import sys
    sys.modules.pop("models", None)
    importlib.import_module("models")
    from models import Example

    async def run():
        await database.init_db()

        async with database.AsyncSessionLocal() as session:
            session.add(Example(name="existing"))
            await session.commit()

        async def failing_session():
            async for session in database.get_db():
                session.add(Example(name="test"))
                raise RuntimeError("boom")

        with pytest.raises(RuntimeError):
            await failing_session()

        async with database.AsyncSessionLocal() as session:
            result = await session.execute(select(Example))
            assert len(result.all()) == 1

    asyncio.run(run())

