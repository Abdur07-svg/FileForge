/**
 * FileForge - Image Color Picker Tool
 * Interactive pixel sampler, zoom magnifier loupe, HEX/RGB/HSL extractor & color palette generator.
 */

const ImageColorPicker = (() => {
  let currentFile = null;
  let originalImage = null;
  let colorPalette = [];

  let dom = {};

  function init() {
    dom = {
      container: document.getElementById('tool-image-color-picker'),
      dropzone: document.getElementById('icp-dropzone'),
      fileInput: document.getElementById('icp-file-input'),
      browseBtn: document.getElementById('icp-browse-btn'),
      workspace: document.getElementById('icp-workspace'),
      emptyState: document.getElementById('icp-empty-state'),
      
      // Stage & Canvas
      canvasWrap: document.getElementById('icp-canvas-wrap'),
      canvas: document.getElementById('icp-canvas'),
      loupe: document.getElementById('icp-loupe'),
      loupeCanvas: document.getElementById('icp-loupe-canvas'),
      
      // Color Readouts
      colorPreview: document.getElementById('icp-color-preview'),
      hexOutput: document.getElementById('icp-hex-output'),
      rgbOutput: document.getElementById('icp-rgb-output'),
      hslOutput: document.getElementById('icp-hsl-output'),
      rgbaOutput: document.getElementById('icp-rgba-output'),
      
      copyHexBtn: document.getElementById('icp-copy-hex'),
      copyRgbBtn: document.getElementById('icp-copy-rgb'),
      copyHslBtn: document.getElementById('icp-copy-hsl'),
      
      paletteContainer: document.getElementById('icp-palette-list'),
      clearPaletteBtn: document.getElementById('icp-clear-palette'),
      resetBtn: document.getElementById('icp-reset-btn')
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

    if (dom.canvas) {
      dom.canvas.addEventListener('mousemove', handleMouseMove);
      dom.canvas.addEventListener('mouseleave', handleMouseLeave);
      dom.canvas.addEventListener('click', handleCanvasClick);
    }

    if (dom.copyHexBtn) dom.copyHexBtn.addEventListener('click', () => copyText(dom.hexOutput.textContent, 'HEX Color Copied!'));
    if (dom.copyRgbBtn) dom.copyRgbBtn.addEventListener('click', () => copyText(dom.rgbOutput.textContent, 'RGB Color Copied!'));
    if (dom.copyHslBtn) dom.copyHslBtn.addEventListener('click', () => copyText(dom.hslOutput.textContent, 'HSL Color Copied!'));
    
    if (dom.clearPaletteBtn) dom.clearPaletteBtn.addEventListener('click', clearPalette);
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
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = dataUrl;
      });

      originalImage = img;
      currentFile = file;

      dom.emptyState.classList.add('hidden');
      dom.workspace.classList.remove('hidden');

      renderImageToCanvas();
      extractDominantColors();
      Utils.showToast('Move your cursor over the image to inspect & click to pick colors! 🎨', 'info');
    } catch (err) {
      console.error(err);
      Utils.showToast('Failed to load image: ' + err.message, 'error');
      resetTool();
    } finally {
      Utils.setProcessing(false);
    }
  }

  function renderImageToCanvas() {
    if (!originalImage || !dom.canvas) return;
    const canvas = dom.canvas;
    const ctx = canvas.getContext('2d');

    // Display sizing
    const maxWidth = 800;
    const maxHeight = 500;
    let width = originalImage.naturalWidth;
    let height = originalImage.naturalHeight;

    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(originalImage, 0, 0, width, height);

    // Initial color pick at center
    samplePixel(Math.floor(width / 2), Math.floor(height / 2), false);
  }

  function handleMouseMove(e) {
    if (!dom.canvas) return;
    const rect = dom.canvas.getBoundingClientRect();
    const x = Math.floor(e.clientX - rect.left);
    const y = Math.floor(e.clientY - rect.top);

    samplePixel(x, y, false);
    renderLoupe(x, y, e.clientX, e.clientY);
  }

  function handleMouseLeave() {
    if (dom.loupe) dom.loupe.classList.add('hidden');
  }

  function handleCanvasClick(e) {
    if (!dom.canvas) return;
    const rect = dom.canvas.getBoundingClientRect();
    const x = Math.floor(e.clientX - rect.left);
    const y = Math.floor(e.clientY - rect.top);

    const color = samplePixel(x, y, true);
    if (color) {
      addColorToPalette(color);
      copyText(color.hex, `Picked ${color.hex} & copied to clipboard!`);
    }
  }

  function samplePixel(x, y, isClick = false) {
    if (!dom.canvas) return null;
    const ctx = dom.canvas.getContext('2d');
    if (x < 0 || x >= dom.canvas.width || y < 0 || y >= dom.canvas.height) return null;

    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const r = pixel[0];
    const g = pixel[1];
    const b = pixel[2];
    const a = (pixel[3] / 255).toFixed(2);

    const hex = rgbToHex(r, g, b);
    const rgb = `rgb(${r}, ${g}, ${b})`;
    const rgba = `rgba(${r}, ${g}, ${b}, ${a})`;
    const hsl = rgbToHsl(r, g, b);

    if (dom.colorPreview) dom.colorPreview.style.backgroundColor = hex;
    if (dom.hexOutput) dom.hexOutput.textContent = hex;
    if (dom.rgbOutput) dom.rgbOutput.textContent = rgb;
    if (dom.hslOutput) dom.hslOutput.textContent = hsl;
    if (dom.rgbaOutput) dom.rgbaOutput.textContent = rgba;

    return { hex, rgb, hsl, rgba, r, g, b };
  }

  function renderLoupe(canvasX, canvasY, clientX, clientY) {
    if (!dom.loupe || !dom.loupeCanvas || !dom.canvas) return;

    dom.loupe.classList.remove('hidden');
    dom.loupe.style.left = `${clientX + 16}px`;
    dom.loupe.style.top = `${clientY + 16}px`;

    const lCanvas = dom.loupeCanvas;
    const lCtx = lCanvas.getContext('2d');
    lCtx.imageSmoothingEnabled = false;

    lCanvas.width = 100;
    lCanvas.height = 100;

    // Grab 11x11 sample area around cursor
    const sampleSize = 11;
    const half = Math.floor(sampleSize / 2);
    const sx = Math.max(0, canvasX - half);
    const sy = Math.max(0, canvasY - half);

    lCtx.drawImage(dom.canvas, sx, sy, sampleSize, sampleSize, 0, 0, 100, 100);

    // Draw center crosshair
    lCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    lCtx.lineWidth = 2;
    lCtx.strokeRect(45, 45, 10, 10);
    lCtx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    lCtx.lineWidth = 1;
    lCtx.strokeRect(44, 44, 12, 12);
  }

  function addColorToPalette(color) {
    if (colorPalette.some(c => c.hex === color.hex)) return;
    colorPalette.unshift(color);
    if (colorPalette.length > 16) colorPalette.pop();
    renderPalette();
  }

  function renderPalette() {
    if (!dom.paletteContainer) return;
    dom.paletteContainer.innerHTML = '';

    colorPalette.forEach(c => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'palette-chip';
      chip.style.backgroundColor = c.hex;
      chip.title = `${c.hex} (${c.rgb}) - Click to copy`;
      chip.setAttribute('aria-label', `Color ${c.hex}`);
      chip.addEventListener('click', () => {
        copyText(c.hex, `Copied ${c.hex}!`);
        sampleCustomColor(c);
      });
      dom.paletteContainer.appendChild(chip);
    });
  }

  function sampleCustomColor(c) {
    if (dom.colorPreview) dom.colorPreview.style.backgroundColor = c.hex;
    if (dom.hexOutput) dom.hexOutput.textContent = c.hex;
    if (dom.rgbOutput) dom.rgbOutput.textContent = c.rgb;
    if (dom.hslOutput) dom.hslOutput.textContent = c.hsl;
  }

  function extractDominantColors() {
    if (!dom.canvas) return;
    const ctx = dom.canvas.getContext('2d');
    const w = dom.canvas.width;
    const h = dom.canvas.height;
    if (w === 0 || h === 0) return;

    // Sample a few strategic grid points across the image
    const stepX = Math.max(1, Math.floor(w / 4));
    const stepY = Math.max(1, Math.floor(h / 4));

    colorPalette = [];
    for (let y = stepY / 2; y < h; y += stepY) {
      for (let x = stepX / 2; x < w; x += stepX) {
        const color = samplePixel(Math.floor(x), Math.floor(y), false);
        if (color && !colorPalette.some(c => c.hex === color.hex)) {
          colorPalette.push(color);
        }
      }
    }
    renderPalette();
  }

  function clearPalette() {
    colorPalette = [];
    renderPalette();
    Utils.showToast('Palette cleared.', 'info');
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
  }

  function copyText(text, msg) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      Utils.showToast(msg, 'success');
    }).catch(() => {
      Utils.showToast(msg, 'success');
    });
  }

  function resetTool() {
    currentFile = null;
    originalImage = null;
    colorPalette = [];

    if (dom.emptyState) dom.emptyState.classList.remove('hidden');
    if (dom.workspace) dom.workspace.classList.add('hidden');
    if (dom.loupe) dom.loupe.classList.add('hidden');
  }

  return {
    init,
    handleFiles,
    reset: resetTool
  };
})();

window.ImageColorPicker = ImageColorPicker;
