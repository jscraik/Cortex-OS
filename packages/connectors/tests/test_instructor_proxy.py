from __future__ import annotations

import asyncio

import pytest
from pydantic import BaseModel

from cortex_connectors.instructor_proxy import InstructorJSONProxy


class SampleResponse(BaseModel):
    message: str


def test_instructor_proxy_validates_response() -> None:
    proxy = InstructorJSONProxy(lambda payload: {"message": payload["message"]})
    result = proxy.invoke({"message": "hello"}, SampleResponse)
    assert result.message == "hello"


def test_instructor_proxy_raises_on_invalid_response() -> None:
    proxy = InstructorJSONProxy(lambda payload: {"wrong": "value"})
    with pytest.raises(ValueError):
        proxy.invoke({"message": "hello"}, SampleResponse)


@pytest.mark.asyncio
async def test_instructor_proxy_async_dispatch() -> None:
    async def dispatcher(payload):
        await asyncio.sleep(0)
        return {"message": payload["message"]}

    proxy = InstructorJSONProxy(dispatcher)
    result = await proxy.ainvoke({"message": "hi"}, SampleResponse)
    assert result.message == "hi"
