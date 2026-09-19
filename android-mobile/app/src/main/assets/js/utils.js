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
    let lastSavedUri = null;
    let isSaving = false;
    let initialized = false;

    function initModal() {
      const modal = document.getElementById('save-file-modal');
      if (!modal || initialized) return;
      initialized = true;

      const closeBtn = document.getElementById('save-modal-close-btn');
      const completeCloseBtn = document.getElementById('save-modal-complete-close-btn');
      const cancelBtn = document.getElementById('save-modal-cancel-btn');
      const doneBtn = document.getElementById('save-modal-done-btn');
      const downloadBtn = document.getElementById('save-modal-download-btn');
      const saveAgainBtn = document.getElementById('save-modal-save-again-btn');
      const shareBtn = document.getElementById('save-modal-share-btn');
      const openBtn = document.getElementById('save-modal-open-btn');
      const retryBtn = document.getElementById('save-modal-retry-btn');
      const errorBackBtn = document.getElementById('save-modal-error-back-btn');
      const filenameInput = document.getElementById('save-modal-filename-input');

      const closeModalFn = () => {
        if (isSaving) return;
        modal.classList.add('hidden');
      };

      if (closeBtn) closeBtn.addEventListener('click', closeModalFn);
      if (completeCloseBtn) completeCloseBtn.addEventListener('click', closeModalFn);
      if (cancelBtn) cancelBtn.addEventListener('click', closeModalFn);
      if (doneBtn) doneBtn.addEventListener('click', closeModalFn);
      if (errorBackBtn) errorBackBtn.addEventListener('click', closeModalFn);

      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModalFn();
      });

      if (downloadBtn) {
        downloadBtn.addEventListener('click', (e) => {
          e.preventDefault();
          if (!isSaving && activeBlob) performSave();
        });
      }

      if (retryBtn) {
        retryBtn.addEventListener('click', (e) => {
          e.preventDefault();
          if (!isSaving && activeBlob) performSave();
        });
      }

      if (saveAgainBtn) {
        saveAgainBtn.addEventListener('click', (e) => {
          e.preventDefault();
          if (activeBlob) {
            showStep('form');
          }
        });
      }

      if (shareBtn) {
        shareBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          if (window.AndroidBridge && typeof window.AndroidBridge.shareFile === 'function' && lastSavedUri) {
            window.AndroidBridge.shareFile(lastSavedUri, activeMimeType);
          } else if (activeBlob) {
            const finalName = getFullFilename();
            await shareBlob(activeBlob, finalName);
          }
        });
      }

      if (openBtn) {
        openBtn.addEventListener('click', (e) => {
          e.preventDefault();
          if (window.AndroidBridge && typeof window.AndroidBridge.openFile === 'function' && lastSavedUri) {
            window.AndroidBridge.openFile(lastSavedUri, activeMimeType);
          } else if (activeBlob) {
            const url = URL.createObjectURL(activeBlob);
            window.open(url, '_blank');
          }
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
      let ext = currentExtension;
      if (!ext && activeMimeType) {
        if (activeMimeType.includes('pdf')) ext = '.pdf';
        else if (activeMimeType.includes('jpeg') || activeMimeType.includes('jpg')) ext = '.jpg';
        else if (activeMimeType.includes('png')) ext = '.png';
        else if (activeMimeType.includes('webp')) ext = '.webp';
        else if (activeMimeType.includes('zip')) ext = '.zip';
        else if (activeMimeType.includes('text')) ext = '.txt';
      }
      return safeBase + ext;
    }

    function showStep(stepName) {
      const stepForm = document.getElementById('save-modal-step-form');
      const stepSaving = document.getElementById('save-modal-step-saving');
      const stepComplete = document.getElementById('save-modal-step-complete');
      const stepError = document.getElementById('save-modal-step-error');

      if (stepForm) stepForm.classList.toggle('hidden', stepName !== 'form');
      if (stepSaving) stepSaving.classList.toggle('hidden', stepName !== 'saving');
      if (stepComplete) stepComplete.classList.toggle('hidden', stepName !== 'complete');
      if (stepError) stepError.classList.toggle('hidden', stepName !== 'error');
    }

    async function performSave() {
      if (isSaving || !activeBlob) return;
      isSaving = true;

      const downloadBtn = document.getElementById('save-modal-download-btn');
      const cancelBtn = document.getElementById('save-modal-cancel-btn');
      const retryBtn = document.getElementById('save-modal-retry-btn');
      const finalFilename = getFullFilename();

      if (downloadBtn) downloadBtn.disabled = true;
      if (cancelBtn) cancelBtn.disabled = true;
      if (retryBtn) retryBtn.disabled = true;

      showStep('saving');
      triggerHaptic('light');

      try {
        if (window.AndroidBridge && typeof window.AndroidBridge.saveFile === 'function') {
          // Native Android APK Storage Access Framework (SAF)
          const reader = new FileReader();
          reader.onloadend = () => {
            try {
              window.AndroidBridge.saveFile(reader.result, finalFilename, activeBlob.type || activeMimeType);
            } catch (e) {
              onNativeSaveError(e.message || 'Failed to trigger Android save');
            }
          };
          reader.onerror = () => onNativeSaveError('Failed to read file data buffer');
          reader.readAsDataURL(activeBlob);
          // Wait for Android native callback: onNativeSaveSuccess / onNativeSaveCancelled / onNativeSaveError
          return;
        }

        // Web Browser Flow: File System Access API or standard Blob download
        if (window.showSaveFilePicker) {
          try {
            const handle = await window.showSaveFilePicker({
              suggestedName: finalFilename,
              types: [{
                description: 'FileForge Output',
                accept: { [activeBlob.type || activeMimeType]: [currentExtension || '.bin'] }
              }]
            });
            const writable = await handle.createWritable();
            await writable.write(activeBlob);
            await writable.close();
            onNativeSaveSuccess(finalFilename, activeBlob.type || activeMimeType, null);
            return;
          } catch (err) {
            if (err.name === 'AbortError') {
              onNativeSaveCancelled();
              return;
            }
            // Fall through to standard download on error
          }
        }

        // Standard Mobile Browser Fallback
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

        onNativeSaveSuccess(finalFilename, activeBlob.type || activeMimeType, null);
      } catch (err) {
        console.error('Mobile save error:', err);
        onNativeSaveError(err.message || 'Unknown save error');
      }
    }

    function onNativeSaveSuccess(filename, mimeType, uriString) {
      isSaving = false;
      lastSavedUri = uriString;

      const downloadBtn = document.getElementById('save-modal-download-btn');
      const cancelBtn = document.getElementById('save-modal-cancel-btn');
      const retryBtn = document.getElementById('save-modal-retry-btn');
      if (downloadBtn) downloadBtn.disabled = false;
      if (cancelBtn) cancelBtn.disabled = false;
      if (retryBtn) retryBtn.disabled = false;

      const compFilename = document.getElementById('save-modal-complete-filename');
      const compMeta = document.getElementById('save-modal-complete-meta');
      const compLocation = document.getElementById('save-modal-complete-location');
      const openBtn = document.getElementById('save-modal-open-btn');

      if (compFilename) compFilename.textContent = filename || getFullFilename();
      if (compMeta && activeBlob) compMeta.textContent = `${formatBytes(activeBlob.size)} • Saved successfully`;
      if (compLocation) {
        compLocation.innerHTML = window.AndroidBridge 
          ? "Your file has been saved successfully using Android's file saving system." 
          : "Your file has been saved to your device's download location.";
      }

      if (openBtn) {
        openBtn.style.display = (window.AndroidBridge || activeBlob) ? 'inline-flex' : 'none';
      }

      triggerHaptic('success');
      showStep('complete');
    }

    function onNativeSaveCancelled() {
      isSaving = false;
      const downloadBtn = document.getElementById('save-modal-download-btn');
      const cancelBtn = document.getElementById('save-modal-cancel-btn');
      const retryBtn = document.getElementById('save-modal-retry-btn');
      if (downloadBtn) downloadBtn.disabled = false;
      if (cancelBtn) cancelBtn.disabled = false;
      if (retryBtn) retryBtn.disabled = false;

      showStep('form');
      showToast('Save cancelled.', 'info');
    }

    function onNativeSaveError(errorMsg) {
      isSaving = false;
      const downloadBtn = document.getElementById('save-modal-download-btn');
      const cancelBtn = document.getElementById('save-modal-cancel-btn');
      const retryBtn = document.getElementById('save-modal-retry-btn');
      if (downloadBtn) downloadBtn.disabled = false;
      if (cancelBtn) cancelBtn.disabled = false;
      if (retryBtn) retryBtn.disabled = false;

      const errorTextEl = document.getElementById('save-modal-error-text');
      if (errorTextEl) {
        errorTextEl.textContent = errorMsg 
          ? `Unable to save the file: ${errorMsg}. Please try again or choose another location.`
          : 'Unable to save the file. Please try again or choose another location.';
      }

      triggerHaptic('warning');
      showStep('error');
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
      lastSavedUri = null;

      const modal = document.getElementById('save-file-modal');
      if (!modal) {
        directDownload(blob, filename);
        return;
      }

      const filenameInput = document.getElementById('save-modal-filename-input');
      const extBadge = document.getElementById('save-modal-extension-badge');
      const metaEl = document.getElementById('save-modal-file-meta');
      const locationText = document.getElementById('save-modal-location-text');

      if (filenameInput) {
        filenameInput.value = currentBaseName;
      }
      if (extBadge) {
        extBadge.textContent = currentExtension || 'FILE';
      }
      if (metaEl) {
        metaEl.textContent = formatBytes(blob.size);
      }
      if (locationText) {
        if (window.AndroidBridge) {
          locationText.textContent = "This file will be saved using Android's file saving system.";
        } else {
          locationText.textContent = "Your device will save this file to your default Downloads folder.";
        }
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

    // Auto-init on DOM ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initModal);
    } else {
      initModal();
    }

    return {
      init: initModal,
      save: openSaveDialog,
      directDownload: directDownload,
      onNativeSaveSuccess: onNativeSaveSuccess,
      onNativeSaveCancelled: onNativeSaveCancelled,
      onNativeSaveError: onNativeSaveError
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
