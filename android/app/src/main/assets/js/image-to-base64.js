/**
 * FileForge - Image to Base64 Tool
 * Convert image files directly into clean Base64 data strings, HTML tags, and CSS snippets.
 */

const ImageToBase64 = (() => {
  let currentFile = null;
  let base64String = '';
  let dataUriString = '';

  let dom = {};

  function init() {
    dom = {
      container: document.getElementById('tool-image-to-base64'),
      dropzone: document.getElementById('i2b-dropzone'),
      fileInput: document.getElementById('i2b-file-input'),
      browseBtn: document.getElementById('i2b-browse-btn'),
      workspace: document.getElementById('i2b-workspace'),
      emptyState: document.getElementById('i2b-empty-state'),
      
      // Details
      fileNameText: document.getElementById('i2b-file-name'),
      fileSizeText: document.getElementById('i2b-file-size'),
      b64SizeText: document.getElementById('i2b-b64-size'),
      previewImg: document.getElementById('i2b-preview-img'),
      
      // Output Textareas & Copy Buttons
      dataUriOutput: document.getElementById('i2b-data-uri'),
      rawB64Output: document.getElementById('i2b-raw-b64'),
      htmlTagOutput: document.getElementById('i2b-html-tag'),
      cssBgOutput: document.getElementById('i2b-css-bg'),
      
      copyDataUriBtn: document.getElementById('i2b-copy-data-uri'),
      copyRawBtn: document.getElementById('i2b-copy-raw'),
      copyHtmlBtn: document.getElementById('i2b-copy-html'),
      copyCssBtn: document.getElementById('i2b-copy-css'),
      
      downloadTxtBtn: document.getElementById('i2b-download-txt'),
      resetBtn: document.getElementById('i2b-reset-btn')
    };

    if (!dom.container) return;

    bindEvents();
  }

  function bindEvents() {
    Utils.setupDropZone(dom.dropzone, handleFiles, ['image/*']);
    dom.browseBtn.addEventListener('click', () => dom.fileInput.click());
    dom.fileInput.addEventListener('change', (e) => {
      handleFiles(Array.from(e.target.files));
      dom.fileInput.value = '';
    });

    if (dom.copyDataUriBtn) {
      dom.copyDataUriBtn.addEventListener('click', () => copyToClipboard(dataUriString, 'Data URI copied!'));
    }
    if (dom.copyRawBtn) {
      dom.copyRawBtn.addEventListener('click', () => copyToClipboard(base64String, 'Raw Base64 copied!'));
    }
    if (dom.copyHtmlBtn) {
      dom.copyHtmlBtn.addEventListener('click', () => copyToClipboard(dom.htmlTagOutput.value, 'HTML <img> tag copied!'));
    }
    if (dom.copyCssBtn) {
      dom.copyCssBtn.addEventListener('click', () => copyToClipboard(dom.cssBgOutput.value, 'CSS background snippet copied!'));
    }

    if (dom.downloadTxtBtn) dom.downloadTxtBtn.addEventListener('click', downloadAsTxt);
    if (dom.resetBtn) dom.resetBtn.addEventListener('click', resetTool);
  }

  async function handleFiles(files) {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.type.startsWith('image/') && !/\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(file.name)) {
      Utils.showToast(`Invalid image format ("${file.name}"). Please upload an image file.`, 'warning');
      return;
    }

    Utils.setProcessing(true);

    try {
      const dataUrl = await Utils.readFileAsDataURL(file);
      dataUriString = dataUrl;
      const commaIdx = dataUrl.indexOf(',');
      base64String = commaIdx !== -1 ? dataUrl.substring(commaIdx + 1) : dataUrl;

      currentFile = file;

      // Populate File Details
      dom.fileNameText.textContent = file.name;
      dom.fileSizeText.textContent = Utils.formatBytes(file.size);
      dom.b64SizeText.textContent = Utils.formatBytes(dataUriString.length);
      dom.previewImg.src = dataUrl;

      // Populate Textareas
      dom.dataUriOutput.value = dataUriString;
      dom.rawB64Output.value = base64String;
      dom.htmlTagOutput.value = `<img src="${dataUriString}" alt="${file.name}">`;
      dom.cssBgOutput.value = `background-image: url("${dataUriString}");`;

      dom.emptyState.classList.add('hidden');
      dom.workspace.classList.remove('hidden');

      Utils.showToast('Image converted to Base64! 📋', 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Failed to convert image: ' + err.message, 'error');
      resetTool();
    } finally {
      Utils.setProcessing(false);
    }
  }

  function copyToClipboard(text, successMsg) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      Utils.showToast(successMsg, 'success');
    }).catch(() => {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      Utils.showToast(successMsg, 'success');
    });
  }

  function downloadAsTxt() {
    if (!dataUriString || !currentFile) return;
    const base = Utils.getBaseName(currentFile.name);
    const blob = new Blob([dataUriString], { type: 'text/plain;charset=utf-8' });
    Utils.downloadBlob(blob, `${base}-base64.txt`);
    Utils.showToast('Base64 string text file downloaded! 📄', 'success');
  }

  function resetTool() {
    currentFile = null;
    base64String = '';
    dataUriString = '';

    if (dom.dataUriOutput) dom.dataUriOutput.value = '';
    if (dom.rawB64Output) dom.rawB64Output.value = '';
    if (dom.htmlTagOutput) dom.htmlTagOutput.value = '';
    if (dom.cssBgOutput) dom.cssBgOutput.value = '';

    if (dom.emptyState) dom.emptyState.classList.remove('hidden');
    if (dom.workspace) dom.workspace.classList.add('hidden');
  }

  return {
    init,
    handleFiles,
    reset: resetTool
  };
})();

window.ImageToBase64 = ImageToBase64;
