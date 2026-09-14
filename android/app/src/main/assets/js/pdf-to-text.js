/**
 * FileForge - PDF to Text Tool
 * Extract clean, searchable text from PDF documents with instant copy & .txt download.
 */

const PDFToText = (() => {
  let currentFile = null; // { file, name, size, buffer, pageCount }
  let extractedFullText = '';

  let dom = {};

  function init() {
    dom = {
      container: document.getElementById('tool-pdf-to-text'),
      dropzone: document.getElementById('ptt-dropzone'),
      fileInput: document.getElementById('ptt-file-input'),
      browseBtn: document.getElementById('ptt-browse-btn'),
      workspace: document.getElementById('ptt-workspace'),
      emptyState: document.getElementById('ptt-empty-state'),
      
      // Text Output & Stats
      textArea: document.getElementById('ptt-text-area'),
      charCountText: document.getElementById('ptt-char-count'),
      wordCountText: document.getElementById('ptt-word-count'),
      pageCountText: document.getElementById('ptt-page-count'),
      
      // Options
      includePageHeaders: document.getElementById('ptt-page-headers'),
      
      // Actions
      copyBtn: document.getElementById('ptt-copy-btn'),
      downloadBtn: document.getElementById('ptt-download-btn'),
      resetBtn: document.getElementById('ptt-reset-btn'),
      progressBar: document.getElementById('ptt-progress-bar'),
      progressContainer: document.getElementById('ptt-progress-container'),
      progressText: document.getElementById('ptt-progress-text')
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

    if (dom.includePageHeaders) {
      dom.includePageHeaders.addEventListener('change', () => {
        if (currentFile) extractTextFromPDF();
      });
    }

    dom.copyBtn.addEventListener('click', copyTextToClipboard);
    dom.downloadBtn.addEventListener('click', downloadAsTxt);
    dom.resetBtn.addEventListener('click', resetTool);
  }

  async function handleFiles(files) {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      const ext = Utils.getExtension(file.name);
      if (/^(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(ext) || file.type.startsWith('image/')) {
        Utils.showToast(`You uploaded an image file ("${file.name}"). PDF to Text only extracts text from PDF documents.`, 'warning');
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

      dom.emptyState.classList.add('hidden');
      dom.workspace.classList.remove('hidden');

      await extractTextFromPDF();
    } catch (err) {
      console.error(err);
      Utils.showToast('Failed to extract text: ' + err.message, 'error');
      resetTool();
    } finally {
      Utils.setProcessing(false);
      hideProgress();
    }
  }

  async function extractTextFromPDF() {
    if (!currentFile || !currentFile.pdf) return;
    const pdf = currentFile.pdf;
    const total = currentFile.pageCount;
    const withHeaders = dom.includePageHeaders ? dom.includePageHeaders.checked : true;

    let textChunks = [];

    for (let i = 1; i <= total; i++) {
      showProgress(20 + Math.round((i / total) * 75), `Extracting text from page ${i} of ${total}...`);
      await yieldToUI();

      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      let lastY = null;
      let pageText = '';

      for (const item of textContent.items) {
        if (!item.str) continue;
        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
          pageText += '\n';
        } else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
          pageText += ' ';
        }
        pageText += item.str;
        lastY = item.transform[5];
      }

      if (withHeaders) {
        textChunks.push(`--- Page ${i} ---\n` + pageText.trim());
      } else {
        textChunks.push(pageText.trim());
      }
    }

    extractedFullText = textChunks.join('\n\n').trim();
    dom.textArea.value = extractedFullText;

    // Calculate stats
    const charCount = extractedFullText.length;
    const wordCount = extractedFullText ? (extractedFullText.match(/\S+/g) || []).length : 0;

    if (dom.charCountText) dom.charCountText.textContent = `${charCount.toLocaleString()} chars`;
    if (dom.wordCountText) dom.wordCountText.textContent = `${wordCount.toLocaleString()} words`;
    if (dom.pageCountText) dom.pageCountText.textContent = `${total} pages`;

    hideProgress();
    if (wordCount === 0) {
      Utils.showToast('No selectable text found. This PDF may contain scanned images.', 'warning');
    } else {
      Utils.showToast(`Extracted ${wordCount.toLocaleString()} words from ${total} pages!`, 'success');
    }
  }

  function copyTextToClipboard() {
    if (!extractedFullText) {
      Utils.showToast('No text available to copy.', 'warning');
      return;
    }

    navigator.clipboard.writeText(extractedFullText).then(() => {
      Utils.showToast('Text copied to clipboard! 📋', 'success');
    }).catch(() => {
      dom.textArea.select();
      document.execCommand('copy');
      Utils.showToast('Text copied to clipboard!', 'success');
    });
  }

  function downloadAsTxt() {
    if (!extractedFullText || !currentFile) return;
    const base = Utils.getBaseName(currentFile.name);
    const blob = new Blob([extractedFullText], { type: 'text/plain;charset=utf-8' });
    Utils.downloadBlob(blob, `${base}-extracted.txt`);
  }

  function resetTool() {
    currentFile = null;
    extractedFullText = '';

    if (dom.textArea) dom.textArea.value = '';
    if (dom.emptyState) dom.emptyState.classList.remove('hidden');
    if (dom.workspace) dom.workspace.classList.add('hidden');
    if (dom.charCountText) dom.charCountText.textContent = '0 chars';
    if (dom.wordCountText) dom.wordCountText.textContent = '0 words';
    if (dom.pageCountText) dom.pageCountText.textContent = '-';

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

window.PDFToText = PDFToText;
