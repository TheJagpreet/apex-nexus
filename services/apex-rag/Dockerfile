FROM python:3.10-slim

WORKDIR /app

RUN pip install uv

COPY pyproject.toml .
COPY src/ src/

RUN uv pip install --system -e ".[server]"

COPY server.py .

EXPOSE 8000

CMD ["python", "server.py"]
