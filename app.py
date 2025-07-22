import os
from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit
from core.extractor import ProjectExtractor

app = Flask(__name__)
app.config["SECRET_KEY"] = "your-very-secret-key!"
socketio = SocketIO(app)


@app.route("/")
def index():
  return render_template("index.html")


@socketio.on("connect")
def handle_connect():
  print("Client connected:", request.sid)


@socketio.on("disconnect")
def handle_disconnect():
  print("Client disconnected:", request.sid)


@socketio.on('start_extraction')
def handle_extraction_request(data):
    project_path = data.get('path')
    ignore_patterns = data.get('ignores')
    include_paths = data.get('includes', '')
    max_size_kb = data.get('max_size', 1024)
    ignore_comments = data.get('ignore_comments', False)
    
    external_files = data.get('external_files', [])
    
    sid = request.sid
    print(f"[{sid}] Received extraction request for path: {project_path}")
    
    # It's now valid to have an empty project_path if external_files are provided
    if not project_path and not external_files:
         emit('extraction_complete', {'error': 'Please provide a project root directory or at least one external file.'})
         return

    if project_path and not os.path.isdir(project_path):
        emit('extraction_complete', {'error': f"Invalid directory path: '{project_path}'. Please provide a valid path."})
        return

    try:
        emit('update_status', {'message': 'Initializing extractor...'})
        
        extractor = ProjectExtractor(
            root_path=project_path,
            ignore_patterns_str=ignore_patterns,
            include_only_paths_str=include_paths,
            max_file_size_kb=int(max_size_kb),
            ignore_comments=ignore_comments,
            external_files_data=external_files  # NEW
        )
        
        
        emit('update_status', {'message': 'Scanning project files and generating markdown...'})
        markdown_output = extractor.extract()
        print(f"[{sid}] Extraction successful. Sending markdown to client.")
        emit('extraction_complete', {'markdown': markdown_output})

    except Exception as e:
        print(f"[{sid}] An error occurred during extraction: {e}")
        emit('extraction_complete', {'error': f'An unexpected error occurred: {str(e)}'})

if __name__ == "__main__":
  print("Starting Flask server with Socket.IO...")
  socketio.run(app, debug=True, allow_unsafe_werkzeug=True)
