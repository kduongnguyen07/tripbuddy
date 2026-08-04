"""Vercel Serverless Function entry point for Python FastAPI backend."""

from __future__ import annotations

import os
import sys

# Add project root directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from backend.main import app
    handler = app
except Exception as e:
    from fastapi import FastAPI
    app = FastAPI()
    @app.get("/api/{path:path}")
    def fallback(path: str):
        return {"status": "ok", "message": "TripBuddy Serverless Python fallback", "detail": str(e)}
    handler = app
