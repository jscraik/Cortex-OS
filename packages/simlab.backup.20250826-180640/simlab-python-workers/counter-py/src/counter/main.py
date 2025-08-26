from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()
state = {"n": 0, "target": 3}

class StepReq(BaseModel):
    action: str

@app.post("/reset")
def reset():
    global state
    state = {"n": 0, "target": 3}
    return state

@app.post("/step")
def step(req: StepReq):
    global state
    if req.action == "inc": state["n"] += 1
    elif req.action == "dec": state["n"] -= 1
    done = state["n"] == state["target"]
    reward = 1.0 if done else -0.01
    return {"ctx": state, "reward": reward, "done": done}

