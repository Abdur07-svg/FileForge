/**
 * FileForge - PDF Rotate Tool
 * Rotate individual pages or all pages (90° CW, 90° CCW, 180°) with live thumbnail preview.
 */

const PDFRotator = (() => {
  let currentFile = null; // { file, name, size, buffer, pageCount }
  let pageRotations = []; // Array of { pageNum, currentAngle, appliedAngle, canvas, dataUrl }
  let generatedPdfBlob = null;

  let dom = {};

  function init() {
    dom = {
      container: document.getElementById('tool-pdf-rotate'),
      dropzone: document.getElementById('pr-dropzone'),
      fileInput: document.getElementById('pr-file-input'),
      browseBtn: document.getElementById('pr-browse-btn'),
      workspace: document.getElementById('pr-workspace'),
      emptyState: document.getElementById('pr-empty-state'),
      pagesGrid: document.getElementById('pr-pages-grid'),
      
      // Bulk Controls
      rotateAllCwBtn: document.getElementById('pr-rotate-all-cw'),
      rotateAllCcwBtn: document.getElementById('pr-rotate-all-ccw'),
      rotateAll180Btn: document.getElementById('pr-rotate-all-180'),
      resetAllBtn: document.getElementById('pr-reset-all'),
      
      // Actions
      applyBtn: document.getElementById('pr-apply-btn'),
      downloadBtn: document.getElementById('pr-download-btn'),
      resetBtn: document.getElementById('pr-reset-btn'),
      progressBar: document.getElementById('pr-progress-bar'),
      progressContainer: document.getElementById('pr-progress-container'),
      progressText: document.getElementById('pr-progress-text')
    };

    if (!dom.container) return;

    bindEvents();
  }

  function bindEvents() {
    Utils.setupDropZone(dom.dropzone, handleFiles, ['.pdf', 'application/pdf']);
    dom.browseBtn.addEventListener('click', () => dom.fileInput.click());
    dom.fileInput.addEventListener('change', (e) => {
      handleFiles(Array.from(e.target.files));
      dom.fileInput.value = '';
    });

    if (dom.rotateAllCwBtn) dom.rotateAllCwBtn.addEventListener('click', () => rotateAll(90));
    if (dom.rotateAllCcwBtn) dom.rotateAllCcwBtn.addEventListener('click', () => rotateAll(-90));
    if (dom.rotateAll180Btn) dom.rotateAll180Btn.addEventListener('click', () => rotateAll(180));
    if (dom.resetAllBtn) dom.resetAllBtn.addEventListener('click', resetAllAngles);

    dom.applyBtn.addEventListener('click', generateRotatedPDF);
    dom.downloadBtn.addEventListener('click', downloadRotatedPDF);
    dom.resetBtn.addEventListener('click', resetTool);
  }

  async function handleFiles(files) {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      const ext = Utils.getExtension(file.name);
      if (/^(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(ext) || file.type.startsWith('image/')) {
        Utils.showToast(`You uploaded an image file ("${file.name}"). PDF Rotate only accepts PDF documents.`, 'warning');
      } else {
        Utils.showToast(`Invalid file format ("${file.name}"). Please upload a valid PDF document.`, 'warning');
      }
      return;
    }

    Utils.setProcessing(true);
    showProgress(15, 'Loading PDF document...');

    try {
      const buffer = await Utils.readFileAsArrayBuffer(file);
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)) });
      const pdf = await loadingTask.promise;
      const pageCount = pdf.numPages;

      currentFile = {
        file,
        name: file.name,
        size: file.size,
        buffer,
        pageCount,
        pdf
      };

      pageRotations = [];
      for (let i = 1; i <= pageCount; i++) {
        pageRotations.push({
          pageNum: i,
          additionalAngle: 0,
          dataUrl: null
        });
      }

      dom.emptyState.classList.add('hidden');
      dom.workspace.classList.remove('hidden');
      dom.downloadBtn.classList.add('hidden');
      dom.applyBtn.classList.remove('hidden');
      dom.applyBtn.disabled = false;

      await renderThumbnails();
      Utils.showToast(`Loaded "${file.name}" (${pageCount} pages). Rotate individual pages or all pages.`, 'info');
    } catch (err) {
      console.error(err);
      Utils.showToast('Failed to load PDF: ' + (err.message || 'Corrupted file'), 'error');
      resetTool();
    } finally {
      Utils.setProcessing(false);
      hideProgress();
    }
  }

  async function renderThumbnails() {
    if (!currentFile || !currentFile.pdf) return;
    dom.pagesGrid.innerHTML = '';
    const pdf = currentFile.pdf;
    const total = currentFile.pageCount;

    for (let i = 1; i <= total; i++) {
      showProgress(20 + Math.round((i / total) * 70), `Rendering page thumbnail ${i} of ${total}...`);
      await yieldToUI();

      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 0.35 });

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport }).promise;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      pageRotations[i - 1].dataUrl = dataUrl;

      createPageCard(i, dataUrl);
    }
    hideProgress();
  }

  function createPageCard(pageNum, dataUrl) {
    const card = document.createElement('div');
    card.className = 'page-thumbnail-card';
    card.id = `pr-page-card-${pageNum}`;

    card.innerHTML = `
      <div class="page-thumb-preview-wrap">
        <img id="pr-thumb-img-${pageNum}" src="${dataUrl}" alt="Page ${pageNum}" class="page-thumb-img">
        <span id="pr-angle-badge-${pageNum}" class="page-rotation-badge hidden">0°</span>
      </div>
      <div class="page-thumb-footer">
        <span class="page-thumb-num">Page ${pageNum}</span>
        <div class="page-thumb-btn-group">
          <button type="button" class="btn-icon-xs pr-cw-btn" data-page="${pageNum}" title="Rotate 90° Clockwise">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
          </button>
          <button type="button" class="btn-icon-xs pr-ccw-btn" data-page="${pageNum}" title="Rotate 90° Counter-Clockwise">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2.5 2v6h6M2.66 15.57a10 10 0 1 0 .57-8.38L-2.44 1.52"/></svg>
          </button>
        </div>
      </div>
    `;

    card.querySelector('.pr-cw-btn').addEventListener('click', () => rotateSinglePage(pageNum, 90));
    card.querySelector('.pr-ccw-btn').addEventListener('click', () => rotateSinglePage(pageNum, -90));

    dom.pagesGrid.appendChild(card);
  }

  function rotateSinglePage(pageNum, delta) {
    const item = pageRotations[pageNum - 1];
    if (!item) return;

    item.additionalAngle = (item.additionalAngle + delta) % 360;
    if (item.additionalAngle < 0) item.additionalAngle += 360;

    updatePageVisual(pageNum, item.additionalAngle);
  }

  function rotateAll(delta) {
    pageRotations.forEach((item, idx) => {
      item.additionalAngle = (item.additionalAngle + delta) % 360;
      if (item.additionalAngle < 0) item.additionalAngle += 360;
      updatePageVisual(idx + 1, item.additionalAngle);
    });
    Utils.showToast(`Rotated all pages by ${delta > 0 ? '+' : ''}${delta}°.`, 'info');
  }

  function resetAllAngles() {
    pageRotations.forEach((item, idx) => {
      item.additionalAngle = 0;
      updatePageVisual(idx + 1, 0);
    });
    Utils.showToast('Reset all page rotations.', 'info');
  }

  function updatePageVisual(pageNum, angle) {
    const img = document.getElementById(`pr-thumb-img-${pageNum}`);
    const badge = document.getElementById(`pr-angle-badge-${pageNum}`);
    if (img) {
      img.style.transform = `rotate(${angle}deg)`;
      img.style.transition = 'transform 0.3s ease';
    }
    if (badge) {
      if (angle !== 0) {
        badge.textContent = `${angle}°`;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  }

  async function generateRotatedPDF() {
    if (!currentFile) return;

    const hasRotations = pageRotations.some(p => p.additionalAngle !== 0);
    if (!hasRotations) {
      Utils.showToast('Please rotate at least one page before applying.', 'warning');
      return;
    }

    Utils.setProcessing(true);
    showProgress(25, 'Applying rotations to PDF pages...');

    try {
      const srcDoc = await PDFLib.PDFDocument.load(currentFile.buffer, { ignoreEncryption: true });
      const pages = srcDoc.getPages();

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const rotItem = pageRotations[i];
        if (rotItem && rotItem.additionalAngle !== 0) {
          const currentRotation = page.getRotation().angle || 0;
          const newRotation = (currentRotation + rotItem.additionalAngle) % 360;
          page.setRotation(PDFLib.degrees(newRotation));
        }
      }

      showProgress(80, 'Saving rotated PDF document...');
      const finalPdfBytes = await srcDoc.save({ useObjectStreams: true });
      generatedPdfBlob = new Blob([finalPdfBytes], { type: 'application/pdf' });

      dom.applyBtn.classList.add('hidden');
      dom.downloadBtn.classList.remove('hidden');
      dom.downloadBtn.disabled = false;

      Utils.showToast('PDF rotated successfully! Ready to download.', 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Error rotating PDF: ' + err.message, 'error');
    } finally {
      Utils.setProcessing(false);
      hideProgress();
    }
  }

  function downloadRotatedPDF() {
    if (!generatedPdfBlob || !currentFile) return;
    const base = Utils.getBaseName(currentFile.name);
    Utils.downloadBlob(generatedPdfBlob, `${base}-rotated.pdf`);
  }

  function resetTool() {
    currentFile = null;
    pageRotations = [];
    generatedPdfBlob = null;

    if (dom.emptyState) dom.emptyState.classList.remove('hidden');
    if (dom.workspace) dom.workspace.classList.add('hidden');
    if (dom.pagesGrid) dom.pagesGrid.innerHTML = '';
    if (dom.downloadBtn) dom.downloadBtn.classList.add('hidden');
    if (dom.applyBtn) {
      dom.applyBtn.classList.remove('hidden');
      dom.applyBtn.disabled = true;
    }

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

window.PDFRotator = PDFRotator;
