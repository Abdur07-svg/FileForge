const ZipExtractor = (() => {

  const LIMITS = {
    MAX_FILES: 1000,
    MAX_TOTAL_UNCOMPRESSED_BYTES: 500 * 1024 * 1024,
    MAX_INDIVIDUAL_FILE_BYTES: 150 * 1024 * 1024,
    MAX_EXPANSION_RATIO: 100
  };

  let loadedZip = null;
  let zipEntries = [];
  let currentZipFile = null;
  let dom = {};

  function init() {
    dom = {
      container: document.getElementById('tool-zip-extractor'),
      dropzone: document.getElementById('zipe-dropzone'),
      fileInput: document.getElementById('zipe-file-input'),
      browseBtn: document.getElementById('zipe-browse-btn'),
      workspace: document.getElementById('zipe-workspace'),
      emptyState: document.getElementById('zipe-empty-state'),

      zipNameText: document.getElementById('zipe-name'),
      zipSizeText: document.getElementById('zipe-size'),
      entryCountText: document.getElementById('zipe-count'),
      entriesList: document.getElementById('zipe-entries-list'),

      extractAllBtn: document.getElementById('zipe-extract-all-btn'),
      resetBtn: document.getElementById('zipe-reset-btn'),
      progressBar: document.getElementById('zipe-progress-bar'),
      progressContainer: document.getElementById('zipe-progress-container'),
      progressText: document.getElementById('zipe-progress-text')
    };

    if (!dom.container) return;

    bindEvents();
  }

  function bindEvents() {
    Utils.setupDropZone(dom.dropzone, handleFiles, ['.zip', 'application/zip', 'application/x-zip-compressed']);
    dom.browseBtn.addEventListener('click', () => dom.fileInput.click());
    dom.fileInput.addEventListener('change', (e) => {
      handleFiles(Array.from(e.target.files));
      dom.fileInput.value = '';
    });

    dom.extractAllBtn.addEventListener('click', extractAllFiles);
    dom.resetBtn.addEventListener('click', resetTool);
  }

  async function handleFiles(files) {
    if (!files || files.length === 0) return;
    const file = files[0];

    const isZip = file.name.toLowerCase().endsWith('.zip') ||
                  file.type === 'application/zip' ||
                  file.type === 'application/x-zip-compressed';

    if (!isZip) {
      Utils.showToast(`"${file.name}" is not a valid .zip archive.`, 'warning');
      return;
    }

    if (typeof JSZip === 'undefined') {
      Utils.showToast('JSZip decompression engine not available.', 'error');
      return;
    }

    currentZipFile = file;
    Utils.setProcessing(true);
    showProgress(25, 'Inspecting and validating archive security headers...');

    try {
      const buffer = await Utils.readFileAsArrayBuffer(file);
      const zip = await JSZip.loadAsync(buffer);
      loadedZip = zip;
      zipEntries = [];

      let totalUncompressed = 0;
      let fileCount = 0;

      zip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir) {
          fileCount++;
          const entrySize = zipEntry._data ? (zipEntry._data.uncompressedSize || 0) : 0;
          totalUncompressed += entrySize;

          if (fileCount > LIMITS.MAX_FILES) {
            throw new Error(`Security Exception: ZIP archive contains more than ${LIMITS.MAX_FILES} files (possible ZIP bomb).`);
          }

          if (entrySize > LIMITS.MAX_INDIVIDUAL_FILE_BYTES) {
            throw new Error(`Security Exception: Entry "${relativePath}" exceeds maximum uncompressed file limit (${Utils.formatBytes(LIMITS.MAX_INDIVIDUAL_FILE_BYTES)}).`);
          }

          if (totalUncompressed > LIMITS.MAX_TOTAL_UNCOMPRESSED_BYTES) {
            throw new Error(`Security Exception: Total uncompressed size exceeds safety limit (${Utils.formatBytes(LIMITS.MAX_TOTAL_UNCOMPRESSED_BYTES)}).`);
          }

          const rawBase = relativePath.split('/').pop() || relativePath;
          const safeName = Utils.sanitizeFilename(rawBase, `extracted_file_${fileCount}`);

          zipEntries.push({
            rawName: relativePath,
            safeName,
            size: entrySize,
            date: zipEntry.date,
            zipEntry
          });
        }
      });

      if (file.size > 0 && totalUncompressed > 0) {
        const ratio = totalUncompressed / file.size;
        if (ratio > LIMITS.MAX_EXPANSION_RATIO && totalUncompressed > 50 * 1024 * 1024) {
          throw new Error(`Security Exception: Suspicious compression ratio (${Math.round(ratio)}:1) detected (potential ZIP bomb).`);
        }
      }

      if (zipEntries.length === 0) {
        Utils.showToast('Archive is empty or contains only directories.', 'warning');
      }

      dom.emptyState.classList.add('hidden');
      dom.workspace.classList.remove('hidden');

      if (dom.zipNameText) dom.zipNameText.textContent = Utils.sanitizeFilename(file.name);
      if (dom.zipSizeText) dom.zipSizeText.textContent = Utils.formatBytes(file.size);
      if (dom.entryCountText) dom.entryCountText.textContent = `${zipEntries.length} file(s) (~${Utils.formatBytes(totalUncompressed)})`;

      renderEntries();
      showProgress(100, 'Archive verified & loaded successfully!');
      setTimeout(hideProgress, 600);
      Utils.showToast(`Verified archive: ${zipEntries.length} file(s) ready for extraction.`, 'success');
    } catch (err) {
      console.error('ZIP extraction security error:', err);
      Utils.showToast(err.message || 'Failed to parse ZIP archive.', 'error');
      resetTool();
    } finally {
      Utils.setProcessing(false);
    }
  }

  function renderEntries() {
    if (!dom.entriesList) return;
    dom.entriesList.innerHTML = '';

    zipEntries.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'reorder-item';

      const ext = (Utils.getExtension(item.safeName) || 'FILE').toUpperCase();
      const escapedName = Utils.escapeHtml(item.safeName);
      const escapedRaw = Utils.escapeHtml(item.rawName);

      card.innerHTML = `
        <div class="reorder-item-left">
          <span class="reorder-index-badge">${index + 1}</span>
          <div class="reorder-item-info">
            <span class="reorder-item-title" title="${escapedRaw}">${escapedName}</span>
            <span class="reorder-item-sub">${item.size ? Utils.formatBytes(item.size) : 'Ready'} &bull; ${Utils.escapeHtml(ext)}</span>
          </div>
        </div>
        <div class="reorder-item-actions">
          <button type="button" class="btn btn-xs btn-primary zipe-dl-single" data-index="${index}">Download</button>
        </div>
      `;

      card.querySelector('.zipe-dl-single').addEventListener('click', () => {
        downloadSingle(index);
      });

      dom.entriesList.appendChild(card);
    });
  }

  async function downloadSingle(index) {
    const item = zipEntries[index];
    if (!item) return;

    Utils.setProcessing(true);
    try {
      const blob = await item.zipEntry.async('blob');
      Utils.downloadBlob(blob, item.safeName);
      Utils.showToast(`Downloaded "${item.safeName}"`, 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Failed to extract file: ' + err.message, 'error');
    } finally {
      Utils.setProcessing(false);
    }
  }

  async function extractAllFiles() {
    if (!loadedZip || zipEntries.length === 0) return;

    Utils.setProcessing(true);
    if (dom.extractAllBtn) dom.extractAllBtn.disabled = true;
    showProgress(10, 'Extracting and downloading files locally...');

    try {
      const total = zipEntries.length;
      for (let i = 0; i < total; i++) {
        const item = zipEntries[i];
        const pct = Math.round(((i + 1) / total) * 95);
        showProgress(pct, `Extracting (${i + 1}/${total}): ${item.safeName}`);

        const blob = await item.zipEntry.async('blob');
        Utils.downloadBlob(blob, item.safeName);

        if (i < total - 1) {
          await new Promise(r => setTimeout(r, 220));
        }
      }

      showProgress(100, 'All files extracted successfully!');
      setTimeout(hideProgress, 800);
      Utils.showToast(`Successfully extracted ${total} file(s)!`, 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Extraction error: ' + (err.message || 'Failed'), 'error');
      hideProgress();
    } finally {
      if (dom.extractAllBtn) dom.extractAllBtn.disabled = false;
      Utils.setProcessing(false);
    }
  }

  function resetTool() {
    loadedZip = null;
    zipEntries = [];
    currentZipFile = null;
    if (dom.emptyState) dom.emptyState.classList.remove('hidden');
    if (dom.workspace) dom.workspace.classList.add('hidden');
    if (dom.entriesList) dom.entriesList.innerHTML = '';
    if (dom.extractAllBtn) dom.extractAllBtn.disabled = false;
    hideProgress();
  }

  function showProgress(percent, text) {
    if (dom.progressContainer) dom.progressContainer.classList.remove('hidden');
    if (dom.progressBar) dom.progressBar.style.width = `${percent}%`;
    if (dom.progressText) dom.progressText.textContent = text;
  }

  function hideProgress() {
    if (dom.progressContainer) dom.progressContainer.classList.add('hidden');
  }

  return {
    init,
    handleFiles,
    reset: resetTool
  };
})();

window.ZipExtractor = ZipExtractor;
