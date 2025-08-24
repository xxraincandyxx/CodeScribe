# CodeScribe Frontend

This is the React frontend for the CodeScribe application, built using Vite for a modern and fast development experience. It features a sleek, responsive UI with a dynamic 3D background powered by Three.js and react-three-fiber.

## Features

-   Component-based architecture with React.
-   Real-time communication with the Flask backend via Socket.IO.
-   Dynamic form for specifying project path, include/ignore patterns, and external files.
-   Save/Load settings to browser's Local Storage.
-   Visually appealing "glassmorphism" UI.
-   Interactive 3D particle background.

## Setup

1.  **Install Node.js:**
    Make sure you have a recent version of Node.js installed (LTS version is recommended).

2.  **Install Dependencies:**
    Navigate to the `frontend` directory and install the required npm packages.

    ```bash
    cd frontend
    npm install
    ```

## Running the Development Server

Once the setup is complete, you can start the Vite development server.

```bash
npm run dev
```

The application will be available at http://localhost:5173. The development server supports Hot Module Replacement (HMR) for a smooth development workflow.
Note: The backend server must be running concurrently for the application to function correctly.
