document.addEventListener('DOMContentLoaded', () => {
  // --- Initialize Socket.IO ---
  const socket = io();

  // --- DOM Element References ---
  const extractBtn = document.getElementById('extract-btn');
  const copyBtn = document.getElementById('copy-btn');
  const projectPathInput = document.getElementById('project-path');
  const ignorePatternsTextarea = document.getElementById('ignore-patterns');
  const ignoreCommentsCheckbox = document.getElementById('ignore-comments');
  const statusBar = document.getElementById('status-bar');
  const statusText = document.getElementById('status-text');
  const spinner = document.getElementById('spinner');
  const outputMarkdown = document.getElementById('output-markdown');
  const includePathsTextarea = document.getElementById('include-paths');
  const maxFileSizeInput = document.getElementById('max-file-size');
  const addExternalFileBtn = document.getElementById('add-external-file-btn');
  const externalFilesList = document.getElementById('external-files-list');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const loadSettingsBtn = document.getElementById('load-settings-btn');
  const settingsStatus = document.getElementById('settings-status');

  const SETTINGS_KEY = 'codeScribeSettings';

  // --- UI State Management ---
  function setUIState(isWorking) {
    extractBtn.disabled = isWorking;
    spinner.style.display = isWorking ? 'block' : 'none';
    if (!isWorking) {
      copyBtn.disabled = outputMarkdown.textContent.trim() === '';
    }
  }

  function updateStatus(message, type = 'info') {
    statusText.textContent = message;
    statusText.className = type; // 'info', 'success', 'error'
  }

  function showSettingsStatus(message, duration = 3000) {
    settingsStatus.textContent = message;
    settingsStatus.style.opacity = '1';
    setTimeout(() => {
      settingsStatus.style.opacity = '0';
    }, duration);
  }

  // --- Feature: External Files ---
  function createExternalFileEntry(path = '', description = '') {
    const entryId = `ext-file-${Date.now()}`;
    const entryDiv = document.createElement('div');
    entryDiv.className = 'external-file-entry';
    entryDiv.id = entryId;

    entryDiv.innerHTML = `
            <div class="external-file-header">
                <label for="${entryId}-path">Absolute File Path</label>
                <button class="remove-file-btn" title="Remove File">×</button>
            </div>
            <input type="text" id="${entryId}-path" class="external-file-path" placeholder="/path/to/your/file" value="${path}">
            <label for="${entryId}-desc">Description</label>
            <textarea class="external-file-desc" id="${entryId}-desc" rows="2" placeholder="e.g., This file contains the main API logic.">${description}</textarea>
        `;

    externalFilesList.appendChild(entryDiv);

    // Add event listener for the new remove button
    entryDiv.querySelector('.remove-file-btn').addEventListener('click', () => {
      entryDiv.remove();
    });
  }

  // --- Feature: Save & Load Settings ---
  function saveSettings() {
    const externalFiles = [];
    document.querySelectorAll('.external-file-entry').forEach((entry) => {
      const path = entry.querySelector('.external-file-path').value.trim();
      const description = entry
        .querySelector('.external-file-desc')
        .value.trim();
      if (path) {
        externalFiles.push({ path, description });
      }
    });

    const settings = {
      projectPath: projectPathInput.value,
      includePaths: includePathsTextarea.value,
      ignorePatterns: ignorePatternsTextarea.value,
      maxFileSize: maxFileSizeInput.value,
      ignoreComments: ignoreCommentsCheckbox.checked,
      externalFiles: externalFiles,
    };

    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      showSettingsStatus('Settings saved successfully!');
    } catch (e) {
      console.error('Failed to save settings:', e);
      showSettingsStatus('Error: Could not save settings.', 'error');
    }
  }

  function loadSettings() {
    try {
      const savedSettings = localStorage.getItem(SETTINGS_KEY);
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);

        projectPathInput.value = settings.projectPath || '';
        includePathsTextarea.value = settings.includePaths || '';
        ignorePatternsTextarea.value = settings.ignorePatterns || ''; // Default values will be loaded below if empty
        maxFileSizeInput.value = settings.maxFileSize || '1024';
        ignoreCommentsCheckbox.checked = settings.ignoreComments || false;

        // Clear and repopulate external files
        externalFilesList.innerHTML = '';
        if (settings.externalFiles && Array.isArray(settings.externalFiles)) {
          settings.externalFiles.forEach((file) => {
            createExternalFileEntry(file.path, file.description);
          });
        }
        showSettingsStatus('Settings loaded.');
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
      showSettingsStatus('Error: Could not load settings.', 'error');
    }

    // Set default ignore patterns if the field is empty after loading
    if (ignorePatternsTextarea.value.trim() === '') {
      ignorePatternsTextarea.value = `
# Version Control
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
.DS_Store
            `.trim();
    }
  }

  // --- Socket.IO Event Handlers ---
  socket.on('connect', () => {
    console.log('Connected to server!');
    updateStatus('Ready to extract project.', 'info');
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server.');
    updateStatus('Connection lost. Please refresh the page.', 'error');
    setUIState(false);
  });

  socket.on('update_status', (data) => {
    updateStatus(data.message, 'info');
  });

  socket.on('extraction_complete', (data) => {
    if (data.error) {
      outputMarkdown.textContent = '';
      updateStatus(data.error, 'error');
    } else {
      outputMarkdown.textContent = data.markdown;
      updateStatus('Extraction complete! Markdown is ready.', 'success');
    }
    setUIState(false);
  });

  // --- User Action Event Handlers ---
  extractBtn.addEventListener('click', () => {
    const path = projectPathInput.value.trim();
    if (!path) {
      alert('Please provide a project directory path.');
      return;
    }

    setUIState(true);
    updateStatus('Starting extraction...', 'info');
    outputMarkdown.textContent = ''; // Clear previous results

    socket.emit('start_extraction', {
      path: path,
      ignores: ignorePatternsTextarea.value,
      includes: includePathsTextarea.value, // New
      max_size: parseInt(maxFileSizeInput.value, 10) || 1024, // New
      ignore_comments: ignoreCommentsCheckbox.checked,
    });
  });

  copyBtn.addEventListener('click', async () => {
    const content = outputMarkdown.textContent;
    if (!content || !navigator.clipboard) {
      return;
    }
    try {
      await navigator.clipboard.writeText(content);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = 'Copy to Clipboard';
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      alert('Failed to copy text to clipboard.');
    }
  });

  addExternalFileBtn.addEventListener('click', () => createExternalFileEntry());
  saveSettingsBtn.addEventListener('click', saveSettings);
  loadSettingsBtn.addEventListener('click', loadSettings);

  // --- Main Extraction Logic ---
  extractBtn.addEventListener('click', () => {
    const path = projectPathInput.value.trim();

    const externalFileInputs = Array.from(
      document.querySelectorAll('.external-file-path')
    )
      .map((input) => input.value.trim())
      .filter((p) => p);

    if (!path && externalFileInputs.length === 0) {
      alert(
        'Please provide a Project Root Directory or add at least one External File.'
      );
      return;
    }

    setUIState(true);
    updateStatus('Starting extraction...', 'info');
    outputMarkdown.textContent = '';

    const externalFilesData = [];
    document.querySelectorAll('.external-file-entry').forEach((entry) => {
      const filePath = entry.querySelector('.external-file-path').value.trim();
      const description = entry
        .querySelector('.external-file-desc')
        .value.trim();
      if (filePath) {
        externalFilesData.push({ path: filePath, description: description });
      }
    });

    socket.emit('start_extraction', {
      path: path,
      ignores: ignorePatternsTextarea.value,
      includes: includePathsTextarea.value,
      max_size: parseInt(maxFileSizeInput.value, 10) || 1024,
      ignore_comments: ignoreCommentsCheckbox.checked,
      external_files: externalFilesData,
    });
  });

  // --- Initial State ---
  setUIState(false);
  loadSettings(); // Auto-load settings on page startup
});
