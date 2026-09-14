/**
 * FileForge - ZIP File Creator Tool
 * Combines multiple files into a clean ZIP archive with custom compression level and folder naming.
 */

const ZipCreator = (() => {
  let filesList = []; // { file, name, size, type, data }
  let dom = {};

  function init() {
    dom = {
      container: document.getElementById('tool-zip-creator'),
      dropzone: document.getElementById('zipc-dropzone'),
      fileInput: document.getElementById('zipc-file-input'),
      browseBtn: document.getElementById('zipc-browse-btn'),
      workspace: document.getElementById('zipc-workspace'),
      emptyState: document.getElementById('zipc-empty-state'),
      
      // File Table / List
      fileList: document.getElementById('zipc-file-list'),
      fileCountBadge: document.getElementById('zipc-file-count'),
      totalSizeBadge: document.getElementById('zipc-total-size'),
      addMoreBtn: document.getElementById('zipc-add-more-btn'),
      
      // Settings
      archiveNameInput: document.getElementById('zipc-archive-name'),
      compressLevelSelect: document.getElementById('zipc-compress-level'),
      
      // Actions
      createBtn: document.getElementById('zipc-create-btn'),
      resetBtn: document.getElementById('zipc-reset-btn'),
      progressBar: document.getElementById('zipc-progress-bar'),
      progressContainer: document.getElementById('zipc-progress-container'),
      progressText: document.getElementById('zipc-progress-text')
    };

    if (!dom.container) return;

    bindEvents();
  }

  function bindEvents() {
    Utils.setupDropZone(dom.dropzone, handleFiles);
    dom.browseBtn.addEventListener('click', () => dom.fileInput.click());
    if (dom.addMoreBtn) dom.addMoreBtn.addEventListener('click', () => dom.fileInput.click());
    
    dom.fileInput.addEventListener('change', (e) => {
      handleFiles(Array.from(e.target.files));
      dom.fileInput.value = '';
    });

    dom.createBtn.addEventListener('click', createAndDownloadZip);
    dom.resetBtn.addEventListener('click', resetTool);
  }

  async function handleFiles(newFiles) {
    if (!newFiles || newFiles.length === 0) return;

    for (const file of newFiles) {
      // Avoid duplicate names by appending index if needed
      let name = file.name;
      let counter = 1;
      while (filesList.some(f => f.name === name)) {
        const base = Utils.getBaseName(file.name);
        const ext = Utils.getExtension(file.name);
        name = `${base}_(${counter})${ext ? '.' + ext : ''}`;
        counter++;
      }

      filesList.push({
        file,
        name,
        size: file.size,
        type: file.type || 'application/octet-stream'
      });
    }

    dom.emptyState.classList.add('hidden');
    dom.workspace.classList.remove('hidden');

    renderList();
    Utils.showToast(`Added ${newFiles.length} file(s) to archive`, 'success');
  }

  function renderList() {
    if (!dom.fileList) return;
    dom.fileList.innerHTML = '';

    let totalBytes = 0;

    filesList.forEach((item, index) => {
      totalBytes += item.size;
      const row = document.createElement('div');
      row.className = 'reorder-item';
      
      const ext = (Utils.getExtension(item.name) || 'FILE').toUpperCase();

      row.innerHTML = `
        <div class="reorder-item-left">
          <span class="reorder-index-badge">${index + 1}</span>
          <div class="reorder-item-info">
            <span class="reorder-item-title" title="${item.name}">${item.name}</span>
            <span class="reorder-item-sub">${Utils.formatBytes(item.size)} &bull; ${ext}</span>
          </div>
        </div>
        <div class="reorder-item-actions">
          <button type="button" class="reorder-action-btn delete zipc-del-btn" data-index="${index}" title="Remove file">&times;</button>
        </div>
      `;

      row.querySelector('.zipc-del-btn').addEventListener('click', () => {
        removeFile(index);
      });

      dom.fileList.appendChild(row);
    });

    if (dom.fileCountBadge) dom.fileCountBadge.textContent = `${filesList.length} file(s)`;
    if (dom.totalSizeBadge) dom.totalSizeBadge.textContent = Utils.formatBytes(totalBytes);
  }

  function removeFile(index) {
    filesList.splice(index, 1);
    if (filesList.length === 0) {
      resetTool();
      return;
    }
    renderList();
  }

  async function createAndDownloadZip() {
    if (filesList.length === 0) {
      Utils.showToast('Please add at least one file to create a ZIP archive.', 'warning');
      return;
    }

    if (typeof JSZip === 'undefined') {
      Utils.showToast('JSZip engine is not loaded.', 'error');
      return;
    }

    let archiveName = (dom.archiveNameInput ? dom.archiveNameInput.value.trim() : '') || 'archive';
    if (!archiveName.toLowerCase().endsWith('.zip')) {
      archiveName += '.zip';
    }

    const compressionLevel = dom.compressLevelSelect ? dom.compressLevelSelect.value : 'DEFLATE';
    const compressLevelNum = compressionLevel === 'STORE' ? 0 : (compressionLevel === 'FAST' ? 1 : 6);

    Utils.setProcessing(true);
    showProgress(10, 'Compiling archive contents...');

    try {
      const zip = new JSZip();

      for (let i = 0; i < filesList.length; i++) {
        const item = filesList[i];
        const pct = Math.round(((i + 1) / filesList.length) * 60);
        showProgress(pct, `Adding (${i + 1}/${filesList.length}): ${item.name}`);
        zip.file(item.name, item.file);
      }

      showProgress(70, 'Compressing and packaging ZIP...');

      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: compressionLevel === 'STORE' ? 'STORE' : 'DEFLATE',
        compressionOptions: {
          level: compressLevelNum
        }
      }, (metadata) => {
        showProgress(Math.round(70 + (metadata.percent * 0.28)), `Generating ZIP: ${Math.round(metadata.percent)}%`);
      });

      showProgress(100, 'Archive generated!');
      setTimeout(hideProgress, 800);

      Utils.downloadBlob(zipBlob, archiveName);
      Utils.showToast(`ZIP Archive "${archiveName}" created successfully (${Utils.formatBytes(zipBlob.size)})!`, 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Failed to create ZIP: ' + err.message, 'error');
      hideProgress();
    } finally {
      Utils.setProcessing(false);
    }
  }

  function resetTool() {
    filesList = [];
    if (dom.emptyState) dom.emptyState.classList.remove('hidden');
    if (dom.workspace) dom.workspace.classList.add('hidden');
    if (dom.fileList) dom.fileList.innerHTML = '';
    if (dom.archiveNameInput) dom.archiveNameInput.value = 'archive.zip';
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

window.ZipCreator = ZipCreator;
