/**
 * FileForge - Image Preview & Inspector Tool
 * Multi-format viewer with smooth zoom, pan, rotation, aspect ratio analyzer, and image metadata inspector.
 */

const ImagePreviewTool = (() => {
  let currentFile = null;
  let originalImage = null;
  let zoomLevel = 1.0;
  let rotationDeg = 0;
  let isPanning = false;
  let startX = 0, startY = 0;
  let translateX = 0, translateY = 0;

  let dom = {};

  function init() {
    dom = {
      container: document.getElementById('tool-image-preview-tool'),
      dropzone: document.getElementById('ipt-dropzone'),
      fileInput: document.getElementById('ipt-file-input'),
      browseBtn: document.getElementById('ipt-browse-btn'),
      workspace: document.getElementById('ipt-workspace'),
      emptyState: document.getElementById('ipt-empty-state'),
      
      // Stage & Viewport
      viewport: document.getElementById('ipt-viewport'),
      imgElement: document.getElementById('ipt-display-img'),
      
      // Metrics & Details
      fileNameText: document.getElementById('ipt-file-name'),
      fileSizeText: document.getElementById('ipt-file-size'),
      dimensionsText: document.getElementById('ipt-dims'),
      aspectRatioText: document.getElementById('ipt-aspect'),
      mimeTypeText: document.getElementById('ipt-mime'),
      zoomLevelText: document.getElementById('ipt-zoom-val'),
      
      // Control Buttons
      zoomInBtn: document.getElementById('ipt-zoom-in'),
      zoomOutBtn: document.getElementById('ipt-zoom-out'),
      zoomFitBtn: document.getElementById('ipt-zoom-fit'),
      zoomActualBtn: document.getElementById('ipt-zoom-actual'),
      rotateCwBtn: document.getElementById('ipt-rotate-cw'),
      rotateCcwBtn: document.getElementById('ipt-rotate-ccw'),
      resetBtn: document.getElementById('ipt-reset-btn')
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

    if (dom.zoomInBtn) dom.zoomInBtn.addEventListener('click', () => setZoom(zoomLevel * 1.25));
    if (dom.zoomOutBtn) dom.zoomOutBtn.addEventListener('click', () => setZoom(zoomLevel / 1.25));
    if (dom.zoomFitBtn) dom.zoomFitBtn.addEventListener('click', fitToScreen);
    if (dom.zoomActualBtn) dom.zoomActualBtn.addEventListener('click', () => setZoom(1.0));
    
    if (dom.rotateCwBtn) dom.rotateCwBtn.addEventListener('click', () => rotateBy(90));
    if (dom.rotateCcwBtn) dom.rotateCcwBtn.addEventListener('click', () => rotateBy(-90));

    // Interactive Drag & Pan inside viewport
    if (dom.viewport) {
      dom.viewport.addEventListener('mousedown', (e) => {
        isPanning = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
        dom.viewport.style.cursor = 'grabbing';
      });

      window.addEventListener('mousemove', (e) => {
        if (!isPanning) return;
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        updateTransform();
      });

      window.addEventListener('mouseup', () => {
        if (isPanning) {
          isPanning = false;
          if (dom.viewport) dom.viewport.style.cursor = 'grab';
        }
      });

      // Mouse wheel zoom
      dom.viewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.85 : 1.15;
        setZoom(zoomLevel * delta);
      }, { passive: false });
    }

    if (dom.resetBtn) dom.resetBtn.addEventListener('click', resetTool);
  }

  async function handleFiles(files) {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.type.startsWith('image/') && !/\.(jpg|jpeg|png|webp|gif|bmp|svg|ico)$/i.test(file.name)) {
      Utils.showToast(`Invalid image file ("${file.name}"). Please upload an image format.`, 'warning');
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

      // Populate file info metrics
      dom.fileNameText.textContent = file.name;
      dom.fileSizeText.textContent = Utils.formatBytes(file.size);
      dom.dimensionsText.textContent = `${img.naturalWidth} × ${img.naturalHeight} px`;
      dom.mimeTypeText.textContent = file.type || 'image/' + Utils.getExtension(file.name);
      
      const gcdVal = gcd(img.naturalWidth, img.naturalHeight);
      const aspectW = Math.round(img.naturalWidth / gcdVal);
      const aspectH = Math.round(img.naturalHeight / gcdVal);
      dom.aspectRatioText.textContent = `${aspectW}:${aspectH} (${(img.naturalWidth / img.naturalHeight).toFixed(2)})`;

      dom.imgElement.src = dataUrl;

      dom.emptyState.classList.add('hidden');
      dom.workspace.classList.remove('hidden');

      fitToScreen();
      Utils.showToast(`Loaded "${file.name}" in inspector.`, 'info');
    } catch (err) {
      console.error(err);
      Utils.showToast('Failed to load image: ' + err.message, 'error');
      resetTool();
    } finally {
      Utils.setProcessing(false);
    }
  }

  function gcd(a, b) {
    return b === 0 ? a : gcd(b, a % b);
  }

  function setZoom(val) {
    zoomLevel = Math.max(0.1, Math.min(val, 10.0));
    if (dom.zoomLevelText) dom.zoomLevelText.textContent = `${Math.round(zoomLevel * 100)}%`;
    updateTransform();
  }

  function rotateBy(deg) {
    rotationDeg = (rotationDeg + deg) % 360;
    updateTransform();
  }

  function fitToScreen() {
    translateX = 0;
    translateY = 0;
    rotationDeg = 0;
    zoomLevel = 1.0;
    if (dom.zoomLevelText) dom.zoomLevelText.textContent = '100%';
    updateTransform();
  }

  function updateTransform() {
    if (!dom.imgElement) return;
    dom.imgElement.style.transform = `translate(${translateX}px, ${translateY}px) rotate(${rotationDeg}deg) scale(${zoomLevel})`;
  }

  function resetTool() {
    currentFile = null;
    originalImage = null;
    zoomLevel = 1.0;
    rotationDeg = 0;
    translateX = 0;
    translateY = 0;

    if (dom.emptyState) dom.emptyState.classList.remove('hidden');
    if (dom.workspace) dom.workspace.classList.add('hidden');
    if (dom.imgElement) dom.imgElement.src = '';
  }

  return {
    init,
    handleFiles,
    reset: resetTool
  };
})();

window.ImagePreviewTool = ImagePreviewTool;
