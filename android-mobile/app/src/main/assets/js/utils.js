/**
 * FileForge Mobile - Utils, Memory & Native Feature Helper
 * Lightweight, 100% Client-Side with Haptics and Native Web Share
 */
const MobileUtils = (() => {
  // Track active blob URLs to clean up immediately upon navigation or reset
  const activeObjectUrls = new Set();

  function trackUrl(url) {
    if (url && typeof url === 'string' && url.startsWith('blob:')) {
      activeObjectUrls.add(url);
    }
    return url;
  }

  function revokeUrl(url) {
    if (url && activeObjectUrls.has(url)) {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {}
      activeObjectUrls.delete(url);
    }
  }

  function resetAllUrls() {
    activeObjectUrls.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {}
    });
    activeObjectUrls.clear();
  }

  function formatBytes(bytes, decimals = 1) {
    if (bytes === 0) return '0 B';
    if (!bytes || isNaN(bytes)) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  function sanitizeFilename(filename, defaultName = 'file') {
    if (!filename || typeof filename !== 'string') return defaultName;
    return filename.replace(/[/\\?%*:|"<>]/g, '_').trim() || defaultName;
  }

  function getBaseName(filename) {
    if (!filename) return 'file';
    const lastDot = filename.lastIndexOf('.');
    return lastDot === -1 ? filename : filename.substring(0, lastDot);
  }

  function getExtension(filename) {
    if (!filename) return '';
    const lastDot = filename.lastIndexOf('.');
    return lastDot === -1 ? '' : filename.substring(lastDot + 1).toLowerCase();
  }

  function triggerHaptic(type = 'light') {
    try {
      const hapticEnabled = localStorage.getItem('fileforge_mobile_haptic') !== 'false';
      if (!hapticEnabled || !navigator.vibrate) return;

      if (type === 'light') {
        navigator.vibrate(12);
      } else if (type === 'success') {
        navigator.vibrate([10, 40, 15]);
      } else if (type === 'warning') {
        navigator.vibrate([20, 50, 20]);
      }
    } catch (e) {}
  }

  /**
   * Unified Mobile FileForge Download & Save Manager
   */
  const FileForgeDownloadManager = (() => {
    let activeBlob = null;
    let activeFilename = 'fileforge-mobile-file';
    let activeMimeType = 'application/octet-stream';
    let currentExtension = '';
    let currentBaseName = '';
    let isSaving = false;
    let initialized = false;

    function initModal() {
      if (initialized) return;
      initialized = true;

      const modal = document.getElementById('save-file-modal');
      if (!modal) return;

      const closeBtn = document.getElementById('save-modal-close-btn');
      const completeCloseBtn = document.getElementById('save-modal-complete-close-btn');
      const cancelBtn = document.getElementById('save-modal-cancel-btn');
      const doneBtn = document.getElementById('save-modal-done-btn');
      const downloadBtn = document.getElementById('save-modal-download-btn');
      const saveAgainBtn = document.getElementById('save-modal-save-again-btn');
      const shareBtn = document.getElementById('save-modal-share-btn');
      const filenameInput = document.getElementById('save-modal-filename-input');

      const closeModalFn = () => {
        if (isSaving) return;
        modal.classList.add('hidden');
      };

      if (closeBtn) closeBtn.addEventListener('click', closeModalFn);
      if (completeCloseBtn) completeCloseBtn.addEventListener('click', closeModalFn);
      if (cancelBtn) cancelBtn.addEventListener('click', closeModalFn);
      if (doneBtn) doneBtn.addEventListener('click', closeModalFn);

      if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
          if (!isSaving && activeBlob) performSave();
        });
      }

      if (saveAgainBtn) {
        saveAgainBtn.addEventListener('click', () => {
          if (activeBlob) {
            showStep('form');
          }
        });
      }

      if (shareBtn) {
        shareBtn.addEventListener('click', async () => {
          if (!activeBlob) return;
          const finalName = getFullFilename();
          await shareBlob(activeBlob, finalName);
        });
      }

      if (filenameInput) {
        filenameInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (!isSaving && activeBlob) performSave();
          }
        });
      }
    }

    function parseFilename(filename) {
      filename = filename ? filename.trim() : 'fileforge-file';
      const lastDotIndex = filename.lastIndexOf('.');
      if (lastDotIndex > 0 && lastDotIndex < filename.length - 1) {
        return {
          base: filename.substring(0, lastDotIndex),
          ext: filename.substring(lastDotIndex)
        };
      }
      return {
        base: filename,
        ext: ''
      };
    }

    function sanitizeBase(base) {
      if (!base) return 'fileforge-file';
      return base
        .replace(/[/\\:*?"<>|]/g, '_')
        .replace(/\.\.+/g, '_')
        .replace(/^\.+|\.+$/g, '')
        .trim() || 'fileforge-file';
    }

    function getFullFilename() {
      const filenameInput = document.getElementById('save-modal-filename-input');
      const rawBase = filenameInput ? filenameInput.value : currentBaseName;
      const safeBase = sanitizeBase(rawBase);
      return safeBase + currentExtension;
    }

    function showStep(stepName) {
      const stepForm = document.getElementById('save-modal-step-form');
      const stepSaving = document.getElementById('save-modal-step-saving');
      const stepComplete = document.getElementById('save-modal-step-complete');

      if (stepForm) stepForm.classList.toggle('hidden', stepName !== 'form');
      if (stepSaving) stepSaving.classList.toggle('hidden', stepName !== 'saving');
      if (stepComplete) stepComplete.classList.toggle('hidden', stepName !== 'complete');
    }

    async function performSave() {
      if (isSaving || !activeBlob) return;
      isSaving = true;

      const downloadBtn = document.getElementById('save-modal-download-btn');
      const cancelBtn = document.getElementById('save-modal-cancel-btn');
      const finalFilename = getFullFilename();

      if (downloadBtn) downloadBtn.disabled = true;
      if (cancelBtn) cancelBtn.disabled = true;

      showStep('saving');
      triggerHaptic('light');

      try {
        // Standard Mobile Blob Download
        const url = URL.createObjectURL(activeBlob);
        trackUrl(url);

        const a = document.createElement('a');
        a.href = url;
        a.download = finalFilename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          if (a.parentElement) a.parentElement.removeChild(a);
          revokeUrl(url);
        }, 1500);

        // Display Complete View
        const compFilename = document.getElementById('save-modal-complete-filename');
        const compMeta = document.getElementById('save-modal-complete-meta');
        const compLocation = document.getElementById('save-modal-complete-location');

        if (compFilename) compFilename.textContent = finalFilename;
        if (compMeta) compMeta.textContent = `${formatBytes(activeBlob.size)} • ${activeBlob.type || activeMimeType}`;
        if (compLocation) compLocation.textContent = "Your file has been saved to your device's download location.";

        triggerHaptic('success');
        showStep('complete');
      } catch (err) {
        console.error('Mobile save error:', err);
        showToast('Save failed: ' + (err.message || 'Unknown error'), 'error');
        showStep('form');
      } finally {
        isSaving = false;
        if (downloadBtn) downloadBtn.disabled = false;
        if (cancelBtn) cancelBtn.disabled = false;
      }
    }

    function openSaveDialog({ blob, filename, mimeType = 'application/octet-stream' }) {
      if (!blob) {
        showToast('No file data available to save', 'warning');
        return;
      }

      initModal();

      activeBlob = blob;
      activeMimeType = mimeType || blob.type || 'application/octet-stream';
      const parsed = parseFilename(filename || 'fileforge-file');
      currentBaseName = parsed.base;
      currentExtension = parsed.ext;

      const modal = document.getElementById('save-file-modal');
      if (!modal) {
        directDownload(blob, filename);
        return;
      }

      const filenameInput = document.getElementById('save-modal-filename-input');
      const extBadge = document.getElementById('save-modal-extension-badge');
      const metaEl = document.getElementById('save-modal-file-meta');

      if (filenameInput) {
        filenameInput.value = currentBaseName;
      }
      if (extBadge) {
        extBadge.textContent = currentExtension || 'FILE';
      }
      if (metaEl) {
        metaEl.textContent = formatBytes(blob.size);
      }

      showStep('form');
      modal.classList.remove('hidden');

      if (filenameInput) {
        setTimeout(() => {
          filenameInput.focus();
          filenameInput.select();
        }, 80);
      }
    }

    function directDownload(blob, filename) {
      triggerHaptic('light');
      filename = sanitizeFilename(filename, 'download');
      const url = URL.createObjectURL(blob);
      trackUrl(url);

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (a.parentElement) a.parentElement.removeChild(a);
        revokeUrl(url);
      }, 1500);
    }

    return {
      save: openSaveDialog,
      directDownload: directDownload
    };
  })();

  window.FileForgeDownloadManager = FileForgeDownloadManager;

  function downloadBlob(blob, filename, mimeType = null) {
    FileForgeDownloadManager.save({
      blob: blob,
      filename: filename,
      mimeType: mimeType || (blob ? blob.type : 'application/octet-stream')
    });
  }

  async function shareBlob(blob, filename, title = 'FileForge File') {
    triggerHaptic('light');
    filename = sanitizeFilename(filename, 'share_file');

    try {
      if (navigator.canShare) {
        const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: title,
            text: `Processed with FileForge Mobile: ${filename}`,
            files: [file]
          });
          showToast('Shared successfully!', 'success');
          return true;
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('Share error fallback:', err);
      }
    }

    // Fallback if sharing is unavailable or fails
    downloadBlob(blob, filename);
    return false;
  }

  function showToast(message, type = 'info', duration = 2800) {
    const container = document.getElementById('mobile-toast-container');
    if (!container) return;

    if (type === 'success') triggerHaptic('success');
    if (type === 'error') triggerHaptic('warning');

    const toast = document.createElement('div');
    toast.className = `mobile-toast mobile-toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>';
    } else {
      iconSvg = '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>';
    }

    toast.innerHTML = `
      <div class="toast-icon">${iconSvg}</div>
      <div class="toast-msg">${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => {
        if (toast.parentElement) toast.parentElement.removeChild(toast);
      }, 300);
    }, duration);
  }

  function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  function loadImageFromSrc(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = src;
    });
  }

  return {
    trackUrl,
    revokeUrl,
    resetAllUrls,
    formatBytes,
    sanitizeFilename,
    getBaseName,
    getExtension,
    triggerHaptic,
    downloadBlob,
    shareBlob,
    downloadManager: FileForgeDownloadManager,
    showToast,
    readFileAsArrayBuffer,
    readFileAsDataURL,
    loadImageFromSrc
  };
})();
