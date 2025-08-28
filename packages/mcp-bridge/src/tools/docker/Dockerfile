# syntax=docker/dockerfile:1

FROM python:3.11.6-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.11.6-slim
WORKDIR /app
COPY --from=builder /install /usr/local
COPY mcp_server.py ./
CMD ["python", "mcp_server.py"]
