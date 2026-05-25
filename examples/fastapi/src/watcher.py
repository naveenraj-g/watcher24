# watcher.py — Watcher24 client singleton for the FastAPI example.
# Import `client` from this module in routers and background tasks.
# One instance per process — the background flusher thread runs for the
# lifetime of the app and is stopped cleanly in the lifespan shutdown hook.
import os
from watcher_sdk import Client

client = Client(
    api_key=os.environ.get("W24_API_KEY", ""),
    app_id=os.environ.get("W24_APP_ID", "notes-api"),
    gateway_url=os.environ.get("W24_GATEWAY_URL", "http://localhost:8080"),
    environment=os.environ.get("W24_ENVIRONMENT", "development"),
)
