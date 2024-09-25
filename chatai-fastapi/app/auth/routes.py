import json
from typing import List, Optional, Union

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from openai import OpenAI
from psycopg2.extras import RealDictCursor

from app.models import Chat
from ..config import Config
from ..schemas import UserCreate, UserOut
from ..database import get_db_connection
from .auth_handler import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)
from .auth_bearer import JWTBearer

router = APIRouter()


@router.post("/register", response_model=UserOut)
def register(user: UserCreate):
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM users WHERE username = %s", (user.username,))
            existing_user = cursor.fetchone()
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already exists",
                )
            hashed_password = get_password_hash(user.password)
            cursor.execute(
                "INSERT INTO users (username, hashed_password) VALUES (%s, %s) RETURNING id, username",
                (user.username, hashed_password),
            )
            new_user = cursor.fetchone()
    return new_user


@router.post("/login")
def login(user: UserCreate):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("SELECT * FROM users WHERE username = %s", (user.username,))
            user_record = cursor.fetchone()
    if not user_record or not verify_password(
        user.password, user_record["hashed_password"]
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )
    access_token = create_access_token(
        data={"id": user_record["id"], "username": user_record["username"]}
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {"id": user_record["id"], "username": user_record["username"]},
    }


@router.get("/protected", dependencies=[Depends(JWTBearer())])
def protected(request: Request):
    return {
        "res": decode_access_token(
            request.headers.get("Authorization", "").split(" ")[1]
        )
    }


def save_chat_to_database(
    user_id: int, role: str, message: str, conversation_id: Union[str, None]
) -> Union[str, None]:
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            if conversation_id:
                cursor.execute(
                    "UPDATE conversations SET messages = messages || %s WHERE id = %s",
                    (
                        json.dumps({"role": role, "content": message}),
                        conversation_id,
                    ),
                )
            else:
                try:
                    cursor.execute(
                        "INSERT INTO conversations (title, user_id, messages) VALUES (%s, %s, %s) RETURNING id",
                        (
                            message,
                            user_id,
                            json.dumps([{"role": role, "content": message}]),
                        ),
                    )
                    conversation_id = cursor.fetchone()["id"]
                except Exception as e:
                    print(e)
            conn.commit()
            return conversation_id


@router.get("/get-chat", dependencies=[Depends(JWTBearer())])
def get_user_chat_history(user_id: int, conversation_id: Optional[str] = None):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                "SELECT messages FROM conversations WHERE user_id = %s AND id = %s",
                (user_id, conversation_id),
            )
            result = cursor.fetchone()
            if result:
                messages = result.get("messages", [])
                return messages
            else:
                return []


def get_openai_generator(user_id: int, conversation_id: str | None):
    chat_history = get_user_chat_history(user_id, conversation_id=conversation_id)
    client = OpenAI(
        api_key=Config.OPENAI_API_KEY, base_url="https://api.zukijourney.com/v1"
    )
    openai_stream = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=chat_history,
        temperature=0.0,
        stream=True,
    )
    assistant_message = ""
    for event in openai_stream:
        if event.choices[0].delta.content is not None:
            assistant_message += event.choices[0].delta.content
            yield f"data: {json.dumps({'message': event.choices[0].delta.content})}\n\n"
    save_chat_to_database(
        user_id, "assistant", assistant_message, conversation_id=conversation_id
    )


@router.get("/get-conversations-list", dependencies=[Depends(JWTBearer())])
def get_conversations_list(request: Request):
    user_id = decode_access_token(
        request.headers.get("Authorization", "").split(" ")[1]
    )["id"]
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                "SELECT id, title FROM conversations WHERE user_id = %s ORDER BY created_at DESC",
                (user_id,),
            )
            result = cursor.fetchall()
            if result is not None:
                return result
            else:
                return []


@router.post("/chat", dependencies=[Depends(JWTBearer())])
def chat(request: Request, chat: Chat):
    user_id = decode_access_token(
        request.headers.get("Authorization", "").split(" ")[1]
    )["id"]
    message = chat.message
    conversation_id = chat.conversation_id
    try:
        new_conversation_id = save_chat_to_database(
            user_id=user_id,
            role="user",
            message=chat.message,
            conversation_id=conversation_id,
        )
        if new_conversation_id:
            conversation_id = new_conversation_id

        return StreamingResponse(
            get_openai_generator(user_id=user_id, conversation_id=conversation_id),
            media_type="text/event-stream",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/get-latest-id", dependencies=[Depends(JWTBearer())])
def get_current_id(request: Request):
    user_id = decode_access_token(
        request.headers.get("Authorization", "").split(" ")[1]
    )["id"]

    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                "SELECT id FROM conversations WHERE user_id = %s ORDER BY created_at DESC",
                (user_id,),
            )
            result = cursor.fetchone()

    return result


@router.post("/verify-token", dependencies=[Depends(JWTBearer())])
def verify_token(request: Request):
    token = request.headers.get("Authorization", "").split(" ")[1]
    try:
        decoded_token = decode_access_token(token)
        return {"valid": True, "decoded_token": decoded_token}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
