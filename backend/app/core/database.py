from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

engine_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    engine_args["connect_args"] = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    **engine_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def run_auto_migrations():
    """Safely adds missing columns to existing SQLite / PostgreSQL database without data loss."""
    try:
        inspector = inspect(engine)
        if "quotations" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("quotations")]
            with engine.connect() as conn:
                if "sent_at" not in columns:
                    conn.execute(text("ALTER TABLE quotations ADD COLUMN sent_at DATETIME;"))
                if "expires_at" not in columns:
                    conn.execute(text("ALTER TABLE quotations ADD COLUMN expires_at DATETIME;"))
                if "responded_at" not in columns:
                    conn.execute(text("ALTER TABLE quotations ADD COLUMN responded_at DATETIME;"))
                if "customer_response" not in columns:
                    conn.execute(text("ALTER TABLE quotations ADD COLUMN customer_response VARCHAR(50);"))
                if "response_notes" not in columns:
                    conn.execute(text("ALTER TABLE quotations ADD COLUMN response_notes TEXT;"))
                if "public_token" not in columns:
                    conn.execute(text("ALTER TABLE quotations ADD COLUMN public_token VARCHAR(100);"))
                conn.commit()
    except Exception as e:
        print(f"[Warning] Auto-migration check: {e}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
