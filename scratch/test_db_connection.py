import sys
import os

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.config import settings
from app.core.database import SessionLocal, engine
from sqlalchemy import text, inspect

def test_connectivity():
    print("--- 1. Testing Environment Loading ---")
    db_url = settings.DATABASE_URL
    if "@" in db_url:
        prefix, rest = db_url.split("@", 1)
        scheme_user = prefix.split(":", 2)
        masked_url = f"{scheme_user[0]}:***@{rest}"
    else:
        masked_url = db_url
    print(f"DATABASE_URL Loaded: {masked_url}")

    print("\n--- 2. Testing Engine Connectivity (SELECT 1) ---")
    try:
        db = SessionLocal()
        result = db.execute(text("SELECT 1;")).scalar()
        print(f"SQLAlchemy Query Success: SELECT 1 returned {result}")
        
        print("\n--- 3. Inspecting Database Schema Accessibility ---")
        inspector = inspect(engine)
        table_names = inspector.get_table_names()
        print(f"Existing Database Tables ({len(table_names)}): {', '.join(table_names[:10])}")
        
        db.close()
        print("\n--- 4. All Database Checks PASSED ---")
        return True
    except Exception as e:
        print(f"\nSQLAlchemy Connection FAILED: {type(e).__name__}: {e}")
        return False

if __name__ == "__main__":
    success = test_connectivity()
    if not success:
        sys.exit(1)
