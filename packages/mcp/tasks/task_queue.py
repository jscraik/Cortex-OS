"""Simple asynchronous task queue."""

import asyncio
from typing import Callable, Any


class TaskQueue:
    def __init__(self):
        self.queue = asyncio.Queue()

    async def add_task(self, coro: Callable[..., Any]) -> None:
        await self.queue.put(coro)

    async def run(self) -> None:
        while True:
            task = await self.queue.get()
            await task()
            self.queue.task_done()
