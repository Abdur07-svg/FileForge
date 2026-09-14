/**
 * FileForge - PDF Metadata Editor Tool
 * View, edit, or strip PDF document properties (Title, Author, Subject, Keywords, Creator, Producer).
 */

const PDFMetadataEditor = (() => {
  let currentFile = null; // { file, name, size, buffer, pageCount }
  let editedPdfBlob = null;

  let dom = {};

  function init() {
    dom = {
      container: document.getElementById('tool-pdf-metadata-editor'),
      dropzone: document.getElementById('pme-dropzone'),
      fileInput: document.getElementById('pme-file-input'),
      browseBtn: document.getElementById('pme-browse-btn'),
      workspace: document.getElementById('pme-workspace'),
      emptyState: document.getElementById('pme-empty-state'),
      
      // Form Fields
      titleInput: document.getElementById('pme-title'),
      authorInput: document.getElementById('pme-author'),
      subjectInput: document.getElementById('pme-subject'),
      keywordsInput: document.getElementById('pme-keywords'),
      creatorInput: document.getElementById('pme-creator'),
      producerInput: document.getElementById('pme-producer'),
      
      // Quick action
      stripBtn: document.getElementById('pme-strip-btn'),
      
      // Actions
      saveBtn: document.getElementById('pme-save-btn'),
      downloadBtn: document.getElementById('pme-download-btn'),
      resetBtn: document.getElementById('pme-reset-btn'),
      progressBar: document.getElementById('pme-progress-bar'),
      progressContainer: document.getElementById('pme-progress-container'),
      progressText: document.getElementById('pme-progress-text')
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

    if (dom.stripBtn) {
      dom.stripBtn.addEventListener('click', () => {
        dom.titleInput.value = '';
        dom.authorInput.value = '';
        dom.subjectInput.value = '';
        dom.keywordsInput.value = '';
        dom.creatorInput.value = '';
        dom.producerInput.value = '';
        Utils.showToast('All metadata fields cleared. Click Save to apply.', 'info');
      });
    }

    dom.saveBtn.addEventListener('click', saveMetadata);
    dom.downloadBtn.addEventListener('click', downloadEditedPDF);
    dom.resetBtn.addEventListener('click', resetTool);
  }

  async function handleFiles(files) {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      const ext = Utils.getExtension(file.name);
      if (/^(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(ext) || file.type.startsWith('image/')) {
        Utils.showToast(`You uploaded an image file ("${file.name}"). PDF Metadata Editor only accepts PDF documents.`, 'warning');
      } else {
        Utils.showToast(`Invalid file format ("${file.name}"). Please upload a valid PDF document.`, 'warning');
      }
      return;
    }

    Utils.setProcessing(true);
    showProgress(25, 'Reading PDF metadata...');

    try {
      const buffer = await Utils.readFileAsArrayBuffer(file);
      const pdfDoc = await PDFLib.PDFDocument.load(buffer, { ignoreEncryption: true });

      currentFile = {
        file,
        name: file.name,
        size: file.size,
        buffer,
        pageCount: pdfDoc.getPageCount()
      };

      // Populate current metadata
      dom.titleInput.value = pdfDoc.getTitle() || '';
      dom.authorInput.value = pdfDoc.getAuthor() || '';
      dom.subjectInput.value = pdfDoc.getSubject() || '';
      dom.keywordsInput.value = (pdfDoc.getKeywords() || []).join(', ');
      dom.creatorInput.value = pdfDoc.getCreator() || '';
      dom.producerInput.value = pdfDoc.getProducer() || '';

      dom.emptyState.classList.add('hidden');
      dom.workspace.classList.remove('hidden');
      dom.downloadBtn.classList.add('hidden');
      dom.saveBtn.classList.remove('hidden');
      dom.saveBtn.disabled = false;

      Utils.showToast(`Loaded metadata for "${file.name}". Edit fields and click Save.`, 'info');
    } catch (err) {
      console.error(err);
      Utils.showToast('Failed to load PDF: ' + err.message, 'error');
      resetTool();
    } finally {
      Utils.setProcessing(false);
      hideProgress();
    }
  }

  async function saveMetadata() {
    if (!currentFile) return;

    Utils.setProcessing(true);
    showProgress(35, 'Updating document properties...');

    try {
      const pdfDoc = await PDFLib.PDFDocument.load(currentFile.buffer, { ignoreEncryption: true });

      const title = dom.titleInput.value.trim();
      const author = dom.authorInput.value.trim();
      const subject = dom.subjectInput.value.trim();
      const keywords = dom.keywordsInput.value.split(',').map(s => s.trim()).filter(Boolean);
      const creator = dom.creatorInput.value.trim();
      const producer = dom.producerInput.value.trim();

      if (title) pdfDoc.setTitle(title);
      if (author) pdfDoc.setAuthor(author);
      if (subject) pdfDoc.setSubject(subject);
      if (keywords.length > 0) pdfDoc.setKeywords(keywords);
      if (creator) pdfDoc.setCreator(creator);
      if (producer) pdfDoc.setProducer(producer);
      pdfDoc.setModificationDate(new Date());

      showProgress(80, 'Saving updated PDF...');
      const finalBytes = await pdfDoc.save({ useObjectStreams: true });
      editedPdfBlob = new Blob([finalBytes], { type: 'application/pdf' });

      dom.saveBtn.classList.add('hidden');
      dom.downloadBtn.classList.remove('hidden');
      dom.downloadBtn.disabled = false;

      Utils.showToast('Metadata updated successfully! Download your PDF.', 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Failed to save metadata: ' + err.message, 'error');
    } finally {
      Utils.setProcessing(false);
      hideProgress();
    }
  }

  function downloadEditedPDF() {
    if (!editedPdfBlob || !currentFile) return;
    const base = Utils.getBaseName(currentFile.name);
    Utils.downloadBlob(editedPdfBlob, `${base}-metadata.pdf`);
  }

  function resetTool() {
    currentFile = null;
    editedPdfBlob = null;

    if (dom.titleInput) dom.titleInput.value = '';
    if (dom.authorInput) dom.authorInput.value = '';
    if (dom.subjectInput) dom.subjectInput.value = '';
    if (dom.keywordsInput) dom.keywordsInput.value = '';
    if (dom.creatorInput) dom.creatorInput.value = '';
    if (dom.producerInput) dom.producerInput.value = '';

    if (dom.emptyState) dom.emptyState.classList.remove('hidden');
    if (dom.workspace) dom.workspace.classList.add('hidden');
    if (dom.downloadBtn) dom.downloadBtn.classList.add('hidden');
    if (dom.saveBtn) {
      dom.saveBtn.classList.remove('hidden');
      dom.saveBtn.disabled = false;
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

  return {
    init,
    handleFiles,
    reset: resetTool
  };
})();

window.PDFMetadataEditor = PDFMetadataEditor;
