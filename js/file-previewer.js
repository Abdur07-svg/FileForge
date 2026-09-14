/**
 * FileForge - Universal File Previewer Tool
 * Renders instant in-memory previews for PDF multi-page docs, images, JSON, code, and text files.
 */

const FilePreviewer = (() => {
  let currentFile = null;
  let pdfDoc = null;
  let currentPdfPage = 1;
  let totalPdfPages = 1;
  let dom = {};

  function init() {
    dom = {
      container: document.getElementById('tool-file-previewer'),
      dropzone: document.getElementById('fprv-dropzone'),
      fileInput: document.getElementById('fprv-file-input'),
      browseBtn: document.getElementById('fprv-browse-btn'),
      workspace: document.getElementById('fprv-workspace'),
      emptyState: document.getElementById('fprv-empty-state'),
      
      // Header info
      fileNameText: document.getElementById('fprv-name'),
      fileSizeBadge: document.getElementById('fprv-size'),
      fileTypeBadge: document.getElementById('fprv-type'),
      
      // Preview Areas
      imageContainer: document.getElementById('fprv-image-area'),
      previewImg: document.getElementById('fprv-preview-img'),
      
      pdfContainer: document.getElementById('fprv-pdf-area'),
      pdfCanvas: document.getElementById('fprv-pdf-canvas'),
      pdfPrevBtn: document.getElementById('fprv-pdf-prev'),
      pdfNextBtn: document.getElementById('fprv-pdf-next'),
      pdfPageNumText: document.getElementById('fprv-pdf-page-num'),
      
      textContainer: document.getElementById('fprv-text-area'),
      textContent: document.getElementById('fprv-text-content'),
      
      // Actions
      downloadBtn: document.getElementById('fprv-download-btn'),
      resetBtn: document.getElementById('fprv-reset-btn')
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

    if (dom.pdfPrevBtn) {
      dom.pdfPrevBtn.addEventListener('click', () => {
        if (currentPdfPage > 1) {
          currentPdfPage--;
          renderPdfPage(currentPdfPage);
        }
      });
    }

    if (dom.pdfNextBtn) {
      dom.pdfNextBtn.addEventListener('click', () => {
        if (currentPdfPage < totalPdfPages) {
          currentPdfPage++;
          renderPdfPage(currentPdfPage);
        }
      });
    }

    if (dom.downloadBtn) {
      dom.downloadBtn.addEventListener('click', () => {
        if (currentFile) Utils.downloadBlob(currentFile, currentFile.name);
      });
    }

    if (dom.resetBtn) dom.resetBtn.addEventListener('click', resetTool);
  }

  async function handleFiles(files) {
    if (!files || files.length === 0) return;
    const file = files[0];
    currentFile = file;

    const ext = (Utils.getExtension(file.name) || '').toLowerCase();
    const isImage = file.type.startsWith('image/') || /^(jpg|jpeg|png|webp|gif|bmp|svg|ico)$/i.test(ext);
    const isPdf = file.type === 'application/pdf' || ext === 'pdf';
    const isText = file.type.startsWith('text/') || /^(txt|json|js|html|css|md|xml|csv|log|yaml|yml|py|ts|java|c|cpp|sql)$/i.test(ext);

    hideAllPreviewPanels();

    dom.emptyState.classList.add('hidden');
    dom.workspace.classList.remove('hidden');

    if (dom.fileNameText) dom.fileNameText.textContent = file.name;
    if (dom.fileSizeBadge) dom.fileSizeBadge.textContent = Utils.formatBytes(file.size);
    if (dom.fileTypeBadge) dom.fileTypeBadge.textContent = (ext || 'FILE').toUpperCase();

    Utils.setProcessing(true);

    try {
      if (isImage) {
        const dataUrl = await Utils.readFileAsDataURL(file);
        dom.previewImg.src = dataUrl;
        dom.imageContainer.classList.remove('hidden');
      } else if (isPdf) {
        if (window.pdfjsLib) {
          const arrayBuffer = await Utils.readFileAsArrayBuffer(file);
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          pdfDoc = pdf;
          totalPdfPages = pdf.numPages;
          currentPdfPage = 1;
          dom.pdfContainer.classList.remove('hidden');
          await renderPdfPage(currentPdfPage);
        } else {
          Utils.showToast('PDF.js engine is not available.', 'error');
        }
      } else if (isText) {
        const text = await Utils.readFileAsText(file);
        dom.textContent.textContent = text;
        dom.textContainer.classList.remove('hidden');
      } else {
        // Fallback for binary / other files: inspect as raw text preview or file info
        const text = await Utils.readFileAsText(file).catch(() => 'Binary file preview not available.');
        dom.textContent.textContent = text.slice(0, 5000);
        dom.textContainer.classList.remove('hidden');
      }
      Utils.showToast(`Previewing "${file.name}"`, 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Failed to preview file: ' + err.message, 'error');
    } finally {
      Utils.setProcessing(false);
    }
  }

  async function renderPdfPage(pageNum) {
    if (!pdfDoc || !dom.pdfCanvas) return;
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      dom.pdfCanvas.height = viewport.height;
      dom.pdfCanvas.width = viewport.width;

      const renderContext = {
        canvasContext: dom.pdfCanvas.getContext('2d'),
        viewport: viewport
      };

      await page.render(renderContext).promise;

      if (dom.pdfPageNumText) {
        dom.pdfPageNumText.textContent = `Page ${pageNum} of ${totalPdfPages}`;
      }
      if (dom.pdfPrevBtn) dom.pdfPrevBtn.disabled = pageNum <= 1;
      if (dom.pdfNextBtn) dom.pdfNextBtn.disabled = pageNum >= totalPdfPages;
    } catch (err) {
      console.error(err);
    }
  }

  function hideAllPreviewPanels() {
    if (dom.imageContainer) dom.imageContainer.classList.add('hidden');
    if (dom.pdfContainer) dom.pdfContainer.classList.add('hidden');
    if (dom.textContainer) dom.textContainer.classList.add('hidden');
    if (dom.previewImg) dom.previewImg.src = '';
    if (dom.textContent) dom.textContent.textContent = '';
  }

  function resetTool() {
    currentFile = null;
    pdfDoc = null;
    hideAllPreviewPanels();
    if (dom.emptyState) dom.emptyState.classList.remove('hidden');
    if (dom.workspace) dom.workspace.classList.add('hidden');
  }

  return {
    init,
    handleFiles,
    reset: resetTool
  };
})();

window.FilePreviewer = FilePreviewer;
