"""
AssureX Claim Engine — FastAPI Application Entry Point

This is the main FastAPI application file. It:
1. Creates the FastAPI app instance with metadata for docs
2. Configures CORS to allow the React frontend (dev: localhost:5173)
3. Sets up the database engine and creates tables on startup
4. Registers all API routers under versioned prefixes
5. Provides a /health endpoint for uptime monitoring
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from src.database_setup import create_db_and_tables


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup tasks: create database tables if they don't exist."""
    create_db_and_tables()
    yield


app = FastAPI(
    title="AssureX Claim Engine",
    description="AI-Powered Warranty Claim Validation API",
    version="1.0.0",
    lifespan=lifespan,
)

# --- CORS Configuration ---
# In development, React dev server runs on port 5173
# In production, React build is served from FastAPI's static files
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

# Allow override via environment variable for deployment
extra_origins = os.getenv("CORS_ORIGINS", "")
if extra_origins:
    ALLOWED_ORIGINS.extend(extra_origins.split(","))

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Health Check ---
@app.get("/health", tags=["System"])
async def health_check():
    """
    Returns application health status.
    Used by deployment platforms and monitoring tools to verify the app is running.
    """
    return {
        "status": "healthy",
        "application": "AssureX Claim Engine",
        "version": "1.0.0",
    }


# --- API Info ---
@app.get("/api", tags=["System"])
async def api_info():
    """Returns basic API information and available endpoints."""
    return {
        "application": "AssureX Claim Engine",
        "version": "1.0.0",
        "description": "AI-Powered Warranty Claim Validation API",
        "documentation": "/docs",
        "health": "/health",
    }


# --- Router Registration (will be added as we build each module) ---
# from src.routers import auth, products, warranties, claims, documents, predictions, reviews, admin
# app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
# app.include_router(products.router, prefix="/api/products", tags=["Products"])
# ... etc.


# --- Static Files (production: serve React build) ---
# Uncomment after building the React app for production deployment:
# if os.path.exists("static"):
#     app.mount("/", StaticFiles(directory="static", html=True), name="static")
