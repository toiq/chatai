import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from .config import Config


@contextmanager
def get_db_connection():
    conn = psycopg2.connect(Config.DB_URL, cursor_factory=RealDictCursor)
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()
