from sqlalchemy import inspect, text
from app.core.database import engine, Base
import app.models.user
import app.models.product
import app.models.recovery
import app.models.merchant_autonomy
import app.models.authorization

def run_migrations():
    """
    Ensures all database tables and new M10.15 columns are created/upgraded dynamically.
    Works for both SQLite and PostgreSQL.
    """
    Base.metadata.create_all(bind=engine)
    
    inspector = inspect(engine)
    if inspector.has_table("recovery_events"):
        columns = [c["name"] for c in inspector.get_columns("recovery_events")]
        new_columns = [
            ("server_authorization_id", "VARCHAR(36)"),
            ("execution_provenance_id", "VARCHAR(36)"),
            ("authorization_audit_id", "VARCHAR(255)"),
            ("handoff_audit_id", "VARCHAR(255)"),
            ("operator_actor_id", "VARCHAR(255)"),
            ("idempotency_key", "VARCHAR(255)"),
        ]
        with engine.begin() as conn:
            for col_name, col_type in new_columns:
                if col_name not in columns:
                    print(f"[MIGRATION] Adding column '{col_name}' to 'recovery_events' table...")
                    conn.execute(text(f"ALTER TABLE recovery_events ADD COLUMN {col_name} {col_type}"))

if __name__ == "__main__":
    run_migrations()
