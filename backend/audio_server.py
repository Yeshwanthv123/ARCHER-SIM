from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from gtts import gTTS
import uuid
import os

app = FastAPI()

# ✅ FIX: CORS ENABLED
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # allow frontend
    allow_credentials=True,
    allow_methods=["*"],   # allow POST, OPTIONS
    allow_headers=["*"],
)

AUDIO_DIR = "audio"
os.makedirs(AUDIO_DIR, exist_ok=True)

class AudioRequest(BaseModel):
    text: str

@app.post("/generate-audio")
def generate_audio(req: AudioRequest):
    filename = f"{uuid.uuid4()}.mp3"
    filepath = os.path.join(AUDIO_DIR, filename)

    tts = gTTS(req.text)
    tts.save(filepath)

    # ✅ FIX: return filename only
    return {"file": filename}


@app.get("/play/{file_name}")
def play_audio(file_name: str):
    path = os.path.join(AUDIO_DIR, file_name)
    return FileResponse(path, media_type="audio/mpeg")