"""
Database Setup — SQLModel + SQLite Configuration

This module:
1. Configures the SQLite database engine with a file-based DB in backend/database/
2. Creates the sessionmaker for dependency injection into routes
3. Provides create_db_and_tables() called on app startup
4. Exposes get_session() as a FastAPI dependency for DB access
5. Uses SQLModel's create_engine which wraps SQLAlchemy under the hood
"""

from sqlmodel import SQLModel, Session, create_engine
import os

# Database file location
DATABASE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "database")
os.makedirs(DATABASE_DIR, exist_ok=True)
DATABASE_URL = f"sqlite:///{os.path.join(DATABASE_DIR, 'assurex.db')}"

# Create engine — connect_args needed for SQLite to allow multi-thread access
engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)


def create_db_and_tables():
    """Create all tables defined by SQLModel classes. Safe to call multiple times."""
    import src.models  # Ensure models are registered in SQLModel metadata
    SQLModel.metadata.create_all(engine)


def get_session():
    """
    FastAPI dependency that provides a database session.
    Usage in routes: session: Session = Depends(get_session)
    Automatically closes the session when the request is done.
    """
    with Session(engine) as session:
        yield session
