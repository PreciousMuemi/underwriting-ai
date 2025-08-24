import os
import sys
from pathlib import Path
from typing import List, Dict

from sqlalchemy import text

# Ensure backend package is importable regardless of how the script is invoked
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app import create_app, db


def list_tables() -> List[str]:
    """Return the list of table names for the current DB engine."""
    engine = db.get_engine()
    with engine.connect() as conn:
        rows = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")).fetchall()
        tables = [r[0] for r in rows]
    return tables


def count_rows(table: str) -> int:
    """Return row count for a table, or -1 if not countable."""
    engine = db.get_engine()
    try:
        with engine.connect() as conn:
            return int(conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar() or 0)
    except Exception:
        return -1


def list_columns(table: str) -> List[Dict[str, str]]:
    """Return column metadata for a table using SQLite PRAGMA."""
    engine = db.get_engine()
    cols: List[Dict[str, str]] = []
    with engine.connect() as conn:
        rows = conn.execute(text(f"PRAGMA table_info({table})")).fetchall()
        for r in rows:
            # PRAGMA table_info columns: cid, name, type, notnull, dflt_value, pk
            cols.append({
                "name": r[1],
                "type": r[2],
                "notnull": bool(r[3]),
                "default": r[4],
                "pk": bool(r[5]),
            })
    return cols


def main() -> None:
    # Build app using env-configured DATABASE_URL
    app = create_app()
    with app.app_context():
        engine = db.get_engine()
        print("=== Database Inspection ===")
        print(f"DATABASE_URL env: {os.getenv('DATABASE_URL')}")
        print(f"SQLAlchemy URL:   {engine.url}")
        print()

        # Ensure tables exist (if app didn't run yet)
        # Note: db.create_all() is already called in create_app(), so we don't run it here.

        tables = list_tables()
        if not tables:
            print("No tables found.")
            return

        print("Tables (row counts):")
        for t in tables:
            n = count_rows(t)
            n_disp = str(n) if n >= 0 else "n/a"
            print(f" - {t}: {n_disp}")

        # Detailed column dump for key tables
        key_tables = ["quotes", "policies"]
        print("\nColumn details (key tables):")
        for kt in key_tables:
            if kt in tables:
                print(f"\n[{kt}] columns:")
                for c in list_columns(kt):
                    nn = " NOT NULL" if c["notnull"] else ""
                    dflt = f" DEFAULT {c['default']}" if c["default"] is not None else ""
                    pk = " PRIMARY KEY" if c["pk"] else ""
                    print(f"  - {c['name']} {c['type']}{nn}{dflt}{pk}")
            else:
                print(f"\n[{kt}] not found")

        print("\nDone.")


if __name__ == "__main__":
    main()
