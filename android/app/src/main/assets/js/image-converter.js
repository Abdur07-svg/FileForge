/**
 * FileForge - Image Converter Tool
 * Converts JPG <-> PNG <-> WebP with transparency handling and background color picker.
 */

const ImageConverter = (() => {
  let files = []; // { file, name, dataUrl, convertedBlob, convertedUrl, outputExt }
  let currentPreset = 'general'; // 'general', 'jpg-to-png', 'png-to-jpg'

  let dom = {};

  function init() {
    dom = {
      container: document.getElementById('tool-image-converter'),
      dropzone: document.getElementById('iconv-dropzone'),
      fileInput: document.getElementById('iconv-file-input'),
      browseBtn: document.getElementById('iconv-browse-btn'),
      workspace: document.getElementById('iconv-workspace'),
      emptyState: document.getElementById('iconv-empty-state'),
      fileGrid: document.getElementById('iconv-file-grid'),
      
      // Settings
      targetFormatSelect: document.getElementById('iconv-target-format'),
      qualitySlider: document.getElementById('iconv-quality'),
      qualityVal: document.getElementById('iconv-quality-val'),
      qualityRow: document.getElementById('iconv-quality-row'),
      bgColorRow: document.getElementById('iconv-bg-row'),
      bgColorPicker: document.getElementById('iconv-bg-color'),
      bgColorPresets: document.querySelectorAll('.iconv-bg-preset'),
      
      // Actions
      convertBtn: document.getElementById('iconv-convert-btn'),
      downloadAllBtn: document.getElementById('iconv-download-all-btn'),
      resetBtn: document.getElementById('iconv-reset-btn'),
      progressBar: document.getElementById('iconv-progress-bar'),
      progressContainer: document.getElementById('iconv-progress-container'),
      progressText: document.getElementById('iconv-progress-text')
    };

    if (!dom.container) return;

    bindEvents();
  }

  function bindEvents() {
    Utils.setupDropZone(dom.dropzone, handleFiles, ['image/', '.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg']);
    dom.browseBtn.addEventListener('click', () => dom.fileInput.click());
    dom.fileInput.addEventListener('change', (e) => {
      handleFiles(Array.from(e.target.files));
      dom.fileInput.value = '';
    });

    dom.targetFormatSelect.addEventListener('change', () => {
      updateSettingsVisibility();
    });

    dom.qualitySlider.addEventListener('input', (e) => {
      dom.qualityVal.textContent = e.target.value + '%';
    });

    dom.bgColorPresets.forEach(btn => {
      btn.addEventListener('click', () => {
        const color = btn.dataset.color;
        dom.bgColorPicker.value = color;
      });
    });

    dom.convertBtn.addEventListener('click', convertAll);
    dom.downloadAllBtn.addEventListener('click', downloadAllAsZip);
    dom.resetBtn.addEventListener('click', resetTool);
  }

  const PRESET_MAP = {
    'jpg-to-png': { target: 'png', accept: '.jpg,.jpeg,image/jpeg', srcName: 'JPG/JPEG', validFn: (ext, mime) => mime === 'image/jpeg' || /^(jpg|jpeg)$/i.test(ext) },
    'png-to-jpg': { target: 'jpeg', accept: '.png,image/png', srcName: 'PNG', validFn: (ext, mime) => mime === 'image/png' || /^png$/i.test(ext) },
    'webp-to-jpg': { target: 'jpeg', accept: '.webp,image/webp', srcName: 'WebP', validFn: (ext, mime) => mime === 'image/webp' || /^webp$/i.test(ext) },
    'webp-to-png': { target: 'png', accept: '.webp,image/webp', srcName: 'WebP', validFn: (ext, mime) => mime === 'image/webp' || /^webp$/i.test(ext) },
    'jpg-to-webp': { target: 'webp', accept: '.jpg,.jpeg,image/jpeg', srcName: 'JPG/JPEG', validFn: (ext, mime) => mime === 'image/jpeg' || /^(jpg|jpeg)$/i.test(ext) },
    'png-to-webp': { target: 'webp', accept: '.png,image/png', srcName: 'PNG', validFn: (ext, mime) => mime === 'image/png' || /^png$/i.test(ext) },
    'gif-to-jpg': { target: 'jpeg', accept: '.gif,image/gif', srcName: 'GIF', validFn: (ext, mime) => mime === 'image/gif' || /^gif$/i.test(ext) },
    'gif-to-png': { target: 'png', accept: '.gif,image/gif', srcName: 'GIF', validFn: (ext, mime) => mime === 'image/gif' || /^gif$/i.test(ext) },
    'bmp-to-jpg': { target: 'jpeg', accept: '.bmp,image/bmp', srcName: 'BMP', validFn: (ext, mime) => mime === 'image/bmp' || /^bmp$/i.test(ext) },
    'bmp-to-png': { target: 'png', accept: '.bmp,image/bmp', srcName: 'BMP', validFn: (ext, mime) => mime === 'image/bmp' || /^bmp$/i.test(ext) },
    'svg-to-png': { target: 'png', accept: '.svg,image/svg+xml', srcName: 'SVG', validFn: (ext, mime) => mime === 'image/svg+xml' || /^svg$/i.test(ext) },
    'svg-to-jpg': { target: 'jpeg', accept: '.svg,image/svg+xml', srcName: 'SVG', validFn: (ext, mime) => mime === 'image/svg+xml' || /^svg$/i.test(ext) }
  };

  function setPreset(preset) {
    currentPreset = preset;
    const config = PRESET_MAP[preset];
    if (config) {
      if (dom.targetFormatSelect) dom.targetFormatSelect.value = config.target;
      if (dom.fileInput) dom.fileInput.accept = config.accept;
    } else {
      if (dom.fileInput) dom.fileInput.accept = 'image/*,.svg';
    }
    updateSettingsVisibility();
  }

  function updateSettingsVisibility() {
    const format = dom.targetFormatSelect.value;
    // Quality slider only relevant for lossy formats (JPEG, WebP)
    if (format === 'png') {
      dom.qualityRow.classList.add('hidden');
    } else {
      dom.qualityRow.classList.remove('hidden');
    }

    // Background color only relevant when converting to format without transparency support (JPEG)
    if (format === 'jpeg') {
      dom.bgColorRow.classList.remove('hidden');
    } else {
      dom.bgColorRow.classList.add('hidden');
    }
  }

  async function handleFiles(newFiles) {
    if (!newFiles || newFiles.length === 0) return;

    let validImages = [];
    let invalidFiles = [];

    const config = PRESET_MAP[currentPreset];

    for (const file of newFiles) {
      const ext = Utils.getExtension(file.name);
      const isImage = file.type.startsWith('image/') || /^(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(ext);

      if (config) {
        if (config.validFn(ext, file.type)) {
          validImages.push(file);
        } else {
          invalidFiles.push({
            name: file.name,
            msg: `"${file.name}" is not a ${config.srcName} file. Please upload ${config.srcName} files for this tool.`
          });
        }
      } else {
        if (isImage) {
          validImages.push(file);
        } else {
          invalidFiles.push({ name: file.name, msg: `"${file.name}" is not a supported image file.` });
        }
      }
    }

    if (invalidFiles.length > 0) {
      Utils.showToast(invalidFiles[0].msg, 'warning');
    }

    if (validImages.length === 0) {
      return;
    }

    showProgress(15, 'Reading images...');
    Utils.setProcessing(true);

    try {
      for (const file of validImages) {
        const dataUrl = await Utils.readFileAsDataURL(file);
        files.push({
          file,
          name: file.name,
          dataUrl,
          convertedBlob: null,
          convertedUrl: null,
          outputExt: null
        });
      }

      dom.emptyState.classList.add('hidden');
      dom.workspace.classList.remove('hidden');
      updateSettingsVisibility();
      renderGrid();
      Utils.showToast(`Added ${validImages.length} image(s). Choose target format and click Convert.`, 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Error loading images: ' + err.message, 'error');
    } finally {
      Utils.setProcessing(false);
      hideProgress();
    }
  }

  function renderGrid() {
    dom.fileGrid.innerHTML = '';
    files.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'conv-card';

      const origExt = Utils.getExtension(item.name).toUpperCase();
      const statusBadge = item.convertedBlob
        ? `<span class="badge badge-success">Converted (${Utils.formatBytes(item.convertedBlob.size)})</span>`
        : `<span class="badge badge-neutral">${Utils.formatBytes(item.file.size)}</span>`;

      card.innerHTML = `
        <div class="conv-card-preview">
          <img src="${item.convertedUrl || item.dataUrl}" alt="${item.name}">
        </div>
        <div class="conv-card-info">
          <p class="conv-card-name" title="${item.name}">${item.name}</p>
          <div class="conv-card-meta">
            <span class="badge badge-info">${origExt}</span>
            ${statusBadge}
          </div>
        </div>
        <div class="conv-card-actions">
          ${item.convertedBlob
            ? `<button class="btn btn-sm btn-primary conv-dl-btn" data-index="${index}">Download</button>`
            : ''
          }
          <button class="btn btn-sm btn-ghost conv-del-btn" data-index="${index}" title="Remove">&times;</button>
        </div>
      `;

      card.querySelector('.conv-del-btn').addEventListener('click', () => {
        removeFile(index);
      });

      const dlBtn = card.querySelector('.conv-dl-btn');
      if (dlBtn) {
        dlBtn.addEventListener('click', () => {
          downloadSingle(index);
        });
      }

      dom.fileGrid.appendChild(card);
    });

    const hasConverted = files.some(f => f.convertedBlob);
    dom.downloadAllBtn.disabled = !hasConverted;
  }

  function removeFile(index) {
    if (files[index].convertedUrl) {
      URL.revokeObjectURL(files[index].convertedUrl);
    }
    files.splice(index, 1);
    if (files.length === 0) {
      resetTool();
      return;
    }
    renderGrid();
  }

  async function convertAll() {
    if (files.length === 0) return;

    const targetFormat = dom.targetFormatSelect.value; // 'jpeg', 'png', 'webp'
    const quality = parseInt(dom.qualitySlider.value, 10) / 100;
    const bgColor = dom.bgColorPicker.value || '#FFFFFF';

    const mime = `image/${targetFormat}`;
    const targetExt = targetFormat === 'jpeg' ? 'jpg' : targetFormat;

    Utils.setProcessing(true);
    showProgress(10, `Converting files to ${targetExt.toUpperCase()}...`);

    try {
      for (let i = 0; i < files.length; i++) {
        const item = files[i];
        const pct = Math.round(((i + 1) / files.length) * 90);
        showProgress(pct, `Converting (${i + 1}/${files.length}): ${item.name}`);

        const img = await Utils.loadImage(item.dataUrl);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');

        // Transparency fill for JPEG
        if (targetFormat === 'jpeg') {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(img, 0, 0);

        const blob = await Utils.canvasToBlob(canvas, mime, quality);

        if (item.convertedUrl) URL.revokeObjectURL(item.convertedUrl);
        item.convertedBlob = blob;
        item.convertedUrl = URL.createObjectURL(blob);
        item.outputExt = targetExt;
      }

      renderGrid();
      showProgress(100, 'Conversion Complete!');
      setTimeout(hideProgress, 800);
      Utils.showToast(`Successfully converted ${files.length} file(s) to ${targetExt.toUpperCase()}!`, 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Conversion failed: ' + err.message, 'error');
      hideProgress();
    } finally {
      Utils.setProcessing(false);
    }
  }

  function downloadSingle(index) {
    const item = files[index];
    if (!item || !item.convertedBlob) return;
    const base = Utils.getBaseName(item.name);
    const filename = `${base}-converted.${item.outputExt}`;
    Utils.downloadBlob(item.convertedBlob, filename);
  }

  async function downloadAllAsZip() {
    const convertedItems = files.filter(f => f.convertedBlob);
    if (convertedItems.length === 0) return;

    if (convertedItems.length === 1) {
      downloadSingle(files.indexOf(convertedItems[0]));
      return;
    }

    const zipFiles = convertedItems.map((item, idx) => ({
      name: `${Utils.getBaseName(item.name)}.${item.outputExt}`,
      blob: item.convertedBlob
    }));

    showProgress(50, 'Packaging ZIP archive...');
    await Utils.downloadAsZip(zipFiles, `fileforge-converted-images.zip`, (pct, txt) => {
      showProgress(pct, txt);
    });
    hideProgress();
  }

  function resetTool() {
    files.forEach(f => {
      if (f.convertedUrl) URL.revokeObjectURL(f.convertedUrl);
    });
    files = [];
    dom.emptyState.classList.remove('hidden');
    dom.workspace.classList.add('hidden');
    dom.downloadAllBtn.disabled = true;
    dom.fileGrid.innerHTML = '';
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
    setPreset,
    reset: resetTool
  };
})();

window.ImageConverter = ImageConverter;
