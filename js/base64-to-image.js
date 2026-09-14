/**
 * FileForge - Base64 to Image Tool
 * Paste any Base64 string or Data URI, inspect image details, and download as PNG/JPG/WebP.
 */

const Base64ToImage = (() => {
  let currentDataUrl = '';
  let loadedImage = null;

  let dom = {};

  function init() {
    dom = {
      container: document.getElementById('tool-base64-to-image'),
      inputArea: document.getElementById('b2i-input'),
      renderBtn: document.getElementById('b2i-render-btn'),
      clearBtn: document.getElementById('b2i-clear-btn'),
      
      // Output / Result panel
      resultCard: document.getElementById('b2i-result-card'),
      previewImg: document.getElementById('b2i-preview-img'),
      detectedFormatText: document.getElementById('b2i-format'),
      dimensionsText: document.getElementById('b2i-dims'),
      estimatedSizeText: document.getElementById('b2i-est-size'),
      
      // Download options
      outputFormatSelect: document.getElementById('b2i-output-format'),
      downloadBtn: document.getElementById('b2i-download-btn'),
      sampleBtn: document.getElementById('b2i-sample-btn')
    };

    if (!dom.container) return;

    bindEvents();
  }

  function bindEvents() {
    if (dom.renderBtn) dom.renderBtn.addEventListener('click', parseAndRender);
    if (dom.clearBtn) dom.clearBtn.addEventListener('click', resetTool);
    if (dom.downloadBtn) dom.downloadBtn.addEventListener('click', downloadConvertedImage);
    if (dom.inputArea) {
      dom.inputArea.addEventListener('paste', () => {
        setTimeout(parseAndRender, 100);
      });
    }

    if (dom.sampleBtn) {
      dom.sampleBtn.addEventListener('click', loadSample);
    }
  }

  function loadSample() {
    // 1x1 gradient / icon sample data URI
    const sample = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9Qz0AEYBxVSF+FAP5FDvcfRYWgAAAAAElFTkSuQmCC';
    if (dom.inputArea) {
      dom.inputArea.value = sample;
      parseAndRender();
    }
  }

  function parseAndRender() {
    let text = (dom.inputArea ? dom.inputArea.value : '').trim();
    if (!text) {
      Utils.showToast('Please paste a Base64 string or Data URI first.', 'warning');
      return;
    }

    // Clean wrapped HTML or CSS if pasted by mistake
    const htmlMatch = text.match(/src=["'](data:image\/[^"']+)["']/i);
    if (htmlMatch) text = htmlMatch[1];
    const cssMatch = text.match(/url\(["']?(data:image\/[^"')]+)["']?\)/i);
    if (cssMatch) text = cssMatch[1];

    // If it's pure raw base64 without data: prefix, detect or default to png
    if (!text.startsWith('data:image/')) {
      // Check first chars for common headers
      if (text.startsWith('/9j/')) text = 'data:image/jpeg;base64,' + text;
      else if (text.startsWith('iVBORw0KGgo')) text = 'data:image/png;base64,' + text;
      else if (text.startsWith('UklGR')) text = 'data:image/webp;base64,' + text;
      else if (text.startsWith('R0lGOD')) text = 'data:image/gif;base64,' + text;
      else if (text.startsWith('PHN2Zy') || text.startsWith('PD94bW')) text = 'data:image/svg+xml;base64,' + text;
      else text = 'data:image/png;base64,' + text;
    }

    const img = new Image();
    img.onload = () => {
      loadedImage = img;
      currentDataUrl = text;

      // Detect format
      let format = 'PNG Image';
      if (text.includes('image/jpeg')) format = 'JPEG / JPG';
      else if (text.includes('image/png')) format = 'PNG Lossless';
      else if (text.includes('image/webp')) format = 'WebP Image';
      else if (text.includes('image/gif')) format = 'GIF Image';
      else if (text.includes('image/svg')) format = 'SVG Vector';

      if (dom.detectedFormatText) dom.detectedFormatText.textContent = format;
      if (dom.dimensionsText) dom.dimensionsText.textContent = `${img.naturalWidth} × ${img.naturalHeight} px`;
      
      const approxBytes = Math.round((text.length * 3) / 4);
      if (dom.estimatedSizeText) dom.estimatedSizeText.textContent = Utils.formatBytes(approxBytes);
      if (dom.previewImg) dom.previewImg.src = text;

      if (dom.resultCard) dom.resultCard.classList.remove('hidden');
      Utils.showToast('Base64 decoded successfully! 🎉', 'success');
    };

    img.onerror = () => {
      Utils.showToast('Invalid Base64 string. Please check the pasted data.', 'error');
      if (dom.resultCard) dom.resultCard.classList.add('hidden');
    };

    img.src = text;
  }

  function downloadConvertedImage() {
    if (!loadedImage) return;

    const targetFormat = dom.outputFormatSelect ? dom.outputFormatSelect.value : 'image/png';
    const canvas = document.createElement('canvas');
    canvas.width = loadedImage.naturalWidth;
    canvas.height = loadedImage.naturalHeight;
    const ctx = canvas.getContext('2d');

    // White background for JPEG if transparency
    if (targetFormat === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(loadedImage, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const ext = targetFormat === 'image/jpeg' ? 'jpg' : (targetFormat === 'image/webp' ? 'webp' : 'png');
      Utils.downloadBlob(blob, `base64-decoded.${ext}`);
      Utils.showToast('Image downloaded! 💾', 'success');
    }, targetFormat, 0.95);
  }

  function resetTool() {
    currentDataUrl = '';
    loadedImage = null;

    if (dom.inputArea) dom.inputArea.value = '';
    if (dom.resultCard) dom.resultCard.classList.add('hidden');
  }

  return {
    init,
    reset: resetTool
  };
})();

window.Base64ToImage = Base64ToImage;
