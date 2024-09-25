import os
import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DB_URL")
print(DATABASE_URL)


@contextmanager
def get_db_connection():
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


def apply_migrations():
    migration_files = ["./create_users_table.sql", "./create_conversations_table.sql"]

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            for migration_file in migration_files:
                with open(migration_file, "r") as file:
                    migration_sql = file.read()
                    cursor.execute(migration_sql)


if __name__ == "__main__":
    apply_migrations()
    print("Migrations applied successfully.")
