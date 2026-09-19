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
   * Single Authoritative FileForge Mobile Download & Save Manager
   * ANDROID APK: Download Click -> "Save Your File" Modal -> Save File Click -> Native SAF Picker -> Saving... -> Native SUCCESS -> "Download Complete"
   */
  const FileForgeDownloadManager = (() => {
    let pendingDownload = null; // { blob, filename, mimeType, baseName, extension, size }
    let lastSavedUri = null;
    let isSaving = false;
    let initialized = false;

    function isAndroidApp() {
      if (typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge !== null) return true;
      if (window.FileForgeAndroidApp === true || window.isAndroidAPK === true) return true;
      if (window.location.href.indexOf('android_asset') !== -1) return true;
      return false;
    }

    function clearPendingState() {
      pendingDownload = null;
      lastSavedUri = null;
      isSaving = false;
    }

    function initModal() {
      const modal = document.getElementById('save-file-modal');
      if (!modal || initialized) return;
      initialized = true;

      const closeBtn = document.getElementById('save-modal-close-btn');
      const completeCloseBtn = document.getElementById('save-modal-complete-close-btn');
      const cancelBtn = document.getElementById('save-modal-cancel-btn');
      const doneBtn = document.getElementById('save-modal-done-btn');
      const downloadBtn = document.getElementById('save-modal-download-btn');
      const pickerBtn = document.getElementById('save-modal-picker-btn');
      const saveAgainBtn = document.getElementById('save-modal-save-again-btn');
      const shareBtn = document.getElementById('save-modal-share-btn');
      const openBtn = document.getElementById('save-modal-open-btn');
      const retryBtn = document.getElementById('save-modal-retry-btn');
      const errorBackBtn = document.getElementById('save-modal-error-back-btn');
      const filenameInput = document.getElementById('save-modal-filename-input');

      const closeModalFn = () => {
        if (isSaving) return;
        modal.classList.add('hidden');
        clearPendingState();
      };

      if (closeBtn) closeBtn.addEventListener('click', closeModalFn);
      if (completeCloseBtn) completeCloseBtn.addEventListener('click', closeModalFn);
      if (cancelBtn) cancelBtn.addEventListener('click', closeModalFn);
      if (doneBtn) doneBtn.addEventListener('click', closeModalFn);
      if (errorBackBtn) errorBackBtn.addEventListener('click', closeModalFn);

      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModalFn();
      });

      // User presses "Save File" in "Save Your File" modal
      if (downloadBtn) {
        downloadBtn.addEventListener('click', (e) => {
          e.preventDefault();
          if (!isSaving && pendingDownload) startNativeSaveProcess();
        });
      }

      // User taps "Choose Folder" in Save Location box
      if (pickerBtn) {
        pickerBtn.addEventListener('click', (e) => {
          e.preventDefault();
          if (!isSaving && pendingDownload) startNativeSaveProcess();
        });
      }

      if (retryBtn) {
        retryBtn.addEventListener('click', (e) => {
          e.preventDefault();
          if (!isSaving && pendingDownload) startNativeSaveProcess();
        });
      }

      if (saveAgainBtn) {
        saveAgainBtn.addEventListener('click', (e) => {
          e.preventDefault();
          if (pendingDownload && pendingDownload.blob) {
            if (isAndroidApp()) {
              showStep('form');
            } else {
              directBrowserDownload(pendingDownload.blob, pendingDownload.filename);
              showToast('Downloading again...', 'info');
            }
          }
        });
      }

      if (shareBtn) {
        shareBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          if (window.AndroidBridge && typeof window.AndroidBridge.shareFile === 'function' && lastSavedUri) {
            window.AndroidBridge.shareFile(lastSavedUri, pendingDownload ? pendingDownload.mimeType : 'application/octet-stream');
          } else if (pendingDownload && pendingDownload.blob) {
            const finalName = getFullFilename();
            await shareBlob(pendingDownload.blob, finalName);
          }
        });
      }

      if (openBtn) {
        openBtn.addEventListener('click', (e) => {
          e.preventDefault();
          if (window.AndroidBridge && typeof window.AndroidBridge.openFile === 'function' && lastSavedUri) {
            window.AndroidBridge.openFile(lastSavedUri, pendingDownload ? pendingDownload.mimeType : '*/*');
          } else if (pendingDownload && pendingDownload.blob) {
            const url = URL.createObjectURL(pendingDownload.blob);
            window.open(url, '_blank');
          }
        });
      }

      if (filenameInput) {
        filenameInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (!isSaving && pendingDownload) startNativeSaveProcess();
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
      const rawBase = filenameInput ? filenameInput.value : (pendingDownload ? pendingDownload.baseName : 'fileforge-file');
      const safeBase = sanitizeBase(rawBase);
      let ext = pendingDownload ? pendingDownload.extension : '';
      if (!ext && pendingDownload && pendingDownload.mimeType) {
        if (pendingDownload.mimeType.includes('pdf')) ext = '.pdf';
        else if (pendingDownload.mimeType.includes('jpeg') || pendingDownload.mimeType.includes('jpg')) ext = '.jpg';
        else if (pendingDownload.mimeType.includes('png')) ext = '.png';
        else if (pendingDownload.mimeType.includes('webp')) ext = '.webp';
        else if (pendingDownload.mimeType.includes('zip')) ext = '.zip';
        else if (pendingDownload.mimeType.includes('text')) ext = '.txt';
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

    /**
     * Triggered ONLY when the user clicks "Save File" or "Choose Folder" inside the Save Your File modal
     */
    async function startNativeSaveProcess() {
      if (isSaving || !pendingDownload || !pendingDownload.blob) return;
      if (pendingDownload.blob.size <= 0) {
        onNativeSaveError('File is empty (0 bytes)');
        return;
      }
      isSaving = true;

      const downloadBtn = document.getElementById('save-modal-download-btn');
      const pickerBtn = document.getElementById('save-modal-picker-btn');
      const cancelBtn = document.getElementById('save-modal-cancel-btn');
      const retryBtn = document.getElementById('save-modal-retry-btn');
      const finalFilename = getFullFilename();

      if (downloadBtn) downloadBtn.disabled = true;
      if (pickerBtn) pickerBtn.disabled = true;
      if (cancelBtn) cancelBtn.disabled = true;
      if (retryBtn) retryBtn.disabled = true;

      // Show Saving... state
      showStep('saving');
      triggerHaptic('light');

      try {
        if (isAndroidApp()) {
          if (!window.AndroidBridge || (typeof window.AndroidBridge.saveFile !== 'function' && typeof window.AndroidBridge.openSavePicker !== 'function')) {
            onNativeSaveError('Android save system is unavailable. Please restart the app.');
            return;
          }

          // Native Android APK Storage Access Framework (SAF)
          const reader = new FileReader();
          reader.onloadend = () => {
            try {
              if (typeof window.AndroidBridge.openSavePicker === 'function') {
                window.AndroidBridge.openSavePicker(reader.result, finalFilename, pendingDownload.blob.type || pendingDownload.mimeType);
              } else {
                window.AndroidBridge.saveFile(reader.result, finalFilename, pendingDownload.blob.type || pendingDownload.mimeType);
              }
            } catch (e) {
              onNativeSaveError(e.message || 'Failed to trigger Android save');
            }
          };
          reader.onerror = () => onNativeSaveError('Failed to read file data buffer');
          reader.readAsDataURL(pendingDownload.blob);
          // Return immediately - awaiting native callback
          return;
        }

        // Web Browser fallback ONLY for browsers (never in APK)
        directBrowserDownload(pendingDownload.blob, finalFilename);
        onNativeSaveSuccess(finalFilename, pendingDownload.blob.type || pendingDownload.mimeType, null, pendingDownload.blob.size);
      } catch (err) {
        console.error('Mobile save error:', err);
        onNativeSaveError(err.message || 'Unknown save error');
      }
    }

    /**
     * Native Android SAF confirmed success callback
     */
    function onNativeSaveSuccess(filename, mimeType, uriString, fileSize) {
      isSaving = false;
      lastSavedUri = uriString;

      const downloadBtn = document.getElementById('save-modal-download-btn');
      const pickerBtn = document.getElementById('save-modal-picker-btn');
      const cancelBtn = document.getElementById('save-modal-cancel-btn');
      const retryBtn = document.getElementById('save-modal-retry-btn');
      if (downloadBtn) downloadBtn.disabled = false;
      if (pickerBtn) pickerBtn.disabled = false;
      if (cancelBtn) cancelBtn.disabled = false;
      if (retryBtn) retryBtn.disabled = false;

      const actualSize = fileSize || (pendingDownload && pendingDownload.size) || (pendingDownload && pendingDownload.blob ? pendingDownload.blob.size : 0);
      const displayFilename = filename || (pendingDownload ? pendingDownload.filename : getFullFilename());

      const compFilename = document.getElementById('save-modal-complete-filename');
      const compMeta = document.getElementById('save-modal-complete-meta');
      const compLocation = document.getElementById('save-modal-complete-location');
      const openBtn = document.getElementById('save-modal-open-btn');
      const saveAgainBtn = document.getElementById('save-modal-save-again-btn');

      if (compFilename) compFilename.textContent = displayFilename;
      if (compMeta) {
        compMeta.textContent = `${formatBytes(actualSize)} • Saved successfully`;
      }
      if (compLocation) {
        compLocation.textContent = "Your file has been saved successfully using Android's file saving system.";
      }

      if (saveAgainBtn) {
        saveAgainBtn.textContent = 'Save Again';
      }

      if (openBtn) {
        openBtn.style.display = (window.AndroidBridge || (pendingDownload && pendingDownload.blob)) ? 'inline-flex' : 'none';
      }

      triggerHaptic('success');
      const modal = document.getElementById('save-file-modal');
      if (modal) modal.classList.remove('hidden');
      showStep('complete');
    }

    /**
     * Mobile Browser Download Complete Popup
     * Shown after normal browser download completes in web browser mode
     */
    function showBrowserDownloadComplete(blob, filename, mimeType) {
      initModal();

      const parsed = parseFilename(filename || 'fileforge-file');
      const safeBase = sanitizeBase(parsed.base);
      const ext = parsed.ext || (mimeType && mimeType.includes('pdf') ? '.pdf' : (mimeType && mimeType.includes('png') ? '.png' : '.jpg'));
      const finalFilename = safeBase + ext;

      pendingDownload = {
        blob: blob,
        filename: finalFilename,
        mimeType: mimeType || (blob ? blob.type : 'application/octet-stream'),
        baseName: safeBase,
        extension: ext,
        size: blob ? blob.size : 0
      };
      lastSavedUri = null;
      isSaving = false;

      const compFilename = document.getElementById('save-modal-complete-filename');
      const compMeta = document.getElementById('save-modal-complete-meta');
      const compLocation = document.getElementById('save-modal-complete-location');
      const openBtn = document.getElementById('save-modal-open-btn');
      const saveAgainBtn = document.getElementById('save-modal-save-again-btn');
      const shareBtn = document.getElementById('save-modal-share-btn');

      if (compFilename) compFilename.textContent = finalFilename;
      if (compMeta && blob) {
        compMeta.textContent = `${formatBytes(blob.size)} • Downloaded successfully`;
      }
      if (compLocation) {
        compLocation.textContent = 'Your file has been downloaded successfully.';
      }

      if (saveAgainBtn) {
        saveAgainBtn.textContent = 'Download Again';
      }

      if (openBtn) {
        openBtn.style.display = 'none';
      }

      if (shareBtn) {
        shareBtn.style.display = (typeof navigator.canShare === 'function' ? 'inline-flex' : 'none');
      }

      triggerHaptic('success');
      const modal = document.getElementById('save-file-modal');
      if (modal) modal.classList.remove('hidden');
      showStep('complete');
    }

    /**
     * Native Android SAF user cancel callback
     */
    function onNativeSaveCancelled() {
      isSaving = false;
      const downloadBtn = document.getElementById('save-modal-download-btn');
      const pickerBtn = document.getElementById('save-modal-picker-btn');
      const cancelBtn = document.getElementById('save-modal-cancel-btn');
      const retryBtn = document.getElementById('save-modal-retry-btn');
      if (downloadBtn) downloadBtn.disabled = false;
      if (pickerBtn) pickerBtn.disabled = false;
      if (cancelBtn) cancelBtn.disabled = false;
      if (retryBtn) retryBtn.disabled = false;

      showStep('form');
      showToast('Save cancelled.', 'info');
    }

    /**
     * Native Android SAF error callback
     */
    function onNativeSaveError(errorMsg) {
      isSaving = false;
      const downloadBtn = document.getElementById('save-modal-download-btn');
      const pickerBtn = document.getElementById('save-modal-picker-btn');
      const cancelBtn = document.getElementById('save-modal-cancel-btn');
      const retryBtn = document.getElementById('save-modal-retry-btn');
      if (downloadBtn) downloadBtn.disabled = false;
      if (pickerBtn) pickerBtn.disabled = false;
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

    /**
     * Download button click handler
     * MANDATORY: Always opens "Save Your File" form modal first!
     * NEVER triggers automatic save or Download Complete directly.
     */
    function openSaveDialog({ blob, filename, mimeType = 'application/octet-stream' }) {
      if (!blob || !(blob instanceof Blob) || blob.size <= 0) {
        showToast('Unable to create the file (0 bytes).', 'error');
        return;
      }

      initModal();

      const parsed = parseFilename(filename || 'fileforge-file');
      const safeBase = sanitizeBase(parsed.base);
      const ext = parsed.ext || (mimeType.includes('pdf') ? '.pdf' : (mimeType.includes('png') ? '.png' : '.jpg'));

      // Create pristine fresh pending download object
      pendingDownload = {
        blob: blob,
        filename: safeBase + ext,
        mimeType: mimeType || blob.type || 'application/octet-stream',
        baseName: safeBase,
        extension: ext,
        size: blob.size
      };
      lastSavedUri = null;
      isSaving = false;

      const modal = document.getElementById('save-file-modal');
      if (!modal) return;

      const filenameInput = document.getElementById('save-modal-filename-input');
      const extBadge = document.getElementById('save-modal-extension-badge');
      const metaEl = document.getElementById('save-modal-file-meta');
      const locationText = document.getElementById('save-modal-location-text');

      if (filenameInput) {
        filenameInput.value = safeBase;
      }
      if (extBadge) {
        extBadge.textContent = ext || 'FILE';
      }
      if (metaEl) {
        metaEl.textContent = formatBytes(blob.size);
      }
      if (locationText) {
        locationText.textContent = "Tap 'Choose Folder' or 'Save File' to select any folder on your device or SD card.";
      }

      // Mandatory Gate: Show Step 1 (Form) only!
      showStep('form');
      modal.classList.remove('hidden');

      if (filenameInput) {
        setTimeout(() => {
          filenameInput.focus();
          filenameInput.select();
        }, 80);
      }
    }

    function directBrowserDownload(blob, filename) {
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
      clear: clearPendingState,
      save: openSaveDialog,
      directBrowserDownload: directBrowserDownload,
      showBrowserDownloadComplete: showBrowserDownloadComplete,
      isAndroidApp: isAndroidApp,
      onNativeSaveSuccess: onNativeSaveSuccess,
      onNativeSaveCancelled: onNativeSaveCancelled,
      onNativeSaveError: onNativeSaveError
    };
  })();

  window.FileForgeDownloadManager = FileForgeDownloadManager;

  function downloadBlob(blob, filename, mimeType = null) {
    if (!blob || !(blob instanceof Blob) || blob.size <= 0) {
      showToast('Unable to create the file: File is empty or missing.', 'error');
      console.error('FileForge Download Error: invalid or 0-byte blob', { blob, filename });
      return;
    }

    if (FileForgeDownloadManager.isAndroidApp()) {
      // ANDROID APK FLOW:
      // ALWAYS open "Save Your File" modal first!
      FileForgeDownloadManager.save({
        blob: blob,
        filename: filename,
        mimeType: mimeType || (blob ? blob.type : 'application/octet-stream')
      });
    } else {
      // DESKTOP & MOBILE BROWSER FLOW:
      // 1. Direct browser download
      FileForgeDownloadManager.directBrowserDownload(blob, filename);
      // 2. Open Download Complete modal
      FileForgeDownloadManager.showBrowserDownloadComplete(
        blob,
        filename,
        mimeType || (blob ? blob.type : 'application/octet-stream')
      );
    }
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
