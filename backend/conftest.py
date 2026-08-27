import os

# Guarantee that pytest uses an isolated SQLite test database
os.environ["DATABASE_URL"] = "sqlite:///./test_recoverai.db"
