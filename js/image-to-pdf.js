/**
 * FileForge - Image to PDF Tool (JPG to PDF & PNG to PDF)
 * Compiles multiple images into a professional PDF with reordering, A4/Letter sizing, orientation, and margin options.
 */

const ImageToPDF = (() => {
  let imageList = []; // { file, name, dataUrl, width, height }
  let generatedPdfBlob = null;

  let dom = {};

  function init() {
    dom = {
      container: document.getElementById('tool-image-to-pdf'),
      dropzone: document.getElementById('i2p-dropzone'),
      fileInput: document.getElementById('i2p-file-input'),
      browseBtn: document.getElementById('i2p-browse-btn'),
      workspace: document.getElementById('i2p-workspace'),
      emptyState: document.getElementById('i2p-empty-state'),
      imageListContainer: document.getElementById('i2p-image-list'),
      
      // Settings
      pageSizeSelect: document.getElementById('i2p-page-size'),
      orientationSelect: document.getElementById('i2p-orientation'),
      marginSelect: document.getElementById('i2p-margin'),
      imageFitSelect: document.getElementById('i2p-image-fit'),
      
      // Actions
      generateBtn: document.getElementById('i2p-generate-btn'),
      downloadBtn: document.getElementById('i2p-download-btn'),
      resetBtn: document.getElementById('i2p-reset-btn'),
      progressBar: document.getElementById('i2p-progress-bar'),
      progressContainer: document.getElementById('i2p-progress-container'),
      progressText: document.getElementById('i2p-progress-text')
    };

    if (!dom.container) return;

    bindEvents();
  }

  let currentPreset = 'jpg-to-pdf'; // 'jpg-to-pdf' | 'png-to-pdf' | 'general'

  function setPreset(preset) {
    currentPreset = preset;
    if (dom.fileInput) {
      if (preset === 'jpg-to-pdf') {
        dom.fileInput.accept = '.jpg,.jpeg,image/jpeg';
      } else if (preset === 'png-to-pdf') {
        dom.fileInput.accept = '.png,image/png';
      } else {
        dom.fileInput.accept = 'image/*';
      }
    }
  }

  function bindEvents() {
    Utils.setupDropZone(dom.dropzone, handleFiles, ['image/', '.jpg', '.jpeg', '.png', '.webp']);
    dom.browseBtn.addEventListener('click', () => dom.fileInput.click());
    dom.fileInput.addEventListener('change', (e) => {
      handleFiles(Array.from(e.target.files));
      dom.fileInput.value = '';
    });

    dom.generateBtn.addEventListener('click', generatePDF);
    dom.downloadBtn.addEventListener('click', downloadPDF);
    dom.resetBtn.addEventListener('click', resetTool);
  }

  async function handleFiles(newFiles) {
    if (!newFiles || newFiles.length === 0) return;

    // Strict validation based on current tool preset
    let valid = [];
    let invalidFiles = [];

    for (const f of newFiles) {
      const ext = Utils.getExtension(f.name);
      const isJpg = f.type === 'image/jpeg' || /^(jpg|jpeg)$/i.test(ext);
      const isPng = f.type === 'image/png' || /^png$/i.test(ext);
      const isImage = f.type.startsWith('image/') || /^(jpg|jpeg|png|webp|bmp|gif)$/i.test(ext);

      if (currentPreset === 'jpg-to-pdf') {
        if (isJpg) {
          valid.push(f);
        } else {
          invalidFiles.push({ name: f.name, ext: ext || f.type, expected: 'JPG/JPEG' });
        }
      } else if (currentPreset === 'png-to-pdf') {
        if (isPng) {
          valid.push(f);
        } else {
          invalidFiles.push({ name: f.name, ext: ext || f.type, expected: 'PNG' });
        }
      } else {
        if (isImage) {
          valid.push(f);
        } else {
          invalidFiles.push({ name: f.name, ext: ext || f.type, expected: 'Image' });
        }
      }
    }

    // Handle invalid formats
    if (invalidFiles.length > 0) {
      const first = invalidFiles[0];
      if (currentPreset === 'jpg-to-pdf') {
        Utils.showToast(`"${first.name}" is a ${first.ext.toUpperCase()} file. Please upload JPG/JPEG files for JPG to PDF.`, 'warning');
      } else if (currentPreset === 'png-to-pdf') {
        Utils.showToast(`"${first.name}" is a ${first.ext.toUpperCase()} file. Please upload PNG files for PNG to PDF.`, 'warning');
      } else {
        Utils.showToast(`Please upload supported image files. "${first.name}" is not supported.`, 'warning');
      }
    }

    if (valid.length === 0) {
      return;
    }

    Utils.setProcessing(true);
    showProgress(15, 'Loading image files...');

    try {
      for (const file of valid) {
        const dataUrl = await Utils.readFileAsDataURL(file);
        const img = await Utils.loadImage(dataUrl);

        imageList.push({
          file,
          name: file.name,
          dataUrl,
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      }

      dom.emptyState.classList.add('hidden');
      dom.workspace.classList.remove('hidden');
      dom.downloadBtn.classList.add('hidden');
      dom.generateBtn.classList.remove('hidden');

      renderList();
      Utils.showToast(`Added ${valid.length} image(s). Configure layout and click Generate PDF!`, 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Failed to load images: ' + err.message, 'error');
    } finally {
      Utils.setProcessing(false);
      hideProgress();
    }
  }

  function renderList() {
    dom.imageListContainer.innerHTML = '';

    imageList.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'i2p-item-card';
      card.draggable = true;
      card.dataset.index = index;

      card.innerHTML = `
        <div class="i2p-drag-handle" title="Drag to reorder">
          <svg viewBox="0 0 20 20" fill="currentColor"><path d="M7 2a2 2 0 100 4 2 2 0 000-4zm6 0a2 2 0 100 4 2 2 0 000-4zm-6 6a2 2 0 100 4 2 2 0 000-4zm6 0a2 2 0 100 4 2 2 0 000-4zm-6 6a2 2 0 100 4 2 2 0 000-4zm6 0a2 2 0 100 4 2 2 0 000-4z"/></svg>
        </div>
        <div class="i2p-item-preview">
          <img src="${item.dataUrl}" alt="Page ${index + 1}">
        </div>
        <div class="i2p-item-info">
          <span class="i2p-page-badge">Page ${index + 1}</span>
          <p class="i2p-item-name" title="${item.name}">${item.name}</p>
          <span class="i2p-item-dims">${item.width} × ${item.height} px</span>
        </div>
        <div class="i2p-item-actions">
          <button type="button" class="btn-icon i2p-move-up" title="Move Up" ${index === 0 ? 'disabled' : ''}>↑</button>
          <button type="button" class="btn-icon i2p-move-down" title="Move Down" ${index === imageList.length - 1 ? 'disabled' : ''}>↓</button>
          <button type="button" class="btn-icon i2p-remove" title="Remove">&times;</button>
        </div>
      `;

      // Drag and drop reordering
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', index);
        card.classList.add('dragging');
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
      });
      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        card.classList.add('drag-target');
      });
      card.addEventListener('dragleave', () => {
        card.classList.remove('drag-target');
      });
      card.addEventListener('drop', (e) => {
        e.preventDefault();
        card.classList.remove('drag-target');
        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
        const toIndex = index;
        if (fromIndex !== toIndex) {
          const moved = imageList.splice(fromIndex, 1)[0];
          imageList.splice(toIndex, 0, moved);
          renderList();
        }
      });

      // Button actions
      card.querySelector('.i2p-move-up').addEventListener('click', () => {
        if (index > 0) {
          const temp = imageList[index];
          imageList[index] = imageList[index - 1];
          imageList[index - 1] = temp;
          renderList();
        }
      });

      card.querySelector('.i2p-move-down').addEventListener('click', () => {
        if (index < imageList.length - 1) {
          const temp = imageList[index];
          imageList[index] = imageList[index + 1];
          imageList[index + 1] = temp;
          renderList();
        }
      });

      card.querySelector('.i2p-remove').addEventListener('click', () => {
        imageList.splice(index, 1);
        if (imageList.length === 0) {
          resetTool();
          return;
        }
        renderList();
      });

      dom.imageListContainer.appendChild(card);
    });

    dom.generateBtn.disabled = imageList.length === 0;
  }

  async function generatePDF() {
    if (imageList.length === 0) return;

    Utils.setProcessing(true);
    showProgress(10, 'Initializing PDF document...');

    const pageSizeSetting = dom.pageSizeSelect.value; // 'a4', 'letter', 'original'
    const orientationSetting = dom.orientationSelect.value; // 'portrait', 'landscape', 'auto'
    const marginSetting = parseInt(dom.marginSelect.value, 10) || 0; // 0, 15, 36
    const fitSetting = dom.imageFitSelect.value; // 'contain', 'cover'

    try {
      const pdfDoc = await PDFLib.PDFDocument.create();

      for (let i = 0; i < imageList.length; i++) {
        const item = imageList[i];
        const pct = Math.round(((i + 1) / imageList.length) * 85);
        showProgress(pct, `Adding image ${i + 1} of ${imageList.length}...`);

        // Convert image to clean JPEG or PNG bytes for embedding
        const img = await Utils.loadImage(item.dataUrl);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // Always encode to PNG or JPEG based on transparency
        const hasAlpha = item.file.type === 'image/png' || item.file.type === 'image/webp';
        let embeddedImage = null;

        if (hasAlpha) {
          const pngBlob = await Utils.canvasToBlob(canvas, 'image/png');
          const pngBytes = await pngBlob.arrayBuffer();
          embeddedImage = await pdfDoc.embedPng(pngBytes);
        } else {
          const jpgBlob = await Utils.canvasToBlob(canvas, 'image/jpeg', 0.92);
          const jpgBytes = await jpgBlob.arrayBuffer();
          embeddedImage = await pdfDoc.embedJpg(jpgBytes);
        }

        // Determine Page Dimensions
        let pageWidth = 595.28; // A4 pt
        let pageHeight = 841.89;

        if (pageSizeSetting === 'letter') {
          pageWidth = 612;
          pageHeight = 792;
        } else if (pageSizeSetting === 'original') {
          pageWidth = item.width;
          pageHeight = item.height;
        }

        // Determine Orientation
        let isLandscape = false;
        if (orientationSetting === 'landscape') {
          isLandscape = true;
        } else if (orientationSetting === 'auto') {
          isLandscape = item.width > item.height;
        }

        if (pageSizeSetting !== 'original') {
          if (isLandscape && pageWidth < pageHeight) {
            const temp = pageWidth;
            pageWidth = pageHeight;
            pageHeight = temp;
          } else if (!isLandscape && pageWidth > pageHeight) {
            const temp = pageWidth;
            pageWidth = pageHeight;
            pageHeight = temp;
          }
        }

        const page = pdfDoc.addPage([pageWidth, pageHeight]);

        // Usable area with margins
        const usableWidth = Math.max(10, pageWidth - marginSetting * 2);
        const usableHeight = Math.max(10, pageHeight - marginSetting * 2);

        // Calculate fitted width and height
        let drawWidth = usableWidth;
        let drawHeight = usableHeight;
        const imgRatio = item.width / item.height;
        const areaRatio = usableWidth / usableHeight;

        if (fitSetting === 'contain') {
          if (imgRatio > areaRatio) {
            drawWidth = usableWidth;
            drawHeight = usableWidth / imgRatio;
          } else {
            drawHeight = usableHeight;
            drawWidth = usableHeight * imgRatio;
          }
        }

        // Center on page
        const drawX = marginSetting + (usableWidth - drawWidth) / 2;
        const drawY = marginSetting + (usableHeight - drawHeight) / 2;

        page.drawImage(embeddedImage, {
          x: drawX,
          y: drawY,
          width: drawWidth,
          height: drawHeight
        });
      }

      showProgress(92, 'Generating final PDF file...');
      const pdfBytes = await pdfDoc.save();
      generatedPdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });

      showProgress(100, 'PDF Ready!');
      setTimeout(hideProgress, 800);

      dom.generateBtn.classList.add('hidden');
      dom.downloadBtn.classList.remove('hidden');
      Utils.showToast(`Successfully created PDF with ${imageList.length} page(s)!`, 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('PDF generation failed: ' + err.message, 'error');
      hideProgress();
    } finally {
      Utils.setProcessing(false);
    }
  }

  function downloadPDF() {
    if (!generatedPdfBlob) return;
    const filename = `fileforge-document-${Date.now().toString().slice(-4)}.pdf`;
    Utils.downloadBlob(generatedPdfBlob, filename);
  }

  function resetTool() {
    imageList = [];
    generatedPdfBlob = null;
    dom.emptyState.classList.remove('hidden');
    dom.workspace.classList.add('hidden');
    dom.imageListContainer.innerHTML = '';
    dom.downloadBtn.classList.add('hidden');
    dom.generateBtn.classList.remove('hidden');
    dom.generateBtn.disabled = true;
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

window.ImageToPDF = ImageToPDF;
