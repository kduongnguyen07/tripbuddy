"""Vercel Serverless Function entry point for Python FastAPI backend."""

from __future__ import annotations

import os
import sys

# Add project root directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main import app

# Export app for Vercel WSGI/ASGI handler
handler = app
