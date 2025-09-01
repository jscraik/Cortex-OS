import importlib

import pytest
from sqlalchemy import text


@pytest.mark.asyncio
async def test_init_and_get_db(monkeypatch, tmp_path):
    db_path = tmp_path / "test.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite+aiosqlite:///{db_path}")
    monkeypatch.setenv("DEBUG", "0")

    importlib.reload(importlib.import_module("core.config"))
    database = importlib.reload(importlib.import_module("core.database"))

    await database.init_db()

    db_gen = database.get_db()
    session = await anext(db_gen)
    result = await session.execute(text("SELECT 1"))
    assert result.scalar_one() == 1
    with pytest.raises(StopAsyncIteration):
        await anext(db_gen)

    db_gen_fail = database.get_db()
    await anext(db_gen_fail)
    with pytest.raises(RuntimeError):
        await db_gen_fail.athrow(RuntimeError("boom"))

    await database.close_db()
