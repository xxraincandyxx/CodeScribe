import os
from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit
from core.extractor import ProjectExtractor

# --- Flask App Initialization ---
app = Flask(__name__)
# In a real production app, you'd use a more secure secret key
app.config["SECRET_KEY"] = "your-very-secret-key!"
socketio = SocketIO(app)


# --- Routes ---
@app.route("/")
def index():
  """Serves the main HTML page."""
  return render_template("index.html")


# --- Socket.IO Event Handlers ---
@socketio.on("connect")
def handle_connect():
  """Handles a new client connection."""
  print("Client connected:", request.sid)


@socketio.on("disconnect")
def handle_disconnect():
  """Handles a client disconnection."""
  print("Client disconnected:", request.sid)


@socketio.on("start_extraction")
def handle_extraction_request(data):
  """Handles the request from the client to start the extraction."""
  project_path = data.get("path")
  ignore_patterns = data.get("ignores")
  ignore_comments = data.get("ignore_comments", False)

  sid = request.sid
  print(f"[{sid}] Received extraction request for path: {project_path}")

  if not project_path or not os.path.isdir(project_path):
    emit("extraction_complete", {"error": f"Invalid directory path: '{project_path}'. Please provide a valid path."})
    return

  try:
    emit("update_status", {"message": "Initializing extractor..."})

    extractor = ProjectExtractor(
      root_path=project_path, ignore_patterns_str=ignore_patterns, ignore_comments=ignore_comments
    )

    emit("update_status", {"message": "Scanning project files and generating markdown..."})

    # This can be a blocking call. For very large projects,
    # you might consider running this in a separate thread or process.
    # For this light tool, a direct call is acceptable.
    markdown_output = extractor.extract()

    print(f"[{sid}] Extraction successful. Sending markdown to client.")
    emit("extraction_complete", {"markdown": markdown_output})

  except Exception as e:
    print(f"[{sid}] An error occurred during extraction: {e}")
    emit("extraction_complete", {"error": f"An unexpected error occurred: {str(e)}"})


# --- Main Entry Point ---
if __name__ == "__main__":
  print("Starting Flask server with Socket.IO...")
  # Using allow_unsafe_werkzeug=True for compatibility with newer Werkzeug versions
  # In production, you'd use a proper WSGI server like Gunicorn or uWSGI.
  socketio.run(app, debug=True, allow_unsafe_werkzeug=True)
