/**
 * FileForge Mobile - Utils & Memory Helper
 * Lightweight, 100% Client-Side
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

  function downloadBlob(blob, filename) {
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

  function showToast(message, type = 'info', duration = 2800) {
    const container = document.getElementById('mobile-toast-container');
    if (!container) return;

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
    downloadBlob,
    showToast,
    readFileAsArrayBuffer,
    readFileAsDataURL,
    loadImageFromSrc
  };
})();
