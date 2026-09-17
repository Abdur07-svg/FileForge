/**
 * FileForge Mobile - Main Application Controller
 * Handles Navigation, State Reset, Tool Search, and Interactive Mobile Controllers
 */
const MobileApp = (() => {

  // Active state for currently opened tool
  let currentToolId = null;
  let activeToolState = {};

  // Tool metadata definition
  const TOOLS = [
    {
      id: 'image-compressor',
      name: 'Image Compressor',
      category: 'image',
      desc: 'Reduce image file size quickly',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242M12 12v9m-4-4 4 4 4-4"/></svg>'
    },
    {
      id: 'pdf-compressor',
      name: 'PDF Compressor',
      category: 'pdf',
      desc: 'Compress and reduce PDF size',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6m-3 3 3 3 3-3"/></svg>'
    },
    {
      id: 'image-to-pdf',
      name: 'Image to PDF',
      category: 'pdf',
      desc: 'Convert multiple images to PDF',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>'
    },
    {
      id: 'pdf-to-jpg',
      name: 'PDF to JPG',
      category: 'pdf',
      desc: 'Extract PDF pages as JPG images',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M10 13l2 2 4-4"/></svg>'
    },
    {
      id: 'pdf-to-png',
      name: 'PDF to PNG',
      category: 'pdf',
      desc: 'Extract PDF pages as PNG images',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><circle cx="12" cy="14" r="3"/></svg>'
    },
    {
      id: 'jpg-to-png',
      name: 'JPG to PNG',
      category: 'image',
      desc: 'Convert JPG to lossless PNG',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 15 3-3 3 3"/></svg>'
    },
    {
      id: 'png-to-jpg',
      name: 'PNG to JPG',
      category: 'image',
      desc: 'Convert PNG to compact JPG',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 9 3 3 3-3"/></svg>'
    },
    {
      id: 'image-resizer',
      name: 'Image Resizer',
      category: 'image',
      desc: 'Resize image dimensions & scale',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>'
    },
    {
      id: 'image-converter',
      name: 'Image Converter',
      category: 'image',
      desc: 'Convert JPG, PNG, WebP formats',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>'
    },
    {
      id: 'pdf-merger',
      name: 'PDF Merger',
      category: 'pdf',
      desc: 'Combine multiple PDF files into one',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 2h8a2 2 0 0 1 2 2v12"/><path d="M4 6h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/></svg>'
    },
    {
      id: 'pdf-splitter',
      name: 'PDF Splitter',
      category: 'pdf',
      desc: 'Divide PDF by page ranges',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="18" rx="1"/><path d="M12 6v12" stroke-dasharray="2 2"/></svg>'
    },
    {
      id: 'pdf-page-extractor',
      name: 'PDF Page Extractor',
      category: 'pdf',
      desc: 'Extract specific pages from PDF',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 12 18 15 15"/></svg>'
    },
    {
      id: 'zip-creator',
      name: 'ZIP File Creator',
      category: 'archive',
      desc: 'Create ZIP archive with files & folders',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>'
    },
    {
      id: 'zip-extractor',
      name: 'ZIP File Extractor',
      category: 'archive',
      desc: 'Unzip archive and inspect files',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><polyline points="9 13 12 10 15 13"/><line x1="12" y1="10" x2="12" y2="17"/></svg>'
    },
    {
      id: 'download-all-zip',
      name: 'Download All as ZIP',
      category: 'archive',
      desc: 'Pack multiple files to a ZIP',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>'
    }
  ];

  /**
   * Initialize App Shell, Event Listeners and Routing
   */
  function init() {
    renderToolCards();
    initNavigation();
    initSearchAndFilter();
    initToolControllers();

    // Check initial hash route
    handleHashChange();
  }

  /**
   * Render Home Screen Tool Cards
   */
  function renderToolCards() {
    const grid = document.getElementById('mobile-tool-grid');
    if (!grid) return;

    grid.innerHTML = TOOLS.map(tool => `
      <a href="#${tool.id}" class="mobile-tool-card" data-category="${tool.category}" data-id="${tool.id}">
        <div class="tool-card-icon">${tool.icon}</div>
        <div class="tool-card-info">
          <div class="tool-card-title">${tool.name}</div>
          <div class="tool-card-desc">${tool.desc}</div>
        </div>
        <div class="tool-card-arrow">
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>
        </div>
      </a>
    `).join('');
  }

  /**
   * Setup Hash-based Routing & Android Back Support
   */
  function initNavigation() {
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);

    document.querySelectorAll('.mobile-back-btn, .mobile-home-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.hash = '';
      });
    });
  }

  function handleHashChange() {
    const hash = (window.location.hash || '').replace('#', '').trim();
    if (!hash) {
      showHomeView();
    } else {
      const tool = TOOLS.find(t => t.id === hash);
      if (tool) {
        showToolView(tool.id);
      } else {
        showHomeView();
      }
    }
  }

  function showHomeView() {
    resetState();
    currentToolId = null;

    const homeView = document.getElementById('mobile-home-view');
    const toolContainer = document.getElementById('mobile-tool-container');

    if (homeView) homeView.classList.remove('hidden');
    if (toolContainer) toolContainer.classList.add('hidden');

    window.scrollTo(0, 0);
  }

  function showToolView(toolId) {
    if (currentToolId !== toolId) {
      resetState();
    }
    currentToolId = toolId;

    const homeView = document.getElementById('mobile-home-view');
    const toolContainer = document.getElementById('mobile-tool-container');

    if (homeView) homeView.classList.add('hidden');
    if (toolContainer) toolContainer.classList.remove('hidden');

    // Hide all tool views, show active one
    document.querySelectorAll('.mobile-tool-view').forEach(v => v.classList.add('hidden'));
    const activeView = document.getElementById(`tool-view-${toolId}`);
    if (activeView) {
      activeView.classList.remove('hidden');
    }

    // Scroll to top
    window.scrollTo(0, 0);
  }

  /**
   * Reset State and Free All Allocated Memory / Object URLs
   */
  function resetState() {
    MobileUtils.resetAllUrls();
    activeToolState = {};

    // Reset all file inputs
    document.querySelectorAll('.mobile-file-input').forEach(input => {
      input.value = '';
    });

    // Reset all previews, upload states, and result blocks
    document.querySelectorAll('.mobile-upload-box').forEach(box => box.classList.remove('hidden'));
    document.querySelectorAll('.mobile-file-selected').forEach(sec => sec.classList.add('hidden'));
    document.querySelectorAll('.mobile-result-box').forEach(box => box.classList.add('hidden'));
    document.querySelectorAll('.mobile-progress-wrap').forEach(p => p.classList.add('hidden'));

    // Clear dynamic lists
    document.querySelectorAll('.mobile-dynamic-list').forEach(list => {
      list.innerHTML = '';
    });
  }

  /**
   * Search & Category Chip Filter
   */
  function initSearchAndFilter() {
    const searchInput = document.getElementById('mobile-search-input');
    const chips = document.querySelectorAll('.mobile-filter-chip');
    let activeFilter = 'all';

    function applyFilter() {
      const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
      const cards = document.querySelectorAll('.mobile-tool-card');
      let visibleCount = 0;

      cards.forEach(card => {
        const title = (card.querySelector('.tool-card-title')?.textContent || '').toLowerCase();
        const desc = (card.querySelector('.tool-card-desc')?.textContent || '').toLowerCase();
        const cat = card.getAttribute('data-category');

        const matchesSearch = !query || title.includes(query) || desc.includes(query);
        const matchesCategory = activeFilter === 'all' || cat === activeFilter;

        if (matchesSearch && matchesCategory) {
          card.classList.remove('hidden');
          visibleCount++;
        } else {
          card.classList.add('hidden');
        }
      });

      const emptyMsg = document.getElementById('mobile-search-empty');
      if (emptyMsg) {
        emptyMsg.classList.toggle('hidden', visibleCount > 0);
      }
    }

    if (searchInput) {
      searchInput.addEventListener('input', applyFilter);
    }

    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        activeFilter = chip.getAttribute('data-filter') || 'all';
        applyFilter();
      });
    });
  }

  /**
   * Setup All 15 Mobile Tool Controllers
   */
  function initToolControllers() {
    initImageCompressor();
    initPdfCompressor();
    initImageToPdf();
    initPdfToJpg();
    initPdfToPng();
    initJpgToPng();
    initPngToJpg();
    initImageResizer();
    initImageConverter();
    initPdfMerger();
    initPdfSplitter();
    initPdfPageExtractor();
    initZipCreator();
    initZipExtractor();
    initDownloadAllZip();

    // Accordions / How-to guides
    document.querySelectorAll('.mobile-accordion-header').forEach(header => {
      header.addEventListener('click', () => {
        const parent = header.closest('.mobile-accordion');
        if (parent) parent.classList.toggle('open');
      });
    });
  }

  // --- 1. Image Compressor Controller ---
  function initImageCompressor() {
    const input = document.getElementById('input-image-compressor');
    const box = document.getElementById('upload-image-compressor');
    const selectedSec = document.getElementById('selected-image-compressor');
    const fileNameEl = document.getElementById('name-image-compressor');
    const fileSizeEl = document.getElementById('size-image-compressor');
    const qualitySlider = document.getElementById('quality-image-compressor');
    const qualityVal = document.getElementById('val-quality-image-compressor');
    const actionBtn = document.getElementById('btn-image-compressor');
    const resultBox = document.getElementById('result-image-compressor');
    const resultStats = document.getElementById('stats-image-compressor');
    const previewImg = document.getElementById('preview-image-compressor');
    const downloadBtn = document.getElementById('dl-image-compressor');

    let currentFile = null;
    let compressedResult = null;

    if (qualitySlider && qualityVal) {
      qualitySlider.addEventListener('input', () => {
        qualityVal.textContent = `${Math.round(qualitySlider.value * 100)}%`;
      });
    }

    if (input) {
      input.addEventListener('change', () => {
        if (input.files && input.files[0]) {
          currentFile = input.files[0];
          fileNameEl.textContent = currentFile.name;
          fileSizeEl.textContent = MobileUtils.formatBytes(currentFile.size);
          box.classList.add('hidden');
          selectedSec.classList.remove('hidden');
          resultBox.classList.add('hidden');
        }
      });
    }

    if (actionBtn) {
      actionBtn.addEventListener('click', async () => {
        if (!currentFile) return;
        actionBtn.disabled = true;
        actionBtn.textContent = 'Compressing...';

        try {
          const quality = parseFloat(qualitySlider.value);
          const format = currentFile.type === 'image/png' ? 'image/png' : 'image/jpeg';
          compressedResult = await MobileImageEngine.compressImage(currentFile, { quality, format });

          resultStats.innerHTML = `
            <div class="stat-pill"><span class="label">Original:</span> <strong>${MobileUtils.formatBytes(compressedResult.originalSize)}</strong></div>
            <div class="stat-pill"><span class="label">New:</span> <strong class="text-success">${MobileUtils.formatBytes(compressedResult.newSize)}</strong></div>
            <div class="stat-pill"><span class="label">Saved:</span> <strong class="text-primary">${compressedResult.savingsPercent}%</strong></div>
          `;
          previewImg.src = compressedResult.previewUrl;
          resultBox.classList.remove('hidden');
          MobileUtils.showToast(`Compressed! Saved ${compressedResult.savingsPercent}%`, 'success');
        } catch (err) {
          MobileUtils.showToast(err.message || 'Compression failed', 'error');
        } finally {
          actionBtn.disabled = false;
          actionBtn.textContent = 'Compress Image';
        }
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        if (compressedResult && compressedResult.blob) {
          const ext = currentFile.type === 'image/png' ? 'png' : 'jpg';
          MobileUtils.downloadBlob(compressedResult.blob, `${MobileUtils.getBaseName(currentFile.name)}_compressed.${ext}`);
        }
      });
    }
  }

  // --- 2. PDF Compressor Controller ---
  function initPdfCompressor() {
    const input = document.getElementById('input-pdf-compressor');
    const box = document.getElementById('upload-pdf-compressor');
    const selectedSec = document.getElementById('selected-pdf-compressor');
    const fileNameEl = document.getElementById('name-pdf-compressor');
    const fileSizeEl = document.getElementById('size-pdf-compressor');
    const levelSelect = document.getElementById('level-pdf-compressor');
    const actionBtn = document.getElementById('btn-pdf-compressor');
    const progressWrap = document.getElementById('progress-pdf-compressor');
    const progressBar = document.getElementById('bar-pdf-compressor');
    const progressText = document.getElementById('text-progress-pdf-compressor');
    const resultBox = document.getElementById('result-pdf-compressor');
    const resultStats = document.getElementById('stats-pdf-compressor');
    const downloadBtn = document.getElementById('dl-pdf-compressor');

    let currentFile = null;
    let compressedPdfResult = null;

    if (input) {
      input.addEventListener('change', () => {
        if (input.files && input.files[0]) {
          currentFile = input.files[0];
          fileNameEl.textContent = currentFile.name;
          fileSizeEl.textContent = MobileUtils.formatBytes(currentFile.size);
          box.classList.add('hidden');
          selectedSec.classList.remove('hidden');
          resultBox.classList.add('hidden');
        }
      });
    }

    if (actionBtn) {
      actionBtn.addEventListener('click', async () => {
        if (!currentFile) return;
        actionBtn.disabled = true;
        actionBtn.textContent = 'Compressing PDF...';
        progressWrap.classList.remove('hidden');

        try {
          const level = levelSelect ? levelSelect.value : 'medium';
          compressedPdfResult = await MobilePdfEngine.compressPdf(currentFile, level, (current, total) => {
            const pct = Math.round((current / total) * 100);
            if (progressBar) progressBar.style.width = `${pct}%`;
            if (progressText) progressText.textContent = `Processing page ${current} of ${total} (${pct}%)`;
          });

          resultStats.innerHTML = `
            <div class="stat-pill"><span class="label">Original:</span> <strong>${MobileUtils.formatBytes(compressedPdfResult.originalSize)}</strong></div>
            <div class="stat-pill"><span class="label">New:</span> <strong class="text-success">${MobileUtils.formatBytes(compressedPdfResult.newSize)}</strong></div>
            <div class="stat-pill"><span class="label">Savings:</span> <strong class="text-primary">${compressedPdfResult.savingsPercent}%</strong></div>
          `;
          resultBox.classList.remove('hidden');
          MobileUtils.showToast('PDF Compressed successfully!', 'success');
        } catch (err) {
          MobileUtils.showToast(err.message || 'PDF Compression failed', 'error');
        } finally {
          actionBtn.disabled = false;
          actionBtn.textContent = 'Compress PDF';
          progressWrap.classList.add('hidden');
        }
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        if (compressedPdfResult && compressedPdfResult.blob) {
          MobileUtils.downloadBlob(compressedPdfResult.blob, compressedPdfResult.filename);
        }
      });
    }
  }

  // --- 3. Image to PDF Controller ---
  function initImageToPdf() {
    const input = document.getElementById('input-image-to-pdf');
    const imageListEl = document.getElementById('list-image-to-pdf');
    const addMoreBtn = document.getElementById('add-more-image-to-pdf');
    const pageSizeSelect = document.getElementById('size-image-to-pdf');
    const orientationSelect = document.getElementById('orient-image-to-pdf');
    const marginSelect = document.getElementById('margin-image-to-pdf');
    const actionBtn = document.getElementById('btn-image-to-pdf');
    const resultBox = document.getElementById('result-image-to-pdf');
    const downloadBtn = document.getElementById('dl-image-to-pdf');

    let imageItems = [];
    let generatedPdf = null;

    function renderImageList() {
      if (!imageListEl) return;
      if (imageItems.length === 0) {
        imageListEl.innerHTML = '<div class="mobile-empty-hint">No images selected yet. Tap + Add Images.</div>';
        if (actionBtn) actionBtn.disabled = true;
        return;
      }

      if (actionBtn) actionBtn.disabled = false;

      imageListEl.innerHTML = imageItems.map((item, idx) => `
        <div class="mobile-reorder-item" data-idx="${idx}">
          <div class="reorder-thumb">
            <img src="${item.previewUrl}" alt="Page ${idx + 1}" />
          </div>
          <div class="reorder-info">
            <div class="reorder-name">Page ${idx + 1}: ${item.file.name}</div>
            <div class="reorder-size">${MobileUtils.formatBytes(item.file.size)}</div>
            <div class="reorder-controls">
              <select class="mobile-select-sm item-orient-select" data-idx="${idx}">
                <option value="auto" ${item.orientation === 'auto' ? 'selected' : ''}>Auto</option>
                <option value="portrait" ${item.orientation === 'portrait' ? 'selected' : ''}>Portrait</option>
                <option value="landscape" ${item.orientation === 'landscape' ? 'selected' : ''}>Landscape</option>
              </select>
            </div>
          </div>
          <div class="reorder-actions">
            <button type="button" class="btn-icon btn-move-up" data-idx="${idx}" ${idx === 0 ? 'disabled' : ''} aria-label="Move Up">↑</button>
            <button type="button" class="btn-icon btn-move-down" data-idx="${idx}" ${idx === imageItems.length - 1 ? 'disabled' : ''} aria-label="Move Down">↓</button>
            <button type="button" class="btn-icon btn-remove" data-idx="${idx}" aria-label="Remove">✕</button>
          </div>
        </div>
      `).join('');

      // Bind move & remove events
      imageListEl.querySelectorAll('.btn-move-up').forEach(b => {
        b.addEventListener('click', () => {
          const idx = parseInt(b.dataset.idx, 10);
          if (idx > 0) {
            const tmp = imageItems[idx];
            imageItems[idx] = imageItems[idx - 1];
            imageItems[idx - 1] = tmp;
            renderImageList();
          }
        });
      });

      imageListEl.querySelectorAll('.btn-move-down').forEach(b => {
        b.addEventListener('click', () => {
          const idx = parseInt(b.dataset.idx, 10);
          if (idx < imageItems.length - 1) {
            const tmp = imageItems[idx];
            imageItems[idx] = imageItems[idx + 1];
            imageItems[idx + 1] = tmp;
            renderImageList();
          }
        });
      });

      imageListEl.querySelectorAll('.btn-remove').forEach(b => {
        b.addEventListener('click', () => {
          const idx = parseInt(b.dataset.idx, 10);
          MobileUtils.revokeUrl(imageItems[idx].previewUrl);
          imageItems.splice(idx, 1);
          renderImageList();
        });
      });

      imageListEl.querySelectorAll('.item-orient-select').forEach(sel => {
        sel.addEventListener('change', () => {
          const idx = parseInt(sel.dataset.idx, 10);
          imageItems[idx].orientation = sel.value;
        });
      });
    }

    if (input) {
      input.addEventListener('change', () => {
        if (input.files && input.files.length > 0) {
          Array.from(input.files).forEach(file => {
            const previewUrl = URL.createObjectURL(file);
            MobileUtils.trackUrl(previewUrl);
            imageItems.push({
              file,
              previewUrl,
              orientation: 'auto',
              rotation: 0
            });
          });
          renderImageList();
          input.value = '';
        }
      });
    }

    if (addMoreBtn) {
      addMoreBtn.addEventListener('click', () => {
        if (input) input.click();
      });
    }

    if (actionBtn) {
      actionBtn.addEventListener('click', async () => {
        if (imageItems.length === 0) return;
        actionBtn.disabled = true;
        actionBtn.textContent = 'Generating PDF...';

        try {
          const options = {
            pageSize: pageSizeSelect ? pageSizeSelect.value : 'a4',
            globalOrientation: orientationSelect ? orientationSelect.value : 'auto',
            margin: marginSelect ? marginSelect.value : 'none',
            filename: 'FileForge_Images.pdf'
          };

          generatedPdf = await MobileImageToPdf.generatePdf(imageItems, options);
          resultBox.classList.remove('hidden');
          MobileUtils.showToast(`PDF created with ${imageItems.length} pages!`, 'success');
        } catch (err) {
          MobileUtils.showToast(err.message || 'PDF Generation failed', 'error');
        } finally {
          actionBtn.disabled = false;
          actionBtn.textContent = 'Create PDF';
        }
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        if (generatedPdf && generatedPdf.blob) {
          MobileUtils.downloadBlob(generatedPdf.blob, generatedPdf.filename);
        }
      });
    }
  }

  // --- 4 & 5. PDF to JPG / PDF to PNG Controller ---
  function initPdfToImagesTool(toolId, format) {
    const input = document.getElementById(`input-${toolId}`);
    const box = document.getElementById(`upload-${toolId}`);
    const selectedSec = document.getElementById(`selected-${toolId}`);
    const fileNameEl = document.getElementById(`name-${toolId}`);
    const fileSizeEl = document.getElementById(`size-${toolId}`);
    const actionBtn = document.getElementById(`btn-${toolId}`);
    const progressWrap = document.getElementById(`progress-${toolId}`);
    const progressBar = document.getElementById(`bar-${toolId}`);
    const progressText = document.getElementById(`text-progress-${toolId}`);
    const resultBox = document.getElementById(`result-${toolId}`);
    const galleryEl = document.getElementById(`gallery-${toolId}`);
    const downloadAllBtn = document.getElementById(`dl-all-${toolId}`);

    let currentFile = null;
    let convertedImages = [];

    if (input) {
      input.addEventListener('change', () => {
        if (input.files && input.files[0]) {
          currentFile = input.files[0];
          fileNameEl.textContent = currentFile.name;
          fileSizeEl.textContent = MobileUtils.formatBytes(currentFile.size);
          box.classList.add('hidden');
          selectedSec.classList.remove('hidden');
          resultBox.classList.add('hidden');
        }
      });
    }

    if (actionBtn) {
      actionBtn.addEventListener('click', async () => {
        if (!currentFile) return;
        actionBtn.disabled = true;
        actionBtn.textContent = 'Converting Pages...';
        progressWrap.classList.remove('hidden');

        try {
          const res = await MobilePdfEngine.pdfToImages(currentFile, format, 1.5, (current, total) => {
            const pct = Math.round((current / total) * 100);
            if (progressBar) progressBar.style.width = `${pct}%`;
            if (progressText) progressText.textContent = `Rendering page ${current} of ${total} (${pct}%)`;
          });

          convertedImages = res.images;

          galleryEl.innerHTML = convertedImages.map((img, idx) => `
            <div class="mobile-gallery-card">
              <img src="${img.previewUrl}" alt="Page ${img.pageNumber}" />
              <div class="gallery-card-foot">
                <span>Page ${img.pageNumber}</span>
                <button type="button" class="btn btn-xs btn-secondary btn-dl-single" data-idx="${idx}">Download</button>
              </div>
            </div>
          `).join('');

          galleryEl.querySelectorAll('.btn-dl-single').forEach(b => {
            b.addEventListener('click', () => {
              const idx = parseInt(b.dataset.idx, 10);
              const target = convertedImages[idx];
              if (target) MobileUtils.downloadBlob(target.blob, target.filename);
            });
          });

          resultBox.classList.remove('hidden');
          MobileUtils.showToast(`Converted ${convertedImages.length} pages!`, 'success');
        } catch (err) {
          MobileUtils.showToast(err.message || 'Conversion failed', 'error');
        } finally {
          actionBtn.disabled = false;
          actionBtn.textContent = 'Convert Pages';
          progressWrap.classList.add('hidden');
        }
      });
    }

    if (downloadAllBtn) {
      downloadAllBtn.addEventListener('click', async () => {
        if (convertedImages.length === 0) return;
        try {
          const zipName = `${MobileUtils.getBaseName(currentFile.name)}_images.zip`;
          const zipRes = await MobileZipEngine.bundleBlobsAsZip(convertedImages, zipName);
          MobileUtils.downloadBlob(zipRes.blob, zipRes.filename);
        } catch (e) {
          MobileUtils.showToast('Failed to create ZIP', 'error');
        }
      });
    }
  }

  function initPdfToJpg() {
    initPdfToImagesTool('pdf-to-jpg', 'image/jpeg');
  }

  function initPdfToPng() {
    initPdfToImagesTool('pdf-to-png', 'image/png');
  }

  // --- 6 & 7. JPG to PNG / PNG to JPG ---
  function initSimpleImageConverter(toolId, targetFormat, targetExt) {
    const input = document.getElementById(`input-${toolId}`);
    const box = document.getElementById(`upload-${toolId}`);
    const selectedSec = document.getElementById(`selected-${toolId}`);
    const fileNameEl = document.getElementById(`name-${toolId}`);
    const fileSizeEl = document.getElementById(`size-${toolId}`);
    const actionBtn = document.getElementById(`btn-${toolId}`);
    const resultBox = document.getElementById(`result-${toolId}`);
    const previewImg = document.getElementById(`preview-${toolId}`);
    const downloadBtn = document.getElementById(`dl-${toolId}`);

    let currentFile = null;
    let convertedResult = null;

    if (input) {
      input.addEventListener('change', () => {
        if (input.files && input.files[0]) {
          currentFile = input.files[0];
          fileNameEl.textContent = currentFile.name;
          fileSizeEl.textContent = MobileUtils.formatBytes(currentFile.size);
          box.classList.add('hidden');
          selectedSec.classList.remove('hidden');
          resultBox.classList.add('hidden');
        }
      });
    }

    if (actionBtn) {
      actionBtn.addEventListener('click', async () => {
        if (!currentFile) return;
        actionBtn.disabled = true;
        actionBtn.textContent = 'Converting...';

        try {
          convertedResult = await MobileImageEngine.convertImage(currentFile, targetFormat, 0.95);
          previewImg.src = convertedResult.previewUrl;
          resultBox.classList.remove('hidden');
          MobileUtils.showToast(`Converted to ${targetExt.toUpperCase()}!`, 'success');
        } catch (err) {
          MobileUtils.showToast(err.message || 'Conversion failed', 'error');
        } finally {
          actionBtn.disabled = false;
          actionBtn.textContent = `Convert to ${targetExt.toUpperCase()}`;
        }
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        if (convertedResult && convertedResult.blob) {
          MobileUtils.downloadBlob(convertedResult.blob, convertedResult.filename);
        }
      });
    }
  }

  function initJpgToPng() {
    initSimpleImageConverter('jpg-to-png', 'image/png', 'PNG');
  }

  function initPngToJpg() {
    initSimpleImageConverter('png-to-jpg', 'image/jpeg', 'JPG');
  }

  // --- 8. Image Resizer Controller ---
  function initImageResizer() {
    const input = document.getElementById('input-image-resizer');
    const box = document.getElementById('upload-image-resizer');
    const selectedSec = document.getElementById('selected-image-resizer');
    const fileNameEl = document.getElementById('name-image-resizer');
    const originalDimsEl = document.getElementById('dims-image-resizer');
    const widthInput = document.getElementById('width-image-resizer');
    const heightInput = document.getElementById('height-image-resizer');
    const scaleSelect = document.getElementById('scale-image-resizer');
    const actionBtn = document.getElementById('btn-image-resizer');
    const resultBox = document.getElementById('result-image-resizer');
    const previewImg = document.getElementById('preview-image-resizer');
    const resultDimsEl = document.getElementById('result-dims-image-resizer');
    const downloadBtn = document.getElementById('dl-image-resizer');

    let currentFile = null;
    let originalWidth = 0;
    let originalHeight = 0;
    let resizedResult = null;

    if (input) {
      input.addEventListener('change', async () => {
        if (input.files && input.files[0]) {
          currentFile = input.files[0];
          fileNameEl.textContent = currentFile.name;
          const dataUrl = await MobileUtils.readFileAsDataURL(currentFile);
          const img = await MobileUtils.loadImageFromSrc(dataUrl);
          originalWidth = img.width;
          originalHeight = img.height;
          originalDimsEl.textContent = `${originalWidth} × ${originalHeight} px`;
          if (widthInput) widthInput.value = originalWidth;
          if (heightInput) heightInput.value = originalHeight;

          box.classList.add('hidden');
          selectedSec.classList.remove('hidden');
          resultBox.classList.add('hidden');
        }
      });
    }

    if (scaleSelect) {
      scaleSelect.addEventListener('change', () => {
        const pct = parseInt(scaleSelect.value, 10);
        if (pct && originalWidth) {
          widthInput.value = Math.round((originalWidth * pct) / 100);
          heightInput.value = Math.round((originalHeight * pct) / 100);
        }
      });
    }

    if (actionBtn) {
      actionBtn.addEventListener('click', async () => {
        if (!currentFile) return;
        actionBtn.disabled = true;
        actionBtn.textContent = 'Resizing...';

        try {
          const targetW = parseInt(widthInput.value, 10);
          const targetH = parseInt(heightInput.value, 10);
          resizedResult = await MobileImageEngine.resizeImage(currentFile, {
            width: targetW,
            height: targetH
          });

          resultDimsEl.textContent = `${resizedResult.width} × ${resizedResult.height} px (${MobileUtils.formatBytes(resizedResult.size)})`;
          previewImg.src = resizedResult.previewUrl;
          resultBox.classList.remove('hidden');
          MobileUtils.showToast('Image Resized!', 'success');
        } catch (err) {
          MobileUtils.showToast(err.message || 'Resize failed', 'error');
        } finally {
          actionBtn.disabled = false;
          actionBtn.textContent = 'Resize Image';
        }
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        if (resizedResult && resizedResult.blob) {
          const ext = MobileUtils.getExtension(currentFile.name) || 'png';
          MobileUtils.downloadBlob(resizedResult.blob, `${MobileUtils.getBaseName(currentFile.name)}_resized.${ext}`);
        }
      });
    }
  }

  // --- 9. Image Converter Controller ---
  function initImageConverter() {
    const input = document.getElementById('input-image-converter');
    const box = document.getElementById('upload-image-converter');
    const selectedSec = document.getElementById('selected-image-converter');
    const fileNameEl = document.getElementById('name-image-converter');
    const fileSizeEl = document.getElementById('size-image-converter');
    const formatSelect = document.getElementById('format-image-converter');
    const actionBtn = document.getElementById('btn-image-converter');
    const resultBox = document.getElementById('result-image-converter');
    const previewImg = document.getElementById('preview-image-converter');
    const downloadBtn = document.getElementById('dl-image-converter');

    let currentFile = null;
    let convertedResult = null;

    if (input) {
      input.addEventListener('change', () => {
        if (input.files && input.files[0]) {
          currentFile = input.files[0];
          fileNameEl.textContent = currentFile.name;
          fileSizeEl.textContent = MobileUtils.formatBytes(currentFile.size);
          box.classList.add('hidden');
          selectedSec.classList.remove('hidden');
          resultBox.classList.add('hidden');
        }
      });
    }

    if (actionBtn) {
      actionBtn.addEventListener('click', async () => {
        if (!currentFile) return;
        actionBtn.disabled = true;
        actionBtn.textContent = 'Converting...';

        try {
          const targetFmt = formatSelect ? formatSelect.value : 'image/png';
          convertedResult = await MobileImageEngine.convertImage(currentFile, targetFmt);
          previewImg.src = convertedResult.previewUrl;
          resultBox.classList.remove('hidden');
          MobileUtils.showToast('Converted successfully!', 'success');
        } catch (err) {
          MobileUtils.showToast(err.message || 'Conversion failed', 'error');
        } finally {
          actionBtn.disabled = false;
          actionBtn.textContent = 'Convert Image';
        }
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        if (convertedResult && convertedResult.blob) {
          MobileUtils.downloadBlob(convertedResult.blob, convertedResult.filename);
        }
      });
    }
  }

  // --- 10. PDF Merger Controller ---
  function initPdfMerger() {
    const input = document.getElementById('input-pdf-merger');
    const listEl = document.getElementById('list-pdf-merger');
    const addMoreBtn = document.getElementById('add-more-pdf-merger');
    const actionBtn = document.getElementById('btn-pdf-merger');
    const resultBox = document.getElementById('result-pdf-merger');
    const resultInfo = document.getElementById('info-pdf-merger');
    const downloadBtn = document.getElementById('dl-pdf-merger');

    let pdfFiles = [];
    let mergedResult = null;

    function renderList() {
      if (!listEl) return;
      if (pdfFiles.length === 0) {
        listEl.innerHTML = '<div class="mobile-empty-hint">Please add at least 2 PDF files to merge.</div>';
        if (actionBtn) actionBtn.disabled = true;
        return;
      }

      if (actionBtn) actionBtn.disabled = pdfFiles.length < 2;

      listEl.innerHTML = pdfFiles.map((file, idx) => `
        <div class="mobile-reorder-item">
          <div class="reorder-icon">📄</div>
          <div class="reorder-info">
            <div class="reorder-name">${idx + 1}. ${file.name}</div>
            <div class="reorder-size">${MobileUtils.formatBytes(file.size)}</div>
          </div>
          <div class="reorder-actions">
            <button type="button" class="btn-icon btn-move-up" data-idx="${idx}" ${idx === 0 ? 'disabled' : ''} aria-label="Move Up">↑</button>
            <button type="button" class="btn-icon btn-move-down" data-idx="${idx}" ${idx === pdfFiles.length - 1 ? 'disabled' : ''} aria-label="Move Down">↓</button>
            <button type="button" class="btn-icon btn-remove" data-idx="${idx}" aria-label="Remove">✕</button>
          </div>
        </div>
      `).join('');

      listEl.querySelectorAll('.btn-move-up').forEach(b => {
        b.addEventListener('click', () => {
          const idx = parseInt(b.dataset.idx, 10);
          if (idx > 0) {
            const tmp = pdfFiles[idx];
            pdfFiles[idx] = pdfFiles[idx - 1];
            pdfFiles[idx - 1] = tmp;
            renderList();
          }
        });
      });

      listEl.querySelectorAll('.btn-move-down').forEach(b => {
        b.addEventListener('click', () => {
          const idx = parseInt(b.dataset.idx, 10);
          if (idx < pdfFiles.length - 1) {
            const tmp = pdfFiles[idx];
            pdfFiles[idx] = pdfFiles[idx + 1];
            pdfFiles[idx + 1] = tmp;
            renderList();
          }
        });
      });

      listEl.querySelectorAll('.btn-remove').forEach(b => {
        b.addEventListener('click', () => {
          const idx = parseInt(b.dataset.idx, 10);
          pdfFiles.splice(idx, 1);
          renderList();
        });
      });
    }

    if (input) {
      input.addEventListener('change', () => {
        if (input.files && input.files.length > 0) {
          Array.from(input.files).forEach(f => pdfFiles.push(f));
          renderList();
          input.value = '';
        }
      });
    }

    if (addMoreBtn) {
      addMoreBtn.addEventListener('click', () => {
        if (input) input.click();
      });
    }

    if (actionBtn) {
      actionBtn.addEventListener('click', async () => {
        if (pdfFiles.length < 2) return;
        actionBtn.disabled = true;
        actionBtn.textContent = 'Merging PDFs...';

        try {
          mergedResult = await MobilePdfEngine.mergePdfs(pdfFiles);
          resultInfo.textContent = `Merged ${pdfFiles.length} files (${mergedResult.pageCount} pages, ${MobileUtils.formatBytes(mergedResult.size)})`;
          resultBox.classList.remove('hidden');
          MobileUtils.showToast('PDFs merged successfully!', 'success');
        } catch (err) {
          MobileUtils.showToast(err.message || 'Merge failed', 'error');
        } finally {
          actionBtn.disabled = false;
          actionBtn.textContent = 'Merge PDFs';
        }
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        if (mergedResult && mergedResult.blob) {
          MobileUtils.downloadBlob(mergedResult.blob, mergedResult.filename);
        }
      });
    }
  }

  // --- 11. PDF Splitter Controller ---
  function initPdfSplitter() {
    const input = document.getElementById('input-pdf-splitter');
    const box = document.getElementById('upload-pdf-splitter');
    const selectedSec = document.getElementById('selected-pdf-splitter');
    const fileNameEl = document.getElementById('name-pdf-splitter');
    const fileSizeEl = document.getElementById('size-pdf-splitter');
    const rangeInput = document.getElementById('range-pdf-splitter');
    const actionBtn = document.getElementById('btn-pdf-splitter');
    const resultBox = document.getElementById('result-pdf-splitter');
    const downloadBtn = document.getElementById('dl-pdf-splitter');

    let currentFile = null;
    let splitResult = null;

    if (input) {
      input.addEventListener('change', () => {
        if (input.files && input.files[0]) {
          currentFile = input.files[0];
          fileNameEl.textContent = currentFile.name;
          fileSizeEl.textContent = MobileUtils.formatBytes(currentFile.size);
          box.classList.add('hidden');
          selectedSec.classList.remove('hidden');
          resultBox.classList.add('hidden');
        }
      });
    }

    if (actionBtn) {
      actionBtn.addEventListener('click', async () => {
        if (!currentFile) return;
        actionBtn.disabled = true;
        actionBtn.textContent = 'Splitting...';

        try {
          const rangeStr = rangeInput ? rangeInput.value : '';
          splitResult = await MobilePdfEngine.splitPdf(currentFile, 'ranges', rangeStr);
          resultBox.classList.remove('hidden');
          MobileUtils.showToast(`Extracted ${splitResult.pageCount} pages!`, 'success');
        } catch (err) {
          MobileUtils.showToast(err.message || 'Split failed', 'error');
        } finally {
          actionBtn.disabled = false;
          actionBtn.textContent = 'Split PDF';
        }
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        if (splitResult && splitResult.blob) {
          MobileUtils.downloadBlob(splitResult.blob, splitResult.filename);
        }
      });
    }
  }

  // --- 12. PDF Page Extractor Controller ---
  function initPdfPageExtractor() {
    const input = document.getElementById('input-pdf-page-extractor');
    const box = document.getElementById('upload-pdf-page-extractor');
    const selectedSec = document.getElementById('selected-pdf-page-extractor');
    const thumbGrid = document.getElementById('thumbs-pdf-page-extractor');
    const selectAllBtn = document.getElementById('all-pdf-page-extractor');
    const actionBtn = document.getElementById('btn-pdf-page-extractor');
    const resultBox = document.getElementById('result-pdf-page-extractor');
    const downloadBtn = document.getElementById('dl-pdf-page-extractor');

    let currentFile = null;
    let selectedIndices = new Set();
    let extractedResult = null;

    if (input) {
      input.addEventListener('change', async () => {
        if (input.files && input.files[0]) {
          currentFile = input.files[0];
          selectedIndices.clear();
          box.classList.add('hidden');
          selectedSec.classList.remove('hidden');
          resultBox.classList.add('hidden');

          if (thumbGrid) {
            thumbGrid.innerHTML = '<div class="mobile-loading">Loading page thumbnails...</div>';
            try {
              const thumbs = await MobilePdfEngine.loadPdfThumbnails(currentFile);
              thumbGrid.innerHTML = thumbs.map((t, idx) => `
                <div class="mobile-thumb-card" data-idx="${idx}">
                  <img src="${t.dataUrl}" alt="Page ${t.pageNumber}" />
                  <div class="thumb-badge">${t.pageNumber}</div>
                </div>
              `).join('');

              thumbGrid.querySelectorAll('.mobile-thumb-card').forEach(card => {
                card.addEventListener('click', () => {
                  const idx = parseInt(card.dataset.idx, 10);
                  if (selectedIndices.has(idx)) {
                    selectedIndices.delete(idx);
                    card.classList.remove('selected');
                  } else {
                    selectedIndices.add(idx);
                    card.classList.add('selected');
                  }
                  if (actionBtn) {
                    actionBtn.disabled = selectedIndices.size === 0;
                    actionBtn.textContent = `Extract (${selectedIndices.size}) Pages`;
                  }
                });
              });
            } catch (e) {
              thumbGrid.innerHTML = '<div class="mobile-error">Failed to load thumbnails.</div>';
            }
          }
        }
      });
    }

    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => {
        const cards = thumbGrid.querySelectorAll('.mobile-thumb-card');
        const shouldSelectAll = selectedIndices.size < cards.length;
        selectedIndices.clear();
        cards.forEach(c => {
          const idx = parseInt(c.dataset.idx, 10);
          if (shouldSelectAll) {
            selectedIndices.add(idx);
            c.classList.add('selected');
          } else {
            c.classList.remove('selected');
          }
        });
        if (actionBtn) {
          actionBtn.disabled = selectedIndices.size === 0;
          actionBtn.textContent = selectedIndices.size > 0 ? `Extract (${selectedIndices.size}) Pages` : 'Extract Pages';
        }
      });
    }

    if (actionBtn) {
      actionBtn.addEventListener('click', async () => {
        if (!currentFile || selectedIndices.size === 0) return;
        actionBtn.disabled = true;
        actionBtn.textContent = 'Extracting...';

        try {
          const sortedIndices = Array.from(selectedIndices).sort((a, b) => a - b);
          extractedResult = await MobilePdfEngine.extractPages(currentFile, sortedIndices);
          resultBox.classList.remove('hidden');
          MobileUtils.showToast(`Extracted ${extractedResult.pageCount} pages into PDF!`, 'success');
        } catch (err) {
          MobileUtils.showToast(err.message || 'Extraction failed', 'error');
        } finally {
          actionBtn.disabled = false;
          actionBtn.textContent = `Extract (${selectedIndices.size}) Pages`;
        }
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        if (extractedResult && extractedResult.blob) {
          MobileUtils.downloadBlob(extractedResult.blob, extractedResult.filename);
        }
      });
    }
  }

  // --- 13. ZIP File Creator Controller ---
  function initZipCreator() {
    const input = document.getElementById('input-zip-creator');
    const folderInput = document.getElementById('input-folder-zip-creator');
    const addFilesBtn = document.getElementById('add-files-zip-creator');
    const addFolderBtn = document.getElementById('add-folder-zip-creator');
    const listEl = document.getElementById('list-zip-creator');
    const zipNameInput = document.getElementById('name-input-zip-creator');
    const actionBtn = document.getElementById('btn-zip-creator');
    const resultBox = document.getElementById('result-zip-creator');
    const downloadBtn = document.getElementById('dl-zip-creator');

    let fileItems = [];
    let generatedZip = null;

    function renderList() {
      if (!listEl) return;
      if (fileItems.length === 0) {
        listEl.innerHTML = '<div class="mobile-empty-hint">Add files or a folder to create your ZIP archive.</div>';
        if (actionBtn) actionBtn.disabled = true;
        return;
      }

      if (actionBtn) actionBtn.disabled = false;

      listEl.innerHTML = fileItems.map((item, idx) => `
        <div class="mobile-reorder-item">
          <div class="reorder-icon">📁</div>
          <div class="reorder-info">
            <div class="reorder-name">${item.path}</div>
            <div class="reorder-size">${MobileUtils.formatBytes(item.file.size)}</div>
          </div>
          <div class="reorder-actions">
            <button type="button" class="btn-icon btn-remove" data-idx="${idx}" aria-label="Remove">✕</button>
          </div>
        </div>
      `).join('');

      listEl.querySelectorAll('.btn-remove').forEach(b => {
        b.addEventListener('click', () => {
          const idx = parseInt(b.dataset.idx, 10);
          fileItems.splice(idx, 1);
          renderList();
        });
      });
    }

    if (input) {
      input.addEventListener('change', () => {
        if (input.files && input.files.length > 0) {
          Array.from(input.files).forEach(f => {
            fileItems.push({ file: f, path: f.name });
          });
          renderList();
          input.value = '';
        }
      });
    }

    if (folderInput) {
      folderInput.addEventListener('change', () => {
        if (folderInput.files && folderInput.files.length > 0) {
          Array.from(folderInput.files).forEach(f => {
            fileItems.push({ file: f, path: f.webkitRelativePath || f.name });
          });
          renderList();
          folderInput.value = '';
        }
      });
    }

    if (addFilesBtn) addFilesBtn.addEventListener('click', () => input && input.click());
    if (addFolderBtn) addFolderBtn.addEventListener('click', () => folderInput && folderInput.click());

    if (actionBtn) {
      actionBtn.addEventListener('click', async () => {
        if (fileItems.length === 0) return;
        actionBtn.disabled = true;
        actionBtn.textContent = 'Creating ZIP...';

        try {
          const zipName = (zipNameInput && zipNameInput.value.trim()) || 'archive.zip';
          generatedZip = await MobileZipEngine.createZip(fileItems, zipName);
          resultBox.classList.remove('hidden');
          MobileUtils.showToast(`ZIP created with ${fileItems.length} files!`, 'success');
        } catch (err) {
          MobileUtils.showToast(err.message || 'ZIP creation failed', 'error');
        } finally {
          actionBtn.disabled = false;
          actionBtn.textContent = 'Create ZIP Archive';
        }
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        if (generatedZip && generatedZip.blob) {
          MobileUtils.downloadBlob(generatedZip.blob, generatedZip.filename);
        }
      });
    }
  }

  // --- 14. ZIP File Extractor Controller ---
  function initZipExtractor() {
    const input = document.getElementById('input-zip-extractor');
    const box = document.getElementById('upload-zip-extractor');
    const selectedSec = document.getElementById('selected-zip-extractor');
    const fileNameEl = document.getElementById('name-zip-extractor');
    const entriesList = document.getElementById('list-zip-extractor');

    let currentZipData = null;

    if (input) {
      input.addEventListener('change', async () => {
        if (input.files && input.files[0]) {
          const file = input.files[0];
          fileNameEl.textContent = `${file.name} (${MobileUtils.formatBytes(file.size)})`;
          box.classList.add('hidden');
          selectedSec.classList.remove('hidden');
          entriesList.innerHTML = '<div class="mobile-loading">Reading ZIP contents...</div>';

          try {
            currentZipData = await MobileZipEngine.readZip(file);
            entriesList.innerHTML = currentZipData.entries.map((e, idx) => `
              <div class="mobile-reorder-item">
                <div class="reorder-icon">${e.isDir ? '📁' : '📄'}</div>
                <div class="reorder-info">
                  <div class="reorder-name">${e.path}</div>
                  <div class="reorder-size">${e.isDir ? 'Folder' : 'File'}</div>
                </div>
                <div class="reorder-actions">
                  ${!e.isDir ? `<button type="button" class="btn btn-xs btn-secondary btn-dl-entry" data-idx="${idx}">Download</button>` : ''}
                </div>
              </div>
            `).join('');

            entriesList.querySelectorAll('.btn-dl-entry').forEach(b => {
              b.addEventListener('click', async () => {
                const idx = parseInt(b.dataset.idx, 10);
                const entryObj = currentZipData.entries[idx];
                if (entryObj && !entryObj.isDir) {
                  const fileRes = await MobileZipEngine.extractSingleFile(entryObj.entry);
                  if (fileRes) MobileUtils.downloadBlob(fileRes.blob, fileRes.filename);
                }
              });
            });

            MobileUtils.showToast(`Found ${currentZipData.fileCount} files in archive!`, 'success');
          } catch (err) {
            entriesList.innerHTML = '<div class="mobile-error">Failed to read ZIP file.</div>';
            MobileUtils.showToast('Invalid ZIP file', 'error');
          }
        }
      });
    }
  }

  // --- 15. Download All as ZIP Controller ---
  function initDownloadAllZip() {
    const input = document.getElementById('input-download-all-zip');
    const listEl = document.getElementById('list-download-all-zip');
    const addMoreBtn = document.getElementById('add-more-download-all-zip');
    const zipNameInput = document.getElementById('name-download-all-zip');
    const actionBtn = document.getElementById('btn-download-all-zip');
    const resultBox = document.getElementById('result-download-all-zip');
    const downloadBtn = document.getElementById('dl-download-all-zip');

    let filesList = [];
    let packagedZip = null;

    function renderList() {
      if (!listEl) return;
      if (filesList.length === 0) {
        listEl.innerHTML = '<div class="mobile-empty-hint">Select files you want to bundle into a ZIP.</div>';
        if (actionBtn) actionBtn.disabled = true;
        return;
      }

      if (actionBtn) actionBtn.disabled = false;

      listEl.innerHTML = filesList.map((f, idx) => `
        <div class="mobile-reorder-item">
          <div class="reorder-icon">📦</div>
          <div class="reorder-info">
            <div class="reorder-name">${f.name}</div>
            <div class="reorder-size">${MobileUtils.formatBytes(f.size)}</div>
          </div>
          <div class="reorder-actions">
            <button type="button" class="btn-icon btn-remove" data-idx="${idx}" aria-label="Remove">✕</button>
          </div>
        </div>
      `).join('');

      listEl.querySelectorAll('.btn-remove').forEach(b => {
        b.addEventListener('click', () => {
          const idx = parseInt(b.dataset.idx, 10);
          filesList.splice(idx, 1);
          renderList();
        });
      });
    }

    if (input) {
      input.addEventListener('change', () => {
        if (input.files && input.files.length > 0) {
          Array.from(input.files).forEach(f => filesList.push(f));
          renderList();
          input.value = '';
        }
      });
    }

    if (addMoreBtn) addMoreBtn.addEventListener('click', () => input && input.click());

    if (actionBtn) {
      actionBtn.addEventListener('click', async () => {
        if (filesList.length === 0) return;
        actionBtn.disabled = true;
        actionBtn.textContent = 'Packaging ZIP...';

        try {
          const zipName = (zipNameInput && zipNameInput.value.trim()) || 'bundle.zip';
          packagedZip = await MobileZipEngine.createZip(filesList, zipName);
          resultBox.classList.remove('hidden');
          MobileUtils.showToast('Packaged into ZIP successfully!', 'success');
        } catch (err) {
          MobileUtils.showToast(err.message || 'ZIP packaging failed', 'error');
        } finally {
          actionBtn.disabled = false;
          actionBtn.textContent = 'Package & Download as ZIP';
        }
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        if (packagedZip && packagedZip.blob) {
          MobileUtils.downloadBlob(packagedZip.blob, packagedZip.filename);
        }
      });
    }
  }

  return {
    init,
    showHomeView,
    showToolView,
    resetState
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  // Initialize PDF.js worker with local offline bundle
  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = './vendor/pdf.worker.min.js';
  }
  MobileApp.init();
});
