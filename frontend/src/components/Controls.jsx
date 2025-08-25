import React, { useState } from 'react';
import styles from './Controls.module.css';

// A generic reusable form group component
const FormGroup = ({ label, children, htmlFor }) => (
  <div className={styles.formGroup}>
    <label htmlFor={htmlFor}>{label}</label>
    {children}
  </div>
);

export default function Controls({
  projectPath,
  setProjectPath,
  includePaths,
  setIncludePaths,
  ignorePatterns,
  setIgnorePatterns,
  maxFileSize,
  setMaxFileSize,
  ignoreComments,
  setIgnoreComments,
  externalFiles,
  setExternalFiles,
  isWorking,
  onExtract,
  onSaveSettings,
  onLoadSettings,
  backgroundType,
  setBackgroundType,
}) {
  const [settingsStatus, setSettingsStatus] = useState({
    message: '',
    type: 'info',
  });

  const showSettingsStatus = (message, type) => {
    setSettingsStatus({ message, type });
    setTimeout(() => setSettingsStatus({ message: '', type: 'info' }), 3000);
  };

  const handleSave = () => {
    const { success, message } = onSaveSettings();
    showSettingsStatus(message, success ? 'success' : 'error');
  };

  const handleLoad = () => {
    const { success, message } = onLoadSettings();
    showSettingsStatus(message, success ? 'success' : 'error');
  };

  const addExternalFile = () => {
    setExternalFiles([
      ...externalFiles,
      { id: Date.now(), path: '', description: '' },
    ]);
  };

  const removeExternalFile = (id) => {
    setExternalFiles(externalFiles.filter((file) => file.id !== id));
  };

  const updateExternalFile = (id, field, value) => {
    setExternalFiles(
      externalFiles.map((file) =>
        file.id === id ? { ...file, [field]: value } : file
      )
    );
  };

  return (
    <div className={styles.controlsCard}>
      <FormGroup
        label="Project Root Directory (Optional)"
        htmlFor="project-path"
      >
        <input
          type="text"
          id="project-path"
          value={projectPath}
          onChange={(e) => setProjectPath(e.target.value)}
          placeholder="e.g., /Users/user/dev/my-project"
        />
      </FormGroup>

      <FormGroup
        label="Specific Files/Directories to Include"
        htmlFor="include-paths"
      >
        <textarea
          id="include-paths"
          rows="3"
          value={includePaths}
          onChange={(e) => setIncludePaths(e.target.value)}
          placeholder="Leave empty to scan the whole project. One path per line, relative to root."
        />
      </FormGroup>

      <FormGroup
        label="Ignore Patterns (.gitignore style)"
        htmlFor="ignore-patterns"
      >
        <textarea
          id="ignore-patterns"
          rows="5"
          value={ignorePatterns}
          onChange={(e) => setIgnorePatterns(e.target.value)}
        />
      </FormGroup>

      <FormGroup label="External Files">
        <div className={styles.externalFilesContainer}>
          {externalFiles.map((file) => (
            <div key={file.id} className={styles.externalFileEntry}>
              <div className={styles.externalFileHeader}>
                <span>Add Absolute File Path</span>
                <button
                  onClick={() => removeExternalFile(file.id)}
                  className={styles.removeBtn}
                >
                  ×
                </button>
              </div>
              <input
                type="text"
                placeholder="/path/to/your/file"
                value={file.path}
                onChange={(e) =>
                  updateExternalFile(file.id, 'path', e.target.value)
                }
              />
              <textarea
                rows="2"
                placeholder="Description (e.g., this file contains the main API logic)"
                value={file.description}
                onChange={(e) =>
                  updateExternalFile(file.id, 'description', e.target.value)
                }
              />
            </div>
          ))}
          {externalFiles.length === 0 && (
            <p className={styles.noFilesText}>No external files added.</p>
          )}
        </div>
        <button onClick={addExternalFile} className={styles.btnSecondary}>
          Add File
        </button>
      </FormGroup>

      <div className={styles.optionsGrid}>
        <div className={styles.inlineGroup}>
          <label htmlFor="max-file-size">Max Size (KB):</label>
          <input
            type="number"
            id="max-file-size"
            value={maxFileSize}
            onChange={(e) => setMaxFileSize(e.target.value)}
            min="1"
          />
        </div>
        <div className={styles.inlineGroup}>
          <input
            type="checkbox"
            id="ignore-comments"
            checked={ignoreComments}
            onChange={(e) => setIgnoreComments(e.target.checked)}
          />
          <label htmlFor="ignore-comments">Omit comments</label>
        </div>
      </div>

      {/* Background Toggle Section */}
      <div className={styles.backgroundToggle}>
        <label>Background Effect:</label>
        <div className={styles.toggleButtons}>
          <button
            className={`${styles.toggleBtn} ${
              backgroundType === 'stars' ? styles.active : ''
            }`}
            onClick={() => setBackgroundType('stars')}
          >
            Starfield
          </button>
          <button
            className={`${styles.toggleBtn} ${
              backgroundType === 'particles' ? styles.active : ''
            }`}
            onClick={() => setBackgroundType('particles')}
          >
            Particles
          </button>
        </div>
      </div>

      <div className={styles.actions}>
        <div className={styles.settingsActions}>
          <button onClick={handleSave} className={styles.btnSecondary}>
            Save
          </button>
          <button onClick={handleLoad} className={styles.btnSecondary}>
            Load
          </button>
        </div>
        <button
          onClick={onExtract}
          className={styles.btnPrimary}
          disabled={isWorking}
        >
          {isWorking ? 'Generating...' : 'Generate Markdown'}
        </button>
      </div>
      <div
        className={`${styles.settingsStatus} ${styles[settingsStatus.type]}`}
      >
        {settingsStatus.message}
      </div>
    </div>
  );
}
