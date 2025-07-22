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

  // --- Initial State ---
  setUIState(false);
});
