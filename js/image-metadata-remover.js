/**
 * FileForge - Image Metadata Remover Tool (EXIF & Privacy Stripper)
 * Strip EXIF, GPS location tags, camera details, timestamps, and hidden metadata from photos for 100% privacy.
 */

const ImageMetadataRemover = (() => {
  let fileItems = []; // Array of { file, name, size, dataUrl, cleanBlob, cleanSize }

  let dom = {};

  function init() {
    dom = {
      container: document.getElementById('tool-image-metadata-remover'),
      dropzone: document.getElementById('imr-dropzone'),
      fileInput: document.getElementById('imr-file-input'),
      browseBtn: document.getElementById('imr-browse-btn'),
      workspace: document.getElementById('imr-workspace'),
      emptyState: document.getElementById('imr-empty-state'),
      fileListContainer: document.getElementById('imr-file-list'),
      
      // Settings
      qualitySlider: document.getElementById('imr-quality'),
      qualityVal: document.getElementById('imr-quality-val'),
      
      // Actions
      stripBtn: document.getElementById('imr-strip-btn'),
      downloadAllBtn: document.getElementById('imr-download-all-btn'),
      resetBtn: document.getElementById('imr-reset-btn'),
      progressBar: document.getElementById('imr-progress-bar'),
      progressContainer: document.getElementById('imr-progress-container'),
      progressText: document.getElementById('imr-progress-text')
    };

    if (!dom.container) return;

    bindEvents();
  }

  function bindEvents() {
    Utils.setupDropZone(dom.dropzone, handleFiles, ['image/', '.jpg', '.jpeg', '.png', '.webp']);
    dom.browseBtn.addEventListener('click', () => dom.fileInput.click());
    dom.fileInput.addEventListener('change', (e) => {
      handleFiles(Array.from(e.target.files));
      dom.fileInput.value = '';
    });

    if (dom.qualitySlider) {
      dom.qualitySlider.addEventListener('input', (e) => {
        dom.qualityVal.textContent = e.target.value + '%';
      });
    }

    dom.stripBtn.addEventListener('click', stripAllMetadata);
    dom.downloadAllBtn.addEventListener('click', downloadAllClean);
    dom.resetBtn.addEventListener('click', resetTool);
  }

  async function handleFiles(files) {
    if (!files || files.length === 0) return;

    const pdfFiles = files.filter(f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
    if (pdfFiles.length > 0) {
      Utils.showToast(`You uploaded a PDF file ("${pdfFiles[0].name}"). Please use PDF Metadata Editor for PDFs.`, 'warning');
      return;
    }

    const validImages = files.filter(f => f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(f.name));
    if (validImages.length === 0) {
      Utils.showToast('Please upload valid image files (JPG, PNG, WebP).', 'warning');
      return;
    }

    Utils.setProcessing(true);
    showProgress(25, 'Loading photos and inspecting metadata...');

    try {
      for (const file of validImages) {
        const dataUrl = await Utils.readFileAsDataURL(file);
        fileItems.push({
          file,
          name: file.name,
          size: file.size,
          dataUrl,
          cleanBlob: null,
          cleanSize: 0
        });
      }

      dom.emptyState.classList.add('hidden');
      dom.workspace.classList.remove('hidden');
      dom.downloadAllBtn.classList.add('hidden');
      dom.stripBtn.classList.remove('hidden');
      dom.stripBtn.disabled = false;

      renderList();
      Utils.showToast(`Added ${validImages.length} image(s). Click "Remove Metadata" to strip EXIF & GPS data.`, 'info');
    } catch (err) {
      console.error(err);
      Utils.showToast('Error loading images: ' + err.message, 'error');
    } finally {
      Utils.setProcessing(false);
      hideProgress();
    }
  }

  function renderList() {
    dom.fileListContainer.innerHTML = '';

    fileItems.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'metric-card';
      card.style.cssText = 'display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; margin-bottom: 8px;';

      card.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
          <img src="${item.dataUrl}" alt="${item.name}" style="width: 44px; height: 44px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border-color, rgba(255,255,255,0.1)); flex-shrink: 0;">
          <div style="min-width: 0;">
            <p style="font-weight: 600; font-size: 0.9rem; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name}</p>
            <span style="font-size: 0.78rem; color: var(--text-secondary, #94a3b8);">${Utils.formatBytes(item.size)} &bull; ${item.cleanBlob ? '<span class="badge badge-success">✓ Cleaned</span>' : '<span class="badge badge-warning">Contains EXIF</span>'}</span>
          </div>
        </div>
        <div>
          ${item.cleanBlob 
            ? `<button type="button" class="btn btn-sm btn-success imr-dl-single" data-index="${index}">Download</button>` 
            : `<button type="button" class="btn-icon imr-remove-single" data-index="${index}" title="Remove">&times;</button>`
          }
        </div>
      `;

      const removeBtn = card.querySelector('.imr-remove-single');
      if (removeBtn) {
        removeBtn.addEventListener('click', () => {
          fileItems.splice(index, 1);
          if (fileItems.length === 0) resetTool();
          else renderList();
        });
      }

      const dlBtn = card.querySelector('.imr-dl-single');
      if (dlBtn) {
        dlBtn.addEventListener('click', () => {
          const base = Utils.getBaseName(item.name);
          const ext = Utils.getExtension(item.name) || 'jpg';
          Utils.downloadBlob(item.cleanBlob, `${base}-clean.${ext}`);
        });
      }

      dom.fileListContainer.appendChild(card);
    });
  }

  async function stripAllMetadata() {
    if (fileItems.length === 0) return;

    Utils.setProcessing(true);
    const quality = (parseInt(dom.qualitySlider ? dom.qualitySlider.value : 92, 10) || 92) / 100;
    const total = fileItems.length;

    try {
      for (let i = 0; i < total; i++) {
        const item = fileItems[i];
        showProgress(20 + Math.round((i / total) * 75), `Sanitizing image ${i + 1} of ${total}...`);
        await yieldToUI();

        const img = await Utils.loadImage(item.dataUrl);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0);

        const ext = Utils.getExtension(item.name);
        let mime = 'image/jpeg';
        if (ext === 'png') mime = 'image/png';
        else if (ext === 'webp') mime = 'image/webp';

        // Re-encoding directly removes all EXIF/GPS APP segments
        const blob = await Utils.canvasToBlob(canvas, mime, quality);
        item.cleanBlob = blob;
        item.cleanSize = blob.size;
      }

      renderList();
      dom.stripBtn.classList.add('hidden');
      dom.downloadAllBtn.classList.remove('hidden');
      dom.downloadAllBtn.disabled = false;

      Utils.showToast(`Privacy protection complete! Stripped EXIF & location data from ${total} image(s). 🛡️`, 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Error sanitizing metadata: ' + err.message, 'error');
    } finally {
      Utils.setProcessing(false);
      hideProgress();
    }
  }

  async function downloadAllClean() {
    if (fileItems.length === 0) return;
    if (fileItems.length === 1) {
      const item = fileItems[0];
      const base = Utils.getBaseName(item.name);
      const ext = Utils.getExtension(item.name) || 'jpg';
      Utils.downloadBlob(item.cleanBlob, `${base}-clean.${ext}`);
      return;
    }

    const packageFiles = fileItems.map(item => {
      const base = Utils.getBaseName(item.name);
      const ext = Utils.getExtension(item.name) || 'jpg';
      return {
        name: `${base}-clean.${ext}`,
        blob: item.cleanBlob
      };
    });

    await Utils.downloadAsZip(packageFiles, 'fileforge-clean-images.zip', showProgress);
  }

  function resetTool() {
    fileItems = [];
    if (dom.emptyState) dom.emptyState.classList.remove('hidden');
    if (dom.workspace) dom.workspace.classList.add('hidden');
    if (dom.fileListContainer) dom.fileListContainer.innerHTML = '';
    if (dom.downloadAllBtn) dom.downloadAllBtn.classList.add('hidden');
    if (dom.stripBtn) {
      dom.stripBtn.classList.remove('hidden');
      dom.stripBtn.disabled = false;
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

window.ImageMetadataRemover = ImageMetadataRemover;
