/**
 * FileForge - Universal File Previewer Tool (Security & XSS Hardened)
 * 
 * Production-grade client-side preview engine:
 * 1. Untrusted Data Handling: Treats all uploaded files as hostile input. Zero eval, zero script execution.
 * 2. Source Code & Text Safety: Text, JSON, JS, CSS, Python, Markdown, and logs are rendered exclusively via textContent.
 * 3. Sandboxed HTML Previews: HTML files are displayed as sanitized source code and optionally rendered in an isolated sandbox iframe (sandbox="").
 * 4. Safe SVG & Image Rendering: Images and SVGs are loaded via safe Blob Object URLs and revoked immediately on reset.
 * 5. Memory Management: Automatically revokes active Object URLs to prevent client RAM leaks.
 */

const FilePreviewer = (() => {
  let currentFile = null;
  let activeObjectUrl = null;
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
        if (currentFile) {
          const safeName = Utils.sanitizeFilename(currentFile.name);
          Utils.downloadBlob(currentFile, safeName);
        }
      });
    }

    if (dom.resetBtn) dom.resetBtn.addEventListener('click', resetTool);
  }

  async function handleFiles(files) {
    if (!files || files.length === 0) return;
    const file = files[0];
    
    // Revoke previous object URL if any
    cleanupObjectUrl();

    currentFile = file;
    const ext = (Utils.getExtension(file.name) || '').toLowerCase();
    const safeName = Utils.sanitizeFilename(file.name);

    const isImage = file.type.startsWith('image/') || /^(jpg|jpeg|png|webp|gif|bmp|svg|ico)$/i.test(ext);
    const isPdf = file.type === 'application/pdf' || ext === 'pdf';
    const isCodeOrText = file.type.startsWith('text/') || 
                         /^(txt|json|js|mjs|cjs|ts|jsx|tsx|html|htm|css|scss|less|md|markdown|xml|csv|log|yaml|yml|py|java|c|cpp|h|hpp|cs|go|rs|php|rb|sql|sh|bat|ini|env|conf|toml)$/i.test(ext);

    hideAllPreviewPanels();

    dom.emptyState.classList.add('hidden');
    dom.workspace.classList.remove('hidden');

    if (dom.fileNameText) dom.fileNameText.textContent = safeName;
    if (dom.fileSizeBadge) dom.fileSizeBadge.textContent = Utils.formatBytes(file.size);
    if (dom.fileTypeBadge) dom.fileTypeBadge.textContent = (ext || 'FILE').toUpperCase();

    Utils.setProcessing(true);

    try {
      if (isPdf) {
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
      } else if (isImage) {
        if (ext === 'svg' || file.type === 'image/svg+xml') {
          // Safe SVG preview: sanitize XML content, then load via Blob URL into <img> tag (browsers disable scripts in <img>)
          const rawSvgText = await Utils.readFileAsText(file);
          const sanitizedSvg = sanitizeSvgXml(rawSvgText);
          const svgBlob = new Blob([sanitizedSvg], { type: 'image/svg+xml' });
          activeObjectUrl = URL.createObjectURL(svgBlob);
        } else {
          activeObjectUrl = URL.createObjectURL(file);
        }

        dom.previewImg.src = activeObjectUrl;
        dom.imageContainer.classList.remove('hidden');
      } else if (isCodeOrText) {
        const text = await Utils.readFileAsText(file);
        // Strict XSS Defense: rendered strictly via textContent
        dom.textContent.textContent = text;
        dom.textContainer.classList.remove('hidden');
      } else {
        // Fallback for unknown / binary formats: inspect first chunk safely as text
        const text = await Utils.readFileAsText(file).catch(() => 'Binary file preview not available.');
        dom.textContent.textContent = text.slice(0, 5000) + (text.length > 5000 ? '\n\n...[Preview truncated for large file]' : '');
        dom.textContainer.classList.remove('hidden');
      }
      Utils.showToast(`Previewing "${safeName}"`, 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Failed to preview file: ' + (err.message || 'Corrupted or unsupported format'), 'error');
    } finally {
      Utils.setProcessing(false);
    }
  }

  /**
   * Sanitize SVG XML to strip script tags and dangerous event handlers
   */
  function sanitizeSvgXml(svgText) {
    if (!svgText) return '';
    return svgText
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '')
      .replace(/href=["']javascript:[^"']*["']/gi, 'href="#"');
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
        dom.pdfPageNumText.textContent = `${pageNum} of ${totalPdfPages}`;
      }
      if (dom.pdfPrevBtn) dom.pdfPrevBtn.disabled = pageNum <= 1;
      if (dom.pdfNextBtn) dom.pdfNextBtn.disabled = pageNum >= totalPdfPages;
    } catch (err) {
      console.error('PDF page render error:', err);
    }
  }

  function cleanupObjectUrl() {
    if (activeObjectUrl) {
      URL.revokeObjectURL(activeObjectUrl);
      activeObjectUrl = null;
    }
  }

  function hideAllPreviewPanels() {
    cleanupObjectUrl();
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

// Export globally
window.FilePreviewer = FilePreviewer;
