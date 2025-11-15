#!/usr/bin/env python
"""
Script to start the FastAPI server
Run this script to start the backend server
"""
import uvicorn

if __name__ == "__main__":
    print("🚀 Starting FastAPI backend server...")
    print("📍 Server will be available at: http://127.0.0.1:8001")
    print("📖 API docs will be available at: http://127.0.0.1:8001/docs")
    print("Press Ctrl+C to stop the server")
    print("-" * 50)
    print("⏳ Testing database connection...")
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8001,
        reload=False,  # Disable reload to avoid /docs issues
    )

