/**
 * FileForge - Batch File Processor & Bundler
 * 
 * Production-grade batch execution engine:
 * 1. Controlled concurrency (limited to 2 concurrent tasks) to prevent mobile browser memory crashes.
 * 2. Per-item status tracking: Pending, Processing, Completed, Failed.
 * 3. Fault-tolerant: One failed/corrupted file does not abort the batch; remaining items continue processing.
 * 4. Filename sanitization & deduplication to prevent path traversal and collision.
 * 5. Memory safety: Immediate canvas and object cleanup after each item.
 * 6. ZIP packaging of successfully processed files only with comprehensive summary metrics.
 */

const BatchProcessor = (() => {
  let batchQueue = []; // { id, file, name, size, type, status, errorMsg, resultBlob, resultName }
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
      const safeName = Utils.sanitizeFilename(file.name);
      batchQueue.push({
        id: 'bitem_' + Math.random().toString(36).substring(2, 9),
        file,
        name: safeName,
        size: file.size,
        type: file.type || 'application/octet-stream',
        status: 'pending',
        errorMsg: null,
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

      let statusBadge = '<span class="badge badge-neutral">Queued</span>';
      if (item.status === 'done') {
        statusBadge = '<span class="badge badge-success">Completed</span>';
      } else if (item.status === 'processing') {
        statusBadge = '<span class="badge badge-info">Processing...</span>';
      } else if (item.status === 'failed') {
        statusBadge = `<span class="badge badge-error" title="${Utils.escapeHtml(item.errorMsg || 'Failed')}">Failed</span>`;
      }

      const escapedName = Utils.escapeHtml(item.name);
      const subInfo = item.status === 'failed' && item.errorMsg
        ? `<span style="color: var(--color-danger, #ef4444); font-size: 0.78rem;">${Utils.escapeHtml(item.errorMsg)}</span>`
        : `${Utils.formatBytes(item.size)} &bull; ${statusBadge}`;

      row.innerHTML = `
        <div class="reorder-item-left">
          <span class="reorder-index-badge">${index + 1}</span>
          <div class="reorder-item-info">
            <span class="reorder-item-title" title="${escapedName}">${escapedName}</span>
            <span class="reorder-item-sub">${subInfo}</span>
          </div>
        </div>
        <div class="reorder-item-actions">
          ${item.resultBlob ? `<button type="button" class="btn btn-xs btn-primary bprc-dl-single" data-id="${item.id}">Download</button>` : ''}
          <button type="button" class="reorder-action-btn delete bprc-del-btn" data-id="${item.id}" title="Remove">&times;</button>
        </div>
      `;

      const dlBtn = row.querySelector('.bprc-dl-single');
      if (dlBtn) {
        dlBtn.addEventListener('click', () => {
          Utils.downloadBlob(item.resultBlob, item.resultName || item.name);
        });
      }

      row.querySelector('.bprc-del-btn').addEventListener('click', () => {
        const itemIdx = batchQueue.findIndex(q => q.id === item.id);
        if (itemIdx !== -1) {
          batchQueue.splice(itemIdx, 1);
          if (batchQueue.length === 0) resetTool();
          else renderQueue();
        }
      });

      dom.queueList.appendChild(row);
    });

    if (dom.queueCountBadge) dom.queueCountBadge.textContent = `${batchQueue.length} files`;
    if (dom.totalSizeBadge) dom.totalSizeBadge.textContent = Utils.formatBytes(totalBytes);
  }

  /**
   * Process batch with concurrency = 2 to balance speed and mobile memory constraints
   */
  async function processBatch() {
    if (batchQueue.length === 0) return;

    const action = dom.actionSelect ? dom.actionSelect.value : 'zip';
    const quality = dom.qualitySlider ? parseInt(dom.qualitySlider.value, 10) / 100 : 0.8;

    Utils.setProcessing(true);
    if (dom.processBtn) dom.processBtn.disabled = true;
    showProgress(5, 'Starting batch processing...');

    let completedCount = 0;
    let failedCount = 0;
    const total = batchQueue.length;

    // Concurrency limit
    const CONCURRENCY = 2;
    let nextIdx = 0;

    async function processNext() {
      while (nextIdx < total) {
        const i = nextIdx++;
        const item = batchQueue[i];
        item.status = 'processing';
        renderQueue();

        const progressPct = Math.round(((completedCount + failedCount + 1) / total) * 90);
        showProgress(progressPct, `Processing (${completedCount + failedCount + 1}/${total}): ${item.name}`);

        try {
          if (action === 'zip') {
            item.status = 'done';
            item.resultBlob = item.file;
            item.resultName = item.name;
            completedCount++;
          } else if (action === 'compress-images') {
            if (!item.file.type.startsWith('image/') && !/\.(jpg|jpeg|png|webp|bmp)$/i.test(item.name)) {
              throw new Error('Not a supported image file for compression');
            }
            const blob = await compressSingleImage(item.file, quality);
            item.status = 'done';
            item.resultBlob = blob;
            item.resultName = `${Utils.getBaseName(item.name)}-compressed.jpg`;
            completedCount++;
          } else if (action === 'to-png') {
            if (!item.file.type.startsWith('image/') && !/\.(jpg|jpeg|png|webp|bmp|svg)$/i.test(item.name)) {
              throw new Error('Not a supported image file for PNG conversion');
            }
            const blob = await convertToPng(item.file);
            item.status = 'done';
            item.resultBlob = blob;
            item.resultName = `${Utils.getBaseName(item.name)}.png`;
            completedCount++;
          }
        } catch (err) {
          console.warn(`Batch item error (${item.name}):`, err);
          item.status = 'failed';
          item.errorMsg = err.message || 'Processing failed';
          item.resultBlob = null;
          failedCount++;
        }

        await yieldToUI();
      }
    }

    const workers = [];
    for (let w = 0; w < Math.min(CONCURRENCY, total); w++) {
      workers.push(processNext());
    }
    await Promise.all(workers);

    renderQueue();
    if (dom.processBtn) dom.processBtn.disabled = false;
    Utils.setProcessing(false);

    const hasSuccessful = batchQueue.some(item => item.status === 'done' && item.resultBlob);
    if (dom.downloadZipBtn) {
      dom.downloadZipBtn.classList.toggle('hidden', !hasSuccessful);
    }

    showProgress(100, `Batch completed: ${completedCount} successful, ${failedCount} failed.`);
    setTimeout(hideProgress, 1200);

    if (failedCount === 0) {
      Utils.showToast(`Batch completed successfully! All ${completedCount} file(s) ready.`, 'success');
    } else if (completedCount > 0) {
      Utils.showToast(`Batch finished with ${completedCount} success and ${failedCount} failed item(s).`, 'warning');
    } else {
      Utils.showToast(`Batch processing failed for all ${failedCount} item(s). Please verify file formats.`, 'error');
    }
  }

  async function compressSingleImage(file, quality) {
    const dataUrl = await Utils.readFileAsDataURL(file);
    const img = await Utils.loadImage(dataUrl);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    const blob = await Utils.canvasToBlob(canvas, 'image/jpeg', quality);
    canvas.width = 1;
    canvas.height = 1;
    return blob;
  }

  async function convertToPng(file) {
    const dataUrl = await Utils.readFileAsDataURL(file);
    const img = await Utils.loadImage(dataUrl);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const blob = await Utils.canvasToBlob(canvas, 'image/png');
    canvas.width = 1;
    canvas.height = 1;
    return blob;
  }

  async function downloadAllAsZip() {
    const successfulItems = batchQueue.filter(item => item.status === 'done' && item.resultBlob);
    if (successfulItems.length === 0) {
      Utils.showToast('No successfully processed files to download.', 'warning');
      return;
    }

    if (typeof JSZip === 'undefined') {
      Utils.showToast('JSZip engine not loaded.', 'error');
      return;
    }

    Utils.setProcessing(true);
    showProgress(30, 'Packaging successfully processed files into ZIP...');

    try {
      const zip = new JSZip();
      const usedNames = new Set();

      successfulItems.forEach((item, index) => {
        let name = Utils.sanitizeFilename(item.resultName || item.name);
        
        // Handle name collision
        if (usedNames.has(name.toLowerCase())) {
          const base = Utils.getBaseName(name);
          const ext = Utils.getExtension(name);
          name = `${base}_${index + 1}.${ext}`;
        }
        usedNames.add(name.toLowerCase());

        zip.file(name, item.resultBlob);
      });

      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      }, (meta) => {
        showProgress(Math.round(30 + meta.percent * 0.65), `Packaging ZIP: ${Math.round(meta.percent)}%`);
      });

      Utils.downloadBlob(zipBlob, 'fileforge-batch-bundle.zip');
      showProgress(100, 'Downloaded ZIP package!');
      setTimeout(hideProgress, 800);
      Utils.showToast(`Downloaded ${successfulItems.length} file(s) in ZIP (${Utils.formatBytes(zipBlob.size)})!`, 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('ZIP packaging error: ' + err.message, 'error');
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
    if (dom.processBtn) dom.processBtn.disabled = false;
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

  function yieldToUI() {
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  return {
    init,
    handleFiles,
    reset: resetTool
  };
})();

// Export globally
window.BatchProcessor = BatchProcessor;
