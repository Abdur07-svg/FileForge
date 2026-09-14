/**
 * FileForge - PDF Watermark Tool
 * Apply customizable text or logo watermarks to PDF pages with position, opacity, angle, and live preview.
 */

const PDFWatermark = (() => {
  let currentFile = null; // { file, name, size, buffer, pageCount }
  let watermarkType = 'text'; // 'text' | 'image'
  let watermarkImageBlob = null;
  let watermarkImageDataUrl = null;
  let generatedPdfBlob = null;

  let dom = {};

  function init() {
    dom = {
      container: document.getElementById('tool-pdf-watermark'),
      dropzone: document.getElementById('pwm-dropzone'),
      fileInput: document.getElementById('pwm-file-input'),
      browseBtn: document.getElementById('pwm-browse-btn'),
      workspace: document.getElementById('pwm-workspace'),
      emptyState: document.getElementById('pwm-empty-state'),
      
      // Mode tabs
      typeTextBtn: document.getElementById('pwm-type-text'),
      typeImageBtn: document.getElementById('pwm-type-image'),
      textOptionsPanel: document.getElementById('pwm-text-options'),
      imageOptionsPanel: document.getElementById('pwm-image-options'),
      
      // Text options
      textInput: document.getElementById('pwm-text-input'),
      fontSizeSlider: document.getElementById('pwm-font-size'),
      fontSizeVal: document.getElementById('pwm-font-size-val'),
      colorPicker: document.getElementById('pwm-color'),
      colorPresets: document.querySelectorAll('.pwm-color-preset'),
      rotationSlider: document.getElementById('pwm-rotation'),
      rotationVal: document.getElementById('pwm-rotation-val'),
      rotationPresets: document.querySelectorAll('.pwm-rotation-preset'),
      
      // Image options
      imageInput: document.getElementById('pwm-image-input'),
      imageBrowseBtn: document.getElementById('pwm-image-browse-btn'),
      imageScaleSlider: document.getElementById('pwm-image-scale'),
      imageScaleVal: document.getElementById('pwm-image-scale-val'),
      
      // Shared options
      opacitySlider: document.getElementById('pwm-opacity'),
      opacityVal: document.getElementById('pwm-opacity-val'),
      positionSelect: document.getElementById('pwm-position'),
      pageScopeSelect: document.getElementById('pwm-page-scope'),
      customRangeInput: document.getElementById('pwm-custom-range'),
      customRangeRow: document.getElementById('pwm-custom-range-row'),
      
      // Live Preview Canvas
      previewCanvas: document.getElementById('pwm-preview-canvas'),
      
      // Actions
      applyBtn: document.getElementById('pwm-apply-btn'),
      downloadBtn: document.getElementById('pwm-download-btn'),
      resetBtn: document.getElementById('pwm-reset-btn'),
      progressBar: document.getElementById('pwm-progress-bar'),
      progressContainer: document.getElementById('pwm-progress-container'),
      progressText: document.getElementById('pwm-progress-text')
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

    // Watermark type toggle
    if (dom.typeTextBtn && dom.typeImageBtn) {
      dom.typeTextBtn.addEventListener('click', () => setWatermarkType('text'));
      dom.typeImageBtn.addEventListener('click', () => setWatermarkType('image'));
    }

    // Text controls live update
    if (dom.textInput) dom.textInput.addEventListener('input', updatePreview);
    if (dom.fontSizeSlider) {
      dom.fontSizeSlider.addEventListener('input', (e) => {
        dom.fontSizeVal.textContent = e.target.value + 'px';
        updatePreview();
      });
    }
    if (dom.colorPicker) dom.colorPicker.addEventListener('input', updatePreview);
    if (dom.colorPresets) {
      dom.colorPresets.forEach(btn => {
        btn.addEventListener('click', () => {
          dom.colorPicker.value = btn.dataset.color;
          updatePreview();
        });
      });
    }
    if (dom.rotationSlider) {
      dom.rotationSlider.addEventListener('input', (e) => {
        dom.rotationVal.textContent = e.target.value + '°';
        updatePreview();
      });
    }
    if (dom.rotationPresets) {
      dom.rotationPresets.forEach(btn => {
        btn.addEventListener('click', () => {
          const angle = btn.dataset.angle;
          dom.rotationSlider.value = angle;
          dom.rotationVal.textContent = angle + '°';
          updatePreview();
        });
      });
    }

    // Image watermark upload & controls
    if (dom.imageBrowseBtn && dom.imageInput) {
      dom.imageBrowseBtn.addEventListener('click', () => dom.imageInput.click());
      dom.imageInput.addEventListener('change', handleWatermarkImage);
    }
    if (dom.imageScaleSlider) {
      dom.imageScaleSlider.addEventListener('input', (e) => {
        dom.imageScaleVal.textContent = e.target.value + '%';
        updatePreview();
      });
    }

    // Shared controls
    if (dom.opacitySlider) {
      dom.opacitySlider.addEventListener('input', (e) => {
        dom.opacityVal.textContent = e.target.value + '%';
        updatePreview();
      });
    }
    if (dom.positionSelect) dom.positionSelect.addEventListener('change', updatePreview);
    if (dom.pageScopeSelect) {
      dom.pageScopeSelect.addEventListener('change', (e) => {
        if (dom.customRangeRow) {
          dom.customRangeRow.classList.toggle('hidden', e.target.value !== 'custom');
        }
      });
    }

    dom.applyBtn.addEventListener('click', applyWatermark);
    dom.downloadBtn.addEventListener('click', downloadWatermarkedPDF);
    dom.resetBtn.addEventListener('click', resetTool);
  }

  function setWatermarkType(type) {
    watermarkType = type;
    if (type === 'text') {
      dom.typeTextBtn.className = 'btn btn-sm btn-primary';
      dom.typeImageBtn.className = 'btn btn-sm btn-ghost';
      dom.textOptionsPanel.classList.remove('hidden');
      dom.imageOptionsPanel.classList.add('hidden');
    } else {
      dom.typeTextBtn.className = 'btn btn-sm btn-ghost';
      dom.typeImageBtn.className = 'btn btn-sm btn-primary';
      dom.textOptionsPanel.classList.add('hidden');
      dom.imageOptionsPanel.classList.remove('hidden');
    }
    updatePreview();
  }

  async function handleFiles(files) {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      const ext = Utils.getExtension(file.name);
      if (/^(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(ext) || file.type.startsWith('image/')) {
        Utils.showToast(`You uploaded an image file ("${file.name}"). PDF Watermark only accepts PDF documents.`, 'warning');
      } else {
        Utils.showToast(`Invalid file format ("${file.name}"). Please upload a valid PDF document.`, 'warning');
      }
      return;
    }

    Utils.setProcessing(true);
    showProgress(20, 'Loading PDF document...');

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
      dom.downloadBtn.classList.add('hidden');
      dom.applyBtn.classList.remove('hidden');
      dom.applyBtn.disabled = false;

      await renderPageOnePreview();
      Utils.showToast(`Loaded "${file.name}" (${pageCount} pages). Configure watermark and click Apply!`, 'info');
    } catch (err) {
      console.error(err);
      Utils.showToast('Failed to load PDF: ' + err.message, 'error');
      resetTool();
    } finally {
      Utils.setProcessing(false);
      hideProgress();
    }
  }

  let page1CanvasCache = null;

  async function renderPageOnePreview() {
    if (!currentFile || !currentFile.pdf || !dom.previewCanvas) return;
    const page = await currentFile.pdf.getPage(1);
    const viewport = page.getViewport({ scale: 0.65 });

    const offscreen = document.createElement('canvas');
    offscreen.width = Math.round(viewport.width);
    offscreen.height = Math.round(viewport.height);
    const ctx = offscreen.getContext('2d');

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, offscreen.width, offscreen.height);

    await page.render({ canvasContext: ctx, viewport }).promise;
    page1CanvasCache = offscreen;

    updatePreview();
  }

  function updatePreview() {
    if (!page1CanvasCache || !dom.previewCanvas) return;

    const canvas = dom.previewCanvas;
    canvas.width = page1CanvasCache.width;
    canvas.height = page1CanvasCache.height;
    const ctx = canvas.getContext('2d');

    // Draw base page
    ctx.drawImage(page1CanvasCache, 0, 0);

    const opacity = (parseInt(dom.opacitySlider ? dom.opacitySlider.value : 30, 10) || 30) / 100;
    const pos = dom.positionSelect ? dom.positionSelect.value : 'center';

    ctx.save();
    ctx.globalAlpha = opacity;

    if (watermarkType === 'text') {
      const text = dom.textInput ? (dom.textInput.value || 'CONFIDENTIAL') : 'CONFIDENTIAL';
      const fontSize = parseInt(dom.fontSizeSlider ? dom.fontSizeSlider.value : 48, 10) || 48;
      const color = dom.colorPicker ? dom.colorPicker.value : '#ff0000';
      const rotation = (parseInt(dom.rotationSlider ? dom.rotationSlider.value : 45, 10) || 45) * Math.PI / 180;

      ctx.font = `bold ${fontSize * 0.65}px sans-serif`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (pos === 'tiled') {
        const stepX = 140;
        const stepY = 120;
        for (let x = 40; x < canvas.width; x += stepX) {
          for (let y = 40; y < canvas.height; y += stepY) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rotation);
            ctx.fillText(text, 0, 0);
            ctx.restore();
          }
        }
      } else {
        const coords = getPositionCoordinates(pos, canvas.width, canvas.height, 60);
        ctx.translate(coords.x, coords.y);
        ctx.rotate(rotation);
        ctx.fillText(text, 0, 0);
      }
    } else if (watermarkType === 'image' && watermarkImageElement) {
      const scalePct = (parseInt(dom.imageScaleSlider ? dom.imageScaleSlider.value : 50, 10) || 50) / 100;
      const imgW = watermarkImageElement.naturalWidth * scalePct * 0.4;
      const imgH = watermarkImageElement.naturalHeight * scalePct * 0.4;

      if (pos === 'tiled') {
        const stepX = imgW + 60;
        const stepY = imgH + 60;
        for (let x = 30; x < canvas.width; x += stepX) {
          for (let y = 30; y < canvas.height; y += stepY) {
            ctx.drawImage(watermarkImageElement, x, y, imgW, imgH);
          }
        }
      } else {
        const coords = getPositionCoordinates(pos, canvas.width, canvas.height, 40);
        ctx.drawImage(watermarkImageElement, coords.x - imgW / 2, coords.y - imgH / 2, imgW, imgH);
      }
    }

    ctx.restore();
  }

  let watermarkImageElement = null;
  async function handleWatermarkImage(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Utils.showToast('Please select a valid image file (PNG, JPG, SVG).', 'warning');
      return;
    }

    watermarkImageBlob = file;
    const dataUrl = await Utils.readFileAsDataURL(file);
    watermarkImageDataUrl = dataUrl;
    watermarkImageElement = await Utils.loadImage(dataUrl);

    updatePreview();
    Utils.showToast(`Watermark logo "${file.name}" loaded!`, 'success');
  }

  function getPositionCoordinates(position, w, h, margin = 50) {
    switch (position) {
      case 'top-left': return { x: margin + 30, y: margin + 20 };
      case 'top-center': return { x: w / 2, y: margin + 20 };
      case 'top-right': return { x: w - margin - 30, y: margin + 20 };
      case 'center-left': return { x: margin + 30, y: h / 2 };
      case 'center': return { x: w / 2, y: h / 2 };
      case 'center-right': return { x: w - margin - 30, y: h / 2 };
      case 'bottom-left': return { x: margin + 30, y: h - margin - 20 };
      case 'bottom-center': return { x: w / 2, y: h - margin - 20 };
      case 'bottom-right': return { x: w - margin - 30, y: h - margin - 20 };
      default: return { x: w / 2, y: h / 2 };
    }
  }

  async function applyWatermark() {
    if (!currentFile) return;

    Utils.setProcessing(true);
    showProgress(25, 'Applying watermark to document...');

    try {
      const srcDoc = await PDFLib.PDFDocument.load(currentFile.buffer, { ignoreEncryption: true });
      const pages = srcDoc.getPages();
      const total = pages.length;

      const opacity = (parseInt(dom.opacitySlider ? dom.opacitySlider.value : 30, 10) || 30) / 100;
      const pos = dom.positionSelect ? dom.positionSelect.value : 'center';
      const scope = dom.pageScopeSelect ? dom.pageScopeSelect.value : 'all';

      // Parse target pages
      const targetIndices = new Set();
      if (scope === 'all') {
        for (let i = 0; i < total; i++) targetIndices.add(i);
      } else if (scope === 'first') {
        targetIndices.add(0);
      } else if (scope === 'custom' && dom.customRangeInput) {
        const parts = dom.customRangeInput.value.split(',').map(s => s.trim());
        parts.forEach(part => {
          if (part.includes('-')) {
            const [s, e] = part.split('-').map(n => parseInt(n, 10));
            if (!isNaN(s) && !isNaN(e)) {
              for (let p = Math.max(1, s); p <= Math.min(total, e); p++) targetIndices.add(p - 1);
            }
          } else {
            const p = parseInt(part, 10);
            if (!isNaN(p) && p >= 1 && p <= total) targetIndices.add(p - 1);
          }
        });
      }

      let embeddedImg = null;
      if (watermarkType === 'image' && watermarkImageBlob) {
        const imgBytes = await watermarkImageBlob.arrayBuffer();
        if (watermarkImageBlob.type.includes('png')) {
          embeddedImg = await srcDoc.embedPng(imgBytes);
        } else {
          embeddedImg = await srcDoc.embedJpg(imgBytes);
        }
      }

      const helveticaFont = await srcDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);

      for (let i = 0; i < total; i++) {
        if (!targetIndices.has(i)) continue;
        showProgress(35 + Math.round((i / total) * 50), `Watermarking page ${i + 1} of ${total}...`);
        await yieldToUI();

        const page = pages[i];
        const { width, height } = page.getSize();

        if (watermarkType === 'text') {
          const text = dom.textInput ? (dom.textInput.value || 'CONFIDENTIAL') : 'CONFIDENTIAL';
          const fontSize = parseInt(dom.fontSizeSlider ? dom.fontSizeSlider.value : 48, 10) || 48;
          const hex = dom.colorPicker ? dom.colorPicker.value : '#ff0000';
          const r = parseInt(hex.slice(1, 3), 16) / 255;
          const g = parseInt(hex.slice(3, 5), 16) / 255;
          const b = parseInt(hex.slice(5, 7), 16) / 255;
          const rotDeg = parseInt(dom.rotationSlider ? dom.rotationSlider.value : 45, 10) || 45;

          const textWidth = helveticaFont.widthOfTextAtSize(text, fontSize);
          const textHeight = helveticaFont.heightAtSize(fontSize);

          if (pos === 'tiled') {
            for (let x = 60; x < width; x += 180) {
              for (let y = 60; y < height; y += 150) {
                page.drawText(text, {
                  x,
                  y,
                  size: fontSize * 0.7,
                  font: helveticaFont,
                  color: PDFLib.rgb(r, g, b),
                  opacity,
                  rotate: PDFLib.degrees(rotDeg)
                });
              }
            }
          } else {
            const coords = getPdfPositionCoords(pos, width, height, textWidth, textHeight, 50);
            page.drawText(text, {
              x: coords.x,
              y: coords.y,
              size: fontSize,
              font: helveticaFont,
              color: PDFLib.rgb(r, g, b),
              opacity,
              rotate: PDFLib.degrees(rotDeg)
            });
          }
        } else if (embeddedImg) {
          const scalePct = (parseInt(dom.imageScaleSlider ? dom.imageScaleSlider.value : 50, 10) || 50) / 100;
          const imgW = embeddedImg.width * scalePct;
          const imgH = embeddedImg.height * scalePct;

          if (pos === 'tiled') {
            for (let x = 50; x < width; x += imgW + 80) {
              for (let y = 50; y < height; y += imgH + 80) {
                page.drawImage(embeddedImg, { x, y, width: imgW, height: imgH, opacity });
              }
            }
          } else {
            const coords = getPdfPositionCoords(pos, width, height, imgW, imgH, 50);
            page.drawImage(embeddedImg, { x: coords.x, y: coords.y, width: imgW, height: imgH, opacity });
          }
        }
      }

      showProgress(90, 'Packaging watermarked PDF...');
      const finalBytes = await srcDoc.save({ useObjectStreams: true });
      generatedPdfBlob = new Blob([finalBytes], { type: 'application/pdf' });

      dom.applyBtn.classList.add('hidden');
      dom.downloadBtn.classList.remove('hidden');
      dom.downloadBtn.disabled = false;

      Utils.showToast('Watermark applied successfully! Download your PDF.', 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Error applying watermark: ' + err.message, 'error');
    } finally {
      Utils.setProcessing(false);
      hideProgress();
    }
  }

  function getPdfPositionCoords(pos, pageW, pageH, itemW, itemH, margin = 50) {
    switch (pos) {
      case 'top-left': return { x: margin, y: pageH - margin - itemH };
      case 'top-center': return { x: (pageW - itemW) / 2, y: pageH - margin - itemH };
      case 'top-right': return { x: pageW - margin - itemW, y: pageH - margin - itemH };
      case 'center-left': return { x: margin, y: (pageH - itemH) / 2 };
      case 'center': return { x: (pageW - itemW) / 2, y: (pageH - itemH) / 2 };
      case 'center-right': return { x: pageW - margin - itemW, y: (pageH - itemH) / 2 };
      case 'bottom-left': return { x: margin, y: margin };
      case 'bottom-center': return { x: (pageW - itemW) / 2, y: margin };
      case 'bottom-right': return { x: pageW - margin - itemW, y: margin };
      default: return { x: (pageW - itemW) / 2, y: (pageH - itemH) / 2 };
    }
  }

  function downloadWatermarkedPDF() {
    if (!generatedPdfBlob || !currentFile) return;
    const base = Utils.getBaseName(currentFile.name);
    Utils.downloadBlob(generatedPdfBlob, `${base}-watermarked.pdf`);
  }

  function resetTool() {
    currentFile = null;
    page1CanvasCache = null;
    watermarkImageBlob = null;
    watermarkImageDataUrl = null;
    watermarkImageElement = null;
    generatedPdfBlob = null;

    if (dom.emptyState) dom.emptyState.classList.remove('hidden');
    if (dom.workspace) dom.workspace.classList.add('hidden');
    if (dom.downloadBtn) dom.downloadBtn.classList.add('hidden');
    if (dom.applyBtn) {
      dom.applyBtn.classList.remove('hidden');
      dom.applyBtn.disabled = false;
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

window.PDFWatermark = PDFWatermark;
