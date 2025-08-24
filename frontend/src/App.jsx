import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import styles from './App.module.css';
import Controls from './components/Controls.jsx';
import Results from './components/Results.jsx';
import Background from './components/Background.jsx';

const SOCKET_URL = 'http://localhost:5000';
const SETTINGS_KEY = 'codeScribeSettings_v2';

const defaultIgnorePatterns = `# Version Control
.git/
.svn/
# Dependencies
node_modules/
vendor/
venv/
.venv/
# Build artifacts & Logs
dist/
build/
*.log
*.tmp
# IDE / OS specific
.idea/
.vscode/
__pycache__/
*.pyc
.DS_Store`;

function App() {
  // --- State Management ---
  const [projectPath, setProjectPath] = useState('');
  const [includePaths, setIncludePaths] = useState('');
  const [ignorePatterns, setIgnorePatterns] = useState(defaultIgnorePatterns);
  const [maxFileSize, setMaxFileSize] = useState('1024');
  const [ignoreComments, setIgnoreComments] = useState(false);
  const [externalFiles, setExternalFiles] = useState([]);

  const [markdown, setMarkdown] = useState('');
  const [status, setStatus] = useState({
    message: 'Ready to extract.',
    type: 'info',
  });
  const [isWorking, setIsWorking] = useState(false);

  const socketRef = useRef(null);

  // --- Socket.IO Connection ---
  useEffect(() => {
    socketRef.current = io(SOCKET_URL);
    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Connected to backend!');
      setStatus({ message: 'Connected. Ready to extract.', type: 'info' });
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from backend.');
      setStatus({ message: 'Connection lost. Please refresh.', type: 'error' });
      setIsWorking(false);
    });

    socket.on('update_status', (data) => {
      setStatus({ message: data.message, type: 'info' });
    });

    socket.on('extraction_complete', (data) => {
      if (data.error) {
        setStatus({ message: data.error, type: 'error' });
        setMarkdown('');
      } else {
        setStatus({
          message: 'Extraction complete! Markdown is ready.',
          type: 'success',
        });
        setMarkdown(data.markdown);
      }
      setIsWorking(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // --- Settings Persistence ---
  const saveSettings = useCallback(() => {
    try {
      const settings = {
        projectPath,
        includePaths,
        ignorePatterns,
        maxFileSize,
        ignoreComments,
        externalFiles,
      };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      return { success: true, message: 'Settings saved!' };
    } catch (e) {
      console.error('Failed to save settings:', e);
      return { success: false, message: 'Could not save settings.' };
    }
  }, [
    projectPath,
    includePaths,
    ignorePatterns,
    maxFileSize,
    ignoreComments,
    externalFiles,
  ]);

  const loadSettings = useCallback(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const settings = JSON.parse(saved);
        setProjectPath(settings.projectPath || '');
        setIncludePaths(settings.includePaths || '');
        setIgnorePatterns(settings.ignorePatterns || defaultIgnorePatterns);
        setMaxFileSize(settings.maxFileSize || '1024');
        setIgnoreComments(settings.ignoreComments || false);
        setExternalFiles(settings.externalFiles || []);
        return { success: true, message: 'Settings loaded!' };
      }
      return { success: false, message: 'No saved settings found.' };
    } catch (e) {
      console.error('Failed to load settings:', e);
      return { success: false, message: 'Could not load settings.' };
    }
  }, []);

  // Auto-load settings on initial render
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // --- Core Logic ---
  const handleExtract = () => {
    if (!projectPath.trim() && externalFiles.length === 0) {
      setStatus({
        message: 'Provide a project directory or at least one external file.',
        type: 'warning',
      });
      return;
    }

    setIsWorking(true);
    setMarkdown('');
    setStatus({ message: 'Starting extraction...', type: 'info' });

    socketRef.current.emit('start_extraction', {
      path: projectPath.trim(),
      ignores: ignorePatterns,
      includes: includePaths,
      max_size: parseInt(maxFileSize, 10) || 1024,
      ignore_comments: ignoreComments,
      external_files: externalFiles.filter((f) => f.path.trim()),
    });
  };

  return (
    <>
      <Background />
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>CodeScribe</h1>
          <p>Generate a complete project overview in a single markdown file.</p>
        </header>
        <main className={styles.main}>
          <Controls
            projectPath={projectPath}
            setProjectPath={setProjectPath}
            includePaths={includePaths}
            setIncludePaths={setIncludePaths}
            ignorePatterns={ignorePatterns}
            setIgnorePatterns={setIgnorePatterns}
            maxFileSize={maxFileSize}
            setMaxFileSize={setMaxFileSize}
            ignoreComments={ignoreComments}
            setIgnoreComments={setIgnoreComments}
            externalFiles={externalFiles}
            setExternalFiles={setExternalFiles}
            isWorking={isWorking}
            onExtract={handleExtract}
            onSaveSettings={saveSettings}
            onLoadSettings={loadSettings}
          />
          <Results status={status} isWorking={isWorking} markdown={markdown} />
        </main>
      </div>
    </>
  );
}

export default App;
