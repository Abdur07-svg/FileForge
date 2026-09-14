/**
 * FileForge - Batch File Processor & Bundler
 * Multi-file batch queue for converting, compressing, renaming, and bundling all documents as ZIP.
 */

const BatchProcessor = (() => {
  let batchQueue = []; // { file, name, size, type, status, resultBlob }
  let dom = {};

  function init() {
    dom = {
      container: document.getElementById('tool-batch-processor'),
      dropzone: document.getElementById('bprc-dropzone'),
      fileInput: document.getElementById('bprc-file-input'),
      browseBtn: document.getElementById('bprc-browse-btn'),
      workspace: document.getElementById('bprc-workspace'),
      emptyState: document.getElementById('bprc-empty-state'),
      
      // Controls
      actionSelect: document.getElementById('bprc-action'),
      qualityRow: document.getElementById('bprc-quality-row'),
      qualitySlider: document.getElementById('bprc-quality'),
      qualityVal: document.getElementById('bprc-quality-val'),
      
      // Queue & Summary
      queueList: document.getElementById('bprc-queue-list'),
      queueCountBadge: document.getElementById('bprc-count'),
      totalSizeBadge: document.getElementById('bprc-size'),
      
      // Actions
      processBtn: document.getElementById('bprc-process-btn'),
      downloadZipBtn: document.getElementById('bprc-download-zip-btn'),
      resetBtn: document.getElementById('bprc-reset-btn'),
      progressBar: document.getElementById('bprc-progress-bar'),
      progressContainer: document.getElementById('bprc-progress-container'),
      progressText: document.getElementById('bprc-progress-text')
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

    if (dom.actionSelect) {
      dom.actionSelect.addEventListener('change', () => {
        const action = dom.actionSelect.value;
        if (action.includes('compress') || action.includes('image')) {
          if (dom.qualityRow) dom.qualityRow.classList.remove('hidden');
        } else {
          if (dom.qualityRow) dom.qualityRow.classList.add('hidden');
        }
      });
    }

    if (dom.qualitySlider) {
      dom.qualitySlider.addEventListener('input', (e) => {
        if (dom.qualityVal) dom.qualityVal.textContent = e.target.value + '%';
      });
    }

    if (dom.processBtn) dom.processBtn.addEventListener('click', processBatch);
    if (dom.downloadZipBtn) dom.downloadZipBtn.addEventListener('click', downloadAllAsZip);
    if (dom.resetBtn) dom.resetBtn.addEventListener('click', resetTool);
  }

  function handleFiles(files) {
    if (!files || files.length === 0) return;

    for (const file of files) {
      batchQueue.push({
        file,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        status: 'pending',
        resultBlob: null,
        resultName: null
      });
    }

    dom.emptyState.classList.add('hidden');
    dom.workspace.classList.remove('hidden');

    renderQueue();
    Utils.showToast(`Added ${files.length} file(s) to batch queue`, 'success');
  }

  function renderQueue() {
    if (!dom.queueList) return;
    dom.queueList.innerHTML = '';

    let totalBytes = 0;

    batchQueue.forEach((item, index) => {
      totalBytes += item.size;
      const row = document.createElement('div');
      row.className = 'reorder-item';

      const statusBadge = item.status === 'done'
        ? '<span class="badge badge-success">Processed</span>'
        : (item.status === 'processing'
          ? '<span class="badge badge-info">Processing...</span>'
          : '<span class="badge badge-neutral">Queued</span>');

      row.innerHTML = `
        <div class="reorder-item-left">
          <span class="reorder-index-badge">${index + 1}</span>
          <div class="reorder-item-info">
            <span class="reorder-item-title" title="${item.name}">${item.name}</span>
            <span class="reorder-item-sub">${Utils.formatBytes(item.size)} &bull; ${statusBadge}</span>
          </div>
        </div>
        <div class="reorder-item-actions">
          ${item.resultBlob ? `<button type="button" class="btn btn-xs btn-primary bprc-dl-single" data-index="${index}">Download</button>` : ''}
          <button type="button" class="reorder-action-btn delete bprc-del-btn" data-index="${index}" title="Remove">&times;</button>
        </div>
      `;

      const dlBtn = row.querySelector('.bprc-dl-single');
      if (dlBtn) {
        dlBtn.addEventListener('click', () => {
          Utils.downloadBlob(item.resultBlob, item.resultName || item.name);
        });
      }

      row.querySelector('.bprc-del-btn').addEventListener('click', () => {
        batchQueue.splice(index, 1);
        if (batchQueue.length === 0) resetTool();
        else renderQueue();
      });

      dom.queueList.appendChild(row);
    });

    if (dom.queueCountBadge) dom.queueCountBadge.textContent = `${batchQueue.length} files`;
    if (dom.totalSizeBadge) dom.totalSizeBadge.textContent = Utils.formatBytes(totalBytes);
  }

  async function processBatch() {
    if (batchQueue.length === 0) return;

    const action = dom.actionSelect ? dom.actionSelect.value : 'zip';
    const quality = dom.qualitySlider ? parseInt(dom.qualitySlider.value, 10) / 100 : 0.8;

    Utils.setProcessing(true);
    showProgress(10, 'Processing batch items...');

    try {
      if (action === 'zip') {
        // Direct ZIP packaging
        for (let i = 0; i < batchQueue.length; i++) {
          batchQueue[i].status = 'done';
          batchQueue[i].resultBlob = batchQueue[i].file;
          batchQueue[i].resultName = batchQueue[i].name;
        }
        await downloadAllAsZip();
      } else if (action === 'compress-images') {
        for (let i = 0; i < batchQueue.length; i++) {
          const item = batchQueue[i];
          const pct = Math.round(((i + 1) / batchQueue.length) * 90);
          showProgress(pct, `Compressing image (${i + 1}/${batchQueue.length}): ${item.name}`);

          if (item.file.type.startsWith('image/')) {
            try {
              const dataUrl = await Utils.readFileAsDataURL(item.file);
              const img = await Utils.loadImage(dataUrl);
              const canvas = document.createElement('canvas');
              canvas.width = img.naturalWidth;
              canvas.height = img.naturalHeight;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);

              const blob = await Utils.canvasToBlob(canvas, 'image/jpeg', quality);
              item.status = 'done';
              item.resultBlob = blob;
              item.resultName = `${Utils.getBaseName(item.name)}-compressed.jpg`;
            } catch (err) {
              item.status = 'done';
              item.resultBlob = item.file;
              item.resultName = item.name;
            }
          } else {
            item.status = 'done';
            item.resultBlob = item.file;
            item.resultName = item.name;
          }
        }
      } else if (action === 'to-png') {
        for (let i = 0; i < batchQueue.length; i++) {
          const item = batchQueue[i];
          if (item.file.type.startsWith('image/')) {
            try {
              const dataUrl = await Utils.readFileAsDataURL(item.file);
              const img = await Utils.loadImage(dataUrl);
              const canvas = document.createElement('canvas');
              canvas.width = img.naturalWidth;
              canvas.height = img.naturalHeight;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);
              const blob = await Utils.canvasToBlob(canvas, 'image/png');
              item.status = 'done';
              item.resultBlob = blob;
              item.resultName = `${Utils.getBaseName(item.name)}.png`;
            } catch (err) {
              item.status = 'done';
              item.resultBlob = item.file;
              item.resultName = item.name;
            }
          } else {
            item.status = 'done';
            item.resultBlob = item.file;
            item.resultName = item.name;
          }
        }
      }

      renderQueue();
      if (dom.downloadZipBtn) dom.downloadZipBtn.classList.remove('hidden');
      showProgress(100, 'Batch processing complete!');
      setTimeout(hideProgress, 800);
      Utils.showToast(`Batch completed ${batchQueue.length} file(s)!`, 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Batch error: ' + err.message, 'error');
      hideProgress();
    } finally {
      Utils.setProcessing(false);
    }
  }

  async function downloadAllAsZip() {
    if (batchQueue.length === 0) return;
    if (typeof JSZip === 'undefined') {
      Utils.showToast('JSZip engine not loaded.', 'error');
      return;
    }

    Utils.setProcessing(true);
    showProgress(30, 'Packaging all files into ZIP archive...');

    try {
      const zip = new JSZip();
      batchQueue.forEach(item => {
        const blob = item.resultBlob || item.file;
        const name = item.resultName || item.name;
        zip.file(name, blob);
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' }, (meta) => {
        showProgress(Math.round(30 + meta.percent * 0.65), `Packaging: ${Math.round(meta.percent)}%`);
      });

      Utils.downloadBlob(zipBlob, 'fileforge-batch-bundle.zip');
      showProgress(100, 'Downloaded ZIP!');
      setTimeout(hideProgress, 800);
      Utils.showToast(`Downloaded batch bundle (${Utils.formatBytes(zipBlob.size)})!`, 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('ZIP generation failed: ' + err.message, 'error');
      hideProgress();
    } finally {
      Utils.setProcessing(false);
    }
  }

  function resetTool() {
    batchQueue = [];
    if (dom.emptyState) dom.emptyState.classList.remove('hidden');
    if (dom.workspace) dom.workspace.classList.add('hidden');
    if (dom.downloadZipBtn) dom.downloadZipBtn.classList.add('hidden');
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

window.BatchProcessor = BatchProcessor;
