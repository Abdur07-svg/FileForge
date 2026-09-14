/**
 * FileForge - ZIP File Extractor Tool
 * Unpacks .zip archives in-memory, inspects contents, and allows single-file or batch extraction.
 */

const ZipExtractor = (() => {
  let loadedZip = null;
  let zipEntries = []; // { name, size, isDir, date, zipObject }
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
      
      // Details & Stats
      zipNameText: document.getElementById('zipe-name'),
      zipSizeText: document.getElementById('zipe-size'),
      entryCountText: document.getElementById('zipe-count'),
      entriesList: document.getElementById('zipe-entries-list'),
      
      // Actions
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
      Utils.showToast(`"${file.name}" is not a valid .zip file.`, 'warning');
      return;
    }

    if (typeof JSZip === 'undefined') {
      Utils.showToast('JSZip decompression engine not available.', 'error');
      return;
    }

    currentZipFile = file;
    Utils.setProcessing(true);
    showProgress(25, 'Reading and unpacking archive structure...');

    try {
      const buffer = await Utils.readFileAsArrayBuffer(file);
      const zip = await JSZip.loadAsync(buffer);
      loadedZip = zip;
      zipEntries = [];

      zip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir) {
          zipEntries.push({
            name: relativePath,
            size: zipEntry._data ? (zipEntry._data.uncompressedSize || 0) : 0,
            date: zipEntry.date,
            zipEntry
          });
        }
      });

      if (zipEntries.length === 0) {
        Utils.showToast('Archive is empty or contains only folders.', 'warning');
      }

      dom.emptyState.classList.add('hidden');
      dom.workspace.classList.remove('hidden');

      if (dom.zipNameText) dom.zipNameText.textContent = file.name;
      if (dom.zipSizeText) dom.zipSizeText.textContent = Utils.formatBytes(file.size);
      if (dom.entryCountText) dom.entryCountText.textContent = `${zipEntries.length} file(s)`;

      renderEntries();
      showProgress(100, 'Archive loaded successfully!');
      setTimeout(hideProgress, 600);
      Utils.showToast(`Extracted table of contents: ${zipEntries.length} file(s) found.`, 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Failed to parse ZIP archive: ' + err.message, 'error');
      hideProgress();
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

      const ext = (Utils.getExtension(item.name) || 'FILE').toUpperCase();

      card.innerHTML = `
        <div class="reorder-item-left">
          <span class="reorder-index-badge">${index + 1}</span>
          <div class="reorder-item-info">
            <span class="reorder-item-title" title="${item.name}">${item.name}</span>
            <span class="reorder-item-sub">${item.size ? Utils.formatBytes(item.size) : 'Ready'} &bull; ${ext}</span>
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
      const filename = item.name.split('/').pop() || item.name;
      Utils.downloadBlob(blob, filename);
      Utils.showToast(`Downloaded "${filename}"`, 'success');
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
    showProgress(10, 'Extracting and downloading all files...');

    try {
      for (let i = 0; i < zipEntries.length; i++) {
        const item = zipEntries[i];
        const pct = Math.round(((i + 1) / zipEntries.length) * 100);
        showProgress(pct, `Extracting (${i + 1}/${zipEntries.length}): ${item.name}`);
        
        const blob = await item.zipEntry.async('blob');
        const filename = item.name.split('/').pop() || item.name;
        Utils.downloadBlob(blob, filename);

        // Small delay between browser downloads to prevent throttling
        if (i < zipEntries.length - 1) {
          await new Promise(r => setTimeout(r, 200));
        }
      }

      showProgress(100, 'All files downloaded!');
      setTimeout(hideProgress, 800);
      Utils.showToast(`Successfully extracted ${zipEntries.length} file(s)!`, 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Extraction error: ' + err.message, 'error');
      hideProgress();
    } finally {
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
