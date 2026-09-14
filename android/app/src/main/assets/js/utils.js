/**
 * FileForge - Shared Utility Functions
 * Pure Vanilla JavaScript Helper Module
 */

const Utils = (() => {
  // Guard for beforeunload event
  let activeProcessesCount = 0;

  window.addEventListener('beforeunload', (e) => {
    if (activeProcessesCount > 0) {
      e.preventDefault();
      e.returnValue = 'You have files being processed. Are you sure you want to leave?';
      return e.returnValue;
    }
  });

  /**
   * Register processing start or finish to guard against accidental navigation
   */
  function setProcessing(isProcessing) {
    if (isProcessing) {
      activeProcessesCount++;
    } else {
      activeProcessesCount = Math.max(0, activeProcessesCount - 1);
    }
  }

  /**
   * Format bytes to readable human size
   */
  function formatBytes(bytes, decimals = 1) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Calculate percentage reduction or difference
   */
  function calculateReduction(originalSize, newSize) {
    if (!originalSize || originalSize <= 0) return 0;
    const diff = originalSize - newSize;
    const pct = Math.round((diff / originalSize) * 100);
    return pct;
  }

  /**
   * Toast notification system
   */
  function showToast(message, type = 'info', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-message toast-${type}`;
    
    // Icon based on type
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg class="toast-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg class="toast-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>';
    } else if (type === 'warning') {
      iconSvg = '<svg class="toast-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>';
    } else {
      iconSvg = '<svg class="toast-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>';
    }

    toast.innerHTML = `
      ${iconSvg}
      <span class="toast-text">${escapeHtml(message)}</span>
      <button class="toast-close" aria-label="Close notification">&times;</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.classList.add('toast-dismissing');
      setTimeout(() => toast.remove(), 250);
    });

    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
      if (toast.parentElement) {
        toast.classList.add('toast-dismissing');
        setTimeout(() => toast.remove(), 250);
      }
    }, duration);
  }

  /**
   * Escape HTML to prevent injection
   */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Trigger single file download (Browser & Native Android APK)
   */
  function downloadBlob(blob, filename) {
    filename = sanitizeFilename(filename, 'downloaded_file');

    // Native Android APK Bridge Integration
    if (window.FileForgeAndroid && typeof window.FileForgeAndroid.saveFile === 'function') {
      try {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = reader.result;
          if (base64Data && typeof base64Data === 'string') {
            window.FileForgeAndroid.saveFile(base64Data, filename, blob.type || 'application/octet-stream');
          }
        };
        reader.readAsDataURL(blob);
        return;
      } catch (err) {
        console.warn('Android bridge save fallback:', err);
      }
    }

    // Standard Browser File Download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 300);
  }

  /**
   * Download multiple files packaged as a ZIP
   * @param {Array<{name: string, blob: Blob}>} files
   * @param {string} zipFilename
   * @param {function(number, string)} onProgress - Optional callback (0-100, statusText)
   */
  async function downloadAsZip(files, zipFilename = 'fileforge-archive.zip', onProgress = null) {
    if (!window.JSZip) {
      showToast('JSZip library is not loaded', 'error');
      return;
    }

    try {
      const zip = new JSZip();
      for (let i = 0; i < files.length; i++) {
        const item = files[i];
        zip.file(item.name, item.blob);
      }

      if (onProgress) onProgress(30, 'Compressing archive...');

      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      }, (metadata) => {
        if (onProgress) {
          onProgress(Math.round(metadata.percent), `Packaging ZIP: ${Math.round(metadata.percent)}%`);
        }
      });

      downloadBlob(zipBlob, zipFilename);
      showToast(`ZIP package downloaded successfully!`, 'success');
    } catch (err) {
      console.error('ZIP generation error:', err);
      showToast('Failed to create ZIP package: ' + err.message, 'error');
    }
  }

  /**
   * Read file as ArrayBuffer
   */
  function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file: ' + reader.error));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Read file as Data URL
   */
  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file: ' + reader.error));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Load Image object from Data URL or Object URL
   */
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.src = src;
    });
  }

  /**
   * Canvas to Blob helper with fallback
   */
  function canvasToBlob(canvas, mimeType = 'image/jpeg', quality = 0.85) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, mimeType, quality);
    });
  }

  /**
   * Setup drag and drop events on an element
   */
  function setupDropZone(zoneElement, onFilesSelected, acceptMimes = []) {
    if (!zoneElement) return;

    ['dragenter', 'dragover'].forEach(eventName => {
      zoneElement.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        zoneElement.classList.add('drag-active');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      zoneElement.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        zoneElement.classList.remove('drag-active');
      }, false);
    });

    zoneElement.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = Array.from(dt.files || []);
      if (files.length === 0) return;

      const filtered = acceptMimes.length > 0
        ? files.filter(f => acceptMimes.some(mime => f.type.includes(mime) || f.name.toLowerCase().endsWith(mime)))
        : files;

      if (filtered.length === 0) {
        showToast(`Please upload supported file types (${acceptMimes.join(', ')})`, 'warning');
        return;
      }

      onFilesSelected(filtered);
    });
  }

  /**
   * Get clean base name without extension
   */
  function getBaseName(filename) {
    return filename.substring(0, filename.lastIndexOf('.')) || filename;
  }

  /**
   * Get file extension in lowercase (without dot)
   */
  function getExtension(filename) {
    return (filename.split('.').pop() || '').toLowerCase();
  }

  /**
   * Read file as Text string
   */
  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result || '');
      reader.onerror = () => reject(new Error('Failed to read file as text: ' + (reader.error ? reader.error.message : 'Unknown error')));
      reader.readAsText(file);
    });
  }

  /**
   * Sanitize a filename to prevent path traversal, reserved names, and dangerous characters
   */
  function sanitizeFilename(filename, fallbackName = 'downloaded_file') {
    if (!filename || typeof filename !== 'string') return fallbackName;
    
    // Normalize unicode
    let safe = filename.normalize('NFC');

    // Strip path traversal prefixes and directories (../, ..\, /, \)
    safe = safe.replace(/^.*[\\\/]/, '');

    // Remove null bytes and control characters (0x00-0x1F, 0x7F)
    safe = safe.replace(/[\x00-\x1f\x7f]/g, '');

    // Remove invalid filename characters (< > : " / \ | ? *)
    safe = safe.replace(/[<>:"/\\|?*]/g, '_');

    // Strip leading/trailing dots and spaces
    safe = safe.trim().replace(/^\.+/, '').replace(/\.+$/, '');

    // Check against Windows reserved device names (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
    const baseNameWithoutExt = getBaseName(safe);
    const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
    if (reservedNames.test(baseNameWithoutExt)) {
      safe = `safe_${safe}`;
    }

    // Limit maximum filename length
    if (safe.length > 200) {
      const ext = getExtension(safe);
      const extPart = ext ? `.${ext}` : '';
      safe = safe.substring(0, 195 - extPart.length) + extPart;
    }

    return safe || fallbackName;
  }

  return {
    formatBytes,
    calculateReduction,
    showToast,
    escapeHtml,
    downloadBlob,
    downloadAsZip,
    readFileAsArrayBuffer,
    readFileAsDataURL,
    readFileAsText,
    sanitizeFilename,
    loadImage,
    canvasToBlob,
    setupDropZone,
    getBaseName,
    getExtension,
    setProcessing
  };
})();

// Export globally
window.Utils = Utils;
