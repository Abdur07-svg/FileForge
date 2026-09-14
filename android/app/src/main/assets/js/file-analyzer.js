/**
 * FileForge - File Size & Metadata Analyzer Tool
 * Detailed file analytics: exact bytes, MIME type verification, SHA-256 cryptographic checksum, and format breakdown.
 */

const FileAnalyzer = (() => {
  let currentFile = null;
  let dom = {};

  function init() {
    dom = {
      container: document.getElementById('tool-file-analyzer'),
      dropzone: document.getElementById('fanz-dropzone'),
      fileInput: document.getElementById('fanz-file-input'),
      browseBtn: document.getElementById('fanz-browse-btn'),
      workspace: document.getElementById('fanz-workspace'),
      emptyState: document.getElementById('fanz-empty-state'),
      
      // Analytics Fields
      fileNameText: document.getElementById('fanz-file-name'),
      sizeFormattedText: document.getElementById('fanz-size-formatted'),
      sizeBytesText: document.getElementById('fanz-size-bytes'),
      sizeKbText: document.getElementById('fanz-size-kb'),
      sizeMbText: document.getElementById('fanz-size-mb'),
      mimeTypeText: document.getElementById('fanz-mime-type'),
      extText: document.getElementById('fanz-ext'),
      lastModifiedText: document.getElementById('fanz-last-modified'),
      sha256Text: document.getElementById('fanz-sha256'),
      copyHashBtn: document.getElementById('fanz-copy-hash-btn'),
      
      // Actions
      resetBtn: document.getElementById('fanz-reset-btn')
    };

    if (!dom.container) return;

    bindEvents();
  }

  function bindEvents() {
    Utils.setupDropZone(dom.dropzone, handleFiles);
    dom.browseBtn.addEventListener('click', () => dom.fileInput.click());
    dom.fileInput.addEventListener('change', (e) => {
      handleFiles(Array.from(e.target.files));
      dom.fileInput.value = '';
    });

    if (dom.copyHashBtn) {
      dom.copyHashBtn.addEventListener('click', () => {
        if (dom.sha256Text && dom.sha256Text.textContent !== '-') {
          Utils.copyToClipboard(dom.sha256Text.textContent, 'SHA-256 checksum copied!');
        }
      });
    }

    if (dom.resetBtn) dom.resetBtn.addEventListener('click', resetTool);
  }

  async function handleFiles(files) {
    if (!files || files.length === 0) return;
    const file = files[0];
    currentFile = file;

    Utils.setProcessing(true);

    try {
      const ext = Utils.getExtension(file.name) || 'None';
      const bytes = file.size;
      const kb = (bytes / 1024).toFixed(2);
      const mb = (bytes / (1024 * 1024)).toFixed(3);
      const dateStr = file.lastModified ? new Date(file.lastModified).toLocaleString() : 'Unknown';

      // Compute SHA-256 in memory
      let sha256 = 'Calculating...';
      if (window.crypto && window.crypto.subtle) {
        const arrayBuffer = await Utils.readFileAsArrayBuffer(file);
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        sha256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } else {
        sha256 = 'Web Crypto API unavailable in this browser';
      }

      dom.emptyState.classList.add('hidden');
      dom.workspace.classList.remove('hidden');

      if (dom.fileNameText) dom.fileNameText.textContent = file.name;
      if (dom.sizeFormattedText) dom.sizeFormattedText.textContent = Utils.formatBytes(bytes);
      if (dom.sizeBytesText) dom.sizeBytesText.textContent = `${bytes.toLocaleString()} bytes`;
      if (dom.sizeKbText) dom.sizeKbText.textContent = `${kb} KB`;
      if (dom.sizeMbText) dom.sizeMbText.textContent = `${mb} MB`;
      if (dom.mimeTypeText) dom.mimeTypeText.textContent = file.type || 'application/octet-stream (Generic Binary)';
      if (dom.extText) dom.extText.textContent = `.${ext.toUpperCase()}`;
      if (dom.lastModifiedText) dom.lastModifiedText.textContent = dateStr;
      if (dom.sha256Text) dom.sha256Text.textContent = sha256;

      Utils.showToast(`Analyzed "${file.name}"`, 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Analysis error: ' + err.message, 'error');
    } finally {
      Utils.setProcessing(false);
    }
  }

  function resetTool() {
    currentFile = null;
    if (dom.emptyState) dom.emptyState.classList.remove('hidden');
    if (dom.workspace) dom.workspace.classList.add('hidden');
  }

  return {
    init,
    handleFiles,
    reset: resetTool
  };
})();

window.FileAnalyzer = FileAnalyzer;
