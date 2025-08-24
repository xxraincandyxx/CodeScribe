import React, { useState, useEffect, useCallback } from 'react';
import styles from './Results.module.css';

const Spinner = () => <div className={styles.spinner}></div>;

export default function Results({ status, isWorking, markdown }) {
  const [copyText, setCopyText] = useState('Copy to Clipboard');

  const handleCopy = useCallback(async () => {
    if (!markdown || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(markdown);
      setCopyText('Copied!');
      setTimeout(() => setCopyText('Copy to Clipboard'), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
      setCopyText('Copy Failed!');
      setTimeout(() => setCopyText('Copy to Clipboard'), 2000);
    }
  }, [markdown]);

  // Reset copy button text if markdown changes
  useEffect(() => {
    setCopyText('Copy to Clipboard');
  }, [markdown]);

  return (
    <div className={styles.resultsCard}>
      <div className={styles.statusBar}>
        {isWorking && <Spinner />}
        <span className={`${styles.statusText} ${styles[status.type]}`}>
          {status.message}
        </span>
      </div>
      <div className={styles.outputHeader}>
        <h3>Generated Markdown</h3>
        <button
          className={styles.copyBtn}
          onClick={handleCopy}
          disabled={!markdown || isWorking}
        >
          {copyText}
        </button>
      </div>
      <div className={styles.outputContainer}>
        <pre>
          <code>{markdown || 'Output will appear here...'}</code>
        </pre>
      </div>
    </div>
  );
}
