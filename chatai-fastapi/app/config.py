from dotenv import find_dotenv, dotenv_values
from typing import List
from datetime import timedelta

env_path = find_dotenv()

config = dotenv_values(env_path)


class Config:
    DB_URL: str | None = config["DB_URL"]
    SECRET_KEY: str | None = config["SECRET_KEY"]
    ALGORITHM: str | None = config["ALGORITHM"]
    ACCESS_TOKEN_EXPIRE_MINUTES: str | None = config["ACCESS_TOKEN_EXPIRE_MINUTES"]
    OPENAI_API_KEY: str | None = config["OPENAI_API_KEY"]
    PORT: str | None = config["PORT"]
