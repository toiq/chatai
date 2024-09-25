from fastapi import FastAPI
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from app.auth import routes as auth_routes
from app.config import Config

app = FastAPI()

app.include_router(auth_routes.router, prefix="/auth", tags=["auth"])

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "Welcome to FastAPI ChatApp API"}


if __name__ == "__main__":
    uvicorn.run(app=app, host="0.0.0.0", port=int(Config.PORT or 8000))
