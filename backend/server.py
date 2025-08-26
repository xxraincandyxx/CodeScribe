# server.py

"""
Main Flask application for the CodeScribe backend.

This module sets up a Flask-SocketIO server to handle real-time communication
for the project extraction process. It is designed to be a pure backend API,
handling requests from a separate frontend application.
"""

from flask import Flask
from flask_socketio import SocketIO
from flask_cors import CORS

from events import setup_socketio_event_handlers

DEFAULT_HOST = "0.0.0.0"
DEFAULT_PORT = "5172"
CORS_ALLOWED_ORIGINS = "http://localhost:5173"

# --- App Initialization ---
app = Flask(__name__)
# In a production environment, use a more secure and persistent secret key.
app.config["SECRET_KEY"] = "code-scribe-secret-key"

# --- CORS Configuration ---
# Allow requests from the React frontend development server.
# In production, you would change this to your frontend's domain.
CORS(app, resources={r"/*": {"origins": CORS_ALLOWED_ORIGINS}})

# --- Socket.IO Initialization ---
socketio = SocketIO(app, cors_allowed_origins=CORS_ALLOWED_ORIGINS, async_mode="eventlet")
setup_socketio_event_handlers(socketio=socketio)


# --- Main Execution ---
if __name__ == "__main__":
  print("Starting CodeScribe Flask-SocketIO backend...")
  # Note: `debug=True` is for development. Use a production WSGI server
  # like Gunicorn or uWSGI for deployment.
  socketio.run(app, host=DEFAULT_HOST, port=DEFAULT_PORT, debug=True, allow_unsafe_werkzeug=True)
