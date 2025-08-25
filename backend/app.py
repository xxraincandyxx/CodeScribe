"""
Main Flask application for the CodeScribe backend.

This module sets up a Flask-SocketIO server to handle real-time communication
for the project extraction process. It is designed to be a pure backend API,
handling requests from a separate frontend application.
"""

import os
from flask import Flask, request
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from core.extractor import ProjectExtractor

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
socketio = SocketIO(app, cors_allowed_origins=CORS_ALLOWED_ORIGINS)


# ================================ #
# --- Socket.IO Event Handlers --- #
# ================================ #


@socketio.on("connect")
def handle_connect():
  """Handles a new client connection."""
  print(f"Client connected: {request.sid}")


@socketio.on("disconnect")
def handle_disconnect():
  """Handles a client disconnection."""
  print(f"Client disconnected: {request.sid}")


@socketio.on("start_extraction")
def handle_extraction_request(data: dict):
  """
  Handles a request from a client to start the project extraction process.

  Args:
      data: A dictionary containing the extraction parameters from the client,
            including 'path', 'ignores', 'includes', 'max_size', etc.
  """
  sid = request.sid
  project_path = data.get("path", "")
  print(f"[{sid}] Received extraction request for path: '{project_path}'")

  try:
    # Validate input: either project_path or external_files must be present.
    if not project_path and not data.get("external_files"):
      emit(
        "extraction_complete",
        {"error": "Provide a project directory or at least one external file."},
      )
      return

    # Validate directory path if provided.
    if project_path and not os.path.isdir(project_path):
      emit(
        "extraction_complete",
        {"error": f"Invalid directory path: '{project_path}'."},
      )
      return

    emit("update_status", {"message": "Initializing extractor..."})

    # Instantiate the extractor with parameters from the client.
    extractor = ProjectExtractor(
      root_path=project_path,
      ignore_patterns_str=data.get("ignores", ""),
      include_only_paths_str=data.get("includes", ""),
      max_file_size_kb=int(data.get("max_size", 1024)),
      ignore_comments=bool(data.get("ignore_comments", False)),
      external_files_data=data.get("external_files", []),
    )

    emit("update_status", {"message": "Scanning project and generating markdown..."})
    markdown_output = extractor.extract()
    print(f"[{sid}] Extraction successful. Sending markdown to client.")
    emit("extraction_complete", {"markdown": markdown_output})

  except Exception as e:
    print(f"[{sid}] An error occurred during extraction: {e}")
    emit("extraction_complete", {"error": f"An unexpected error occurred: {str(e)}"})


# --- Main Execution ---
if __name__ == "__main__":
  print("Starting CodeScribe Flask-SocketIO backend...")
  # Note: `debug=True` is for development. Use a production WSGI server
  # like Gunicorn or uWSGI for deployment.
  socketio.run(app, host=DEFAULT_HOST, port=DEFAULT_PORT, debug=True, allow_unsafe_werkzeug=True)
