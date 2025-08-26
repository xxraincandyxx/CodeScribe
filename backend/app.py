# app.py

from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO

from pathlib import Path
import warnings
import os

from events import setup_socketio_event_handlers


FRONTEND_DIST_DIR = Path(__file__).parent.absolute() / ".." / "frontend" / "dist"
FRONTEND_DIST_HTML = FRONTEND_DIST_DIR / "index.html"
DEFAULT_HOST = "0.0.0.0"
DEFAULT_PORT = "5172"
CORS_ALLOWED_ORIGINS = "http://localhost:5173"


if not (os.path.isdir(FRONTEND_DIST_DIR) and os.path.isfile(FRONTEND_DIST_HTML)):
  warnings.warn(f"Neither {FRONTEND_DIST_DIR} nor {FRONTEND_DIST_HTML} doesn't exist, exit.")
  exit()

app = Flask(__name__, static_folder="../frontend/dist", static_url_path="")

# --- CORS Configuration ---
# Allow requests from the React frontend development server.
# In production, you would change this to your frontend's domain.
CORS(app, resources={r"/*": {"origins": CORS_ALLOWED_ORIGINS}})

socketio = SocketIO(app, cors_allowed_origins=CORS_ALLOWED_ORIGINS, async_mode="eventlet")
setup_socketio_event_handlers(socketio=socketio)


@app.route("/")
def index():
  return send_from_directory(app.static_folder, "index.html")


if __name__ == "__main__":
  print("Starting CodeScribe...")
  socketio.run(app, host=DEFAULT_HOST, port=DEFAULT_PORT)
