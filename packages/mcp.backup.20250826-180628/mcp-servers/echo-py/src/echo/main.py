from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI()

@app.post("/mcp")
async def mcp(req: dict):
    return JSONResponse({"id": req.get("id"), "result": {"ok": True, "echo": req}})
