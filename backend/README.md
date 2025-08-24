# CodeScribe Backend

This is the Python, Flask, and Socket.IO backend for the CodeScribe application. It acts as a pure API and WebSocket server, responsible for the core logic of scanning project directories and generating markdown.

## Setup

1.  **Create a Virtual Environment:**
    It's highly recommended to use a virtual environment to manage dependencies.

    ```bash
    python -m venv venv
    ```

2.  **Activate the Environment:**
    *   **macOS/Linux:**
        ```bash
        source venv/bin/activate
        ```
    *   **Windows:**
        ```bash
        .\venv\Scripts\activate
        ```

3.  **Install Dependencies:**
    Install all required Python packages from `requirements.txt`.

    ```bash
    pip install -r requirements.txt
    ```

## Running the Server

Once the setup is complete, you can start the Flask server.

```bash
python app.py
```

The server will start, by default, on http://127.0.0.1:5000. It will listen for WebSocket connections from the frontend application.
