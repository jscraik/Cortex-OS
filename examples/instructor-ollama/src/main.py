"""Use OpenAI Instructor with gpt-oss via Ollama."""

from pydantic import BaseModel
import instructor
from openai import OpenAI


class User(BaseModel):
    name: str
    age: int
    bio: str | None = None


client = instructor.from_openai(
    OpenAI(base_url="http://localhost:11434/v1", api_key="ollama"),
    mode=instructor.Mode.JSON,
)


user = client.chat.completions.create(
    model="gpt-oss:20b",
    response_model=User,
    messages=[{"role": "user", "content": "Extract: John is 25"}],
)

print(user.model_dump_json(indent=2))
