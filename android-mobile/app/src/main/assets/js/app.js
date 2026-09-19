/**
 * FileForge Mobile - Main Application Controller
 * Handles Navigation, Settings, Theme & Haptic Toggles, Exit Confirmation,
 * Interactive Touch Image Resizer, Multi-File Selectors, and Web Share API.
 */
const MobileApp = (() => {

  // Active state for currently opened tool
  let currentToolId = null;

  // Tool metadata definition (15 essential mobile tools)
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
      desc: 'Touch & drag resize with finger',
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
   * Helper to attach safe, reliable file picker triggers on mobile / Android
   */
  function bindFileTrigger(triggerEl, inputEl) {
    if (!triggerEl || !inputEl) return;
    triggerEl.addEventListener('click', (e) => {
      if (e.target !== inputEl) {
        MobileUtils.triggerHaptic('light');
        inputEl.value = '';
        inputEl.click();
      }
    });
  }

  /**
   * Initialize App Shell, Settings, Event Listeners and Routing
   */
  function init() {
    initPreferences();
    renderToolCards();
    initNavigation();
    initSearchAndFilter();
    initToolControllers();
    initExitModal();

    // Check initial hash route
    handleHashChange();
  }

  /**
  // Centralized Application Constants
  const APP_CONFIG = {
    APP_NAME: 'FileForge',
    MOBILE_APP_NAME: 'FileForge Mobile',
    APP_VERSION: '1.0.0',
    DEVELOPER: 'Abdur',
    COPYRIGHT_YEAR: '2026',
    LAST_UPDATED: 'September 18, 2026',
    CONTACT_EMAIL: 'support@fileforge.app'
  };

  /**
   * User UI Preferences (Theme, Haptic, Exit Confirmation)
   */
  function initPreferences() {
    const savedTheme = localStorage.getItem('fileforge_mobile_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const themeToggle = document.getElementById('toggle-dark-mode');
    if (themeToggle) {
      themeToggle.checked = savedTheme === 'dark';
      themeToggle.addEventListener('change', () => {
        MobileUtils.triggerHaptic('light');
        const theme = themeToggle.checked ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('fileforge_mobile_theme', theme);
      });
    }

    const hapticEnabled = localStorage.getItem('fileforge_mobile_haptic') !== 'false';
    const hapticToggle = document.getElementById('toggle-haptic');
    if (hapticToggle) {
      hapticToggle.checked = hapticEnabled;
      hapticToggle.addEventListener('change', () => {
        localStorage.setItem('fileforge_mobile_haptic', hapticToggle.checked ? 'true' : 'false');
        if (hapticToggle.checked) MobileUtils.triggerHaptic('light');
      });
    }

    const exitConfirmEnabled = localStorage.getItem('fileforge_mobile_confirm_exit') !== 'false';
    const exitConfirmToggle = document.getElementById('toggle-confirm-exit');
    if (exitConfirmToggle) {
      exitConfirmToggle.checked = exitConfirmEnabled;
      exitConfirmToggle.addEventListener('change', () => {
        MobileUtils.triggerHaptic('light');
        localStorage.setItem('fileforge_mobile_confirm_exit', exitConfirmToggle.checked ? 'true' : 'false');
      });
    }

    const settingsBtn = document.getElementById('btn-open-settings');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        MobileUtils.triggerHaptic('light');
        window.location.hash = '#settings';
      });
    }
  }

  /**
   * Exit Modal Sheet Handlers
   */
  function initExitModal() {
    const modal = document.getElementById('mobile-exit-modal');
    const cancelBtn = document.getElementById('btn-cancel-exit');
    const confirmBtn = document.getElementById('btn-confirm-exit');

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        MobileUtils.triggerHaptic('light');
        hideExitModal();
      });
    }

    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        MobileUtils.triggerHaptic('light');
        hideExitModal();
        if (window.AndroidBridge && typeof window.AndroidBridge.closeApp === 'function') {
          window.AndroidBridge.closeApp();
        } else {
          window.close();
        }
      });
    }

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) hideExitModal();
      });
    }
  }

  function showExitModal() {
    const modal = document.getElementById('mobile-exit-modal');
    if (modal) modal.classList.remove('hidden');
  }

  function hideExitModal() {
    const modal = document.getElementById('mobile-exit-modal');
    if (modal) modal.classList.add('hidden');
  }

  function isExitModalOpen() {
    const modal = document.getElementById('mobile-exit-modal');
    return modal && !modal.classList.contains('hidden');
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

    grid.querySelectorAll('.mobile-tool-card').forEach(card => {
      card.addEventListener('click', () => MobileUtils.triggerHaptic('light'));
    });
  }

  /**
   * Setup Hash-based Routing & Android Back Support
   */
  function initNavigation() {
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);

    document.querySelectorAll('#mobile-settings-view .mobile-back-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        MobileUtils.triggerHaptic('light');
        window.location.hash = '';
      });
    });

    document.querySelectorAll('#mobile-about-view .mobile-back-btn, #mobile-privacy-view .mobile-back-btn, #mobile-terms-view .mobile-back-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        MobileUtils.triggerHaptic('light');
        window.location.hash = '#settings';
      });
    });

    document.querySelectorAll('#mobile-tool-container .mobile-back-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        MobileUtils.triggerHaptic('light');
        window.location.hash = '';
      });
    });

    document.querySelectorAll('.mobile-home-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        MobileUtils.triggerHaptic('light');
        window.location.hash = '';
      });
    });
  }

  function handleHashChange() {
    const hash = (window.location.hash || '').replace('#', '').trim();

    if (isExitModalOpen()) {
      hideExitModal();
    }

    if (!hash || hash === 'home') {
      showHomeView();
    } else if (hash === 'settings') {
      showSettingsView();
    } else if (hash === 'about') {
      showDocView('mobile-about-view');
    } else if (hash === 'privacy') {
      showDocView('mobile-privacy-view');
    } else if (hash === 'terms') {
      showDocView('mobile-terms-view');
    } else {
      const tool = TOOLS.find(t => t.id === hash);
      if (tool) {
        showToolView(tool.id);
      } else {
        showHomeView();
      }
    }
  }

  function hideAllScreens() {
    const homeView = document.getElementById('mobile-home-view');
    const settingsView = document.getElementById('mobile-settings-view');
    const aboutView = document.getElementById('mobile-about-view');
    const privacyView = document.getElementById('mobile-privacy-view');
    const termsView = document.getElementById('mobile-terms-view');
    const toolContainer = document.getElementById('mobile-tool-container');

    if (homeView) homeView.classList.add('hidden');
    if (settingsView) settingsView.classList.add('hidden');
    if (aboutView) aboutView.classList.add('hidden');
    if (privacyView) privacyView.classList.add('hidden');
    if (termsView) termsView.classList.add('hidden');
    if (toolContainer) toolContainer.classList.add('hidden');
  }

  function showHomeView() {
    resetState();
    currentToolId = null;
    hideAllScreens();

    const homeView = document.getElementById('mobile-home-view');
    if (homeView) homeView.classList.remove('hidden');
    window.scrollTo(0, 0);
  }

  function showSettingsView() {
    resetState();
    currentToolId = null;
    hideAllScreens();

    const settingsView = document.getElementById('mobile-settings-view');
    if (settingsView) settingsView.classList.remove('hidden');
    window.scrollTo(0, 0);
  }

  function showDocView(viewId) {
    resetState();
    currentToolId = null;
    hideAllScreens();

    const docView = document.getElementById(viewId);
    if (docView) docView.classList.remove('hidden');
    window.scrollTo(0, 0);
  }

  function showToolView(toolId) {
    if (currentToolId !== toolId) {
      resetState();
    }
    currentToolId = toolId;
    hideAllScreens();

    const toolContainer = document.getElementById('mobile-tool-container');
    if (toolContainer) toolContainer.classList.remove('hidden');

    document.querySelectorAll('.mobile-tool-view').forEach(v => v.classList.add('hidden'));
    const activeView = document.getElementById(`tool-view-${toolId}`);
    if (activeView) {
      activeView.classList.remove('hidden');
    }
    window.scrollTo(0, 0);
  }

  /**
   * Reset State and Free All Allocated Memory / Object URLs
   */
  function resetState() {
    MobileUtils.resetAllUrls();

    document.querySelectorAll('.mobile-file-input').forEach(input => {
      input.value = '';
    });

    // Reset single-file upload boxes and selected boxes
    document.querySelectorAll('.mobile-upload-box').forEach(box => box.classList.remove('hidden'));
    document.querySelectorAll('.mobile-file-selected').forEach(sec => sec.classList.add('hidden'));
    document.querySelectorAll('.mobile-result-box').forEach(box => box.classList.add('hidden'));
    document.querySelectorAll('.mobile-progress-wrap').forEach(p => p.classList.add('hidden'));

    // Close any open overlays/modals
    document.querySelectorAll('.mobile-modal-overlay').forEach(m => m.classList.add('hidden'));
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
        MobileUtils.triggerHaptic('light');
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

    document.querySelectorAll('.mobile-accordion-header').forEach(header => {
      header.addEventListener('click', () => {
        MobileUtils.triggerHaptic('light');
        const parent = header.closest('.mobile-accordion');
        if (parent) parent.classList.toggle('open');
      });
    });
  }

  // --- 1. Image Compressor Controller ---
  function initImageCompressor() {
    const input = document.getElementById('input-image-compressor');
    const box = document.getElementById('upload-image-compressor');
    const changeBtn = document.getElementById('change-image-compressor');
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
    const shareBtn = document.getElementById('share-image-compressor');

    let currentFile = null;
    let compressedResult = null;

    bindFileTrigger(box, input);
    bindFileTrigger(changeBtn, input);

    if (qualitySlider && qualityVal) {
      qualitySlider.addEventListener('input', () => {
        qualityVal.textContent = `${Math.round(qualitySlider.value * 100)}%`;
      });
    }

    if (input) {
      input.addEventListener('change', () => {
        if (input.files && input.files[0]) {
          MobileUtils.triggerHaptic('light');
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
        MobileUtils.triggerHaptic('light');
        actionBtn.disabled = true;
        actionBtn.textContent = 'Compressing...';

        try {
          const quality = parseFloat(qualitySlider.value);
          let format = 'image/jpeg';
          let ext = 'jpg';
          if (currentFile.type === 'image/png' || /\.png$/i.test(currentFile.name)) {
            format = 'image/png';
            ext = 'png';
          } else if (currentFile.type === 'image/webp' || /\.webp$/i.test(currentFile.name)) {
            format = 'image/webp';
            ext = 'webp';
          }
          compressedResult = await MobileImageEngine.compressImage(currentFile, { quality, format, formatChoice: 'original' });
          compressedResult.ext = ext;

          let statusHtml = '';
          let toastMsg = '';

          if (compressedResult.retainedOriginal) {
            statusHtml = '<div class="stat-pill"><span class="label">Status:</span> <strong style="color: var(--text-muted);">Original retained</strong></div>';
            toastMsg = 'Original file retained (already optimal)';
          } else if (compressedResult.savingsPercent > 0) {
            statusHtml = `<div class="stat-pill"><span class="label">Saved:</span> <strong class="text-primary">${compressedResult.savingsPercent}%</strong></div>`;
            toastMsg = `Compressed! Saved ${compressedResult.savingsPercent}%`;
          } else if (compressedResult.isExplicitConversion && compressedResult.newSize > compressedResult.originalSize) {
            statusHtml = '<div class="stat-pill"><span class="label">Status:</span> <strong style="color: var(--color-warning);">Converted (larger)</strong></div>';
            toastMsg = 'Image converted — output is larger';
          } else {
            statusHtml = '<div class="stat-pill"><span class="label">Status:</span> <strong style="color: var(--text-muted);">Original retained</strong></div>';
            toastMsg = 'Original file retained';
          }

          resultStats.innerHTML = `
            <div class="stat-pill"><span class="label">Original:</span> <strong>${MobileUtils.formatBytes(compressedResult.originalSize)}</strong></div>
            <div class="stat-pill"><span class="label">New:</span> <strong class="text-success">${MobileUtils.formatBytes(compressedResult.newSize)}</strong></div>
            ${statusHtml}
          `;
          previewImg.src = compressedResult.previewUrl;
          resultBox.classList.remove('hidden');
          MobileUtils.triggerHaptic('success');
          MobileUtils.showToast(toastMsg, 'success');
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
          const ext = compressedResult.ext || 'jpg';
          const outName = compressedResult.retainedOriginal 
            ? currentFile.name 
            : `${MobileUtils.getBaseName(currentFile.name)}_compressed.${ext}`;
          MobileUtils.downloadBlob(compressedResult.blob, outName);
        }
      });
    }

    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        if (compressedResult && compressedResult.blob) {
          const ext = compressedResult.ext || 'jpg';
          MobileUtils.shareBlob(compressedResult.blob, `${MobileUtils.getBaseName(currentFile.name)}_compressed.${ext}`, 'Compressed Image');
        }
      });
    }
  }

  // --- 2. PDF Compressor Controller ---
  function initPdfCompressor() {
    const input = document.getElementById('input-pdf-compressor');
    const box = document.getElementById('upload-pdf-compressor');
    const changeBtn = document.getElementById('change-pdf-compressor');
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
    const shareBtn = document.getElementById('share-pdf-compressor');

    let currentFile = null;
    let compressedPdfResult = null;

    bindFileTrigger(box, input);
    bindFileTrigger(changeBtn, input);

    if (input) {
      input.addEventListener('change', () => {
        if (input.files && input.files[0]) {
          MobileUtils.triggerHaptic('light');
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
        MobileUtils.triggerHaptic('light');
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
          MobileUtils.triggerHaptic('success');
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

    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        if (compressedPdfResult && compressedPdfResult.blob) {
          MobileUtils.shareBlob(compressedPdfResult.blob, compressedPdfResult.filename, 'Compressed PDF');
        }
      });
    }
  }

  // --- 3. Image to PDF Controller (Transform & Crop, Filter Presets, Signature Studio) ---
  function initImageToPdf() {
    const input = document.getElementById('input-image-to-pdf');
    const triggerBtn = document.getElementById('btn-trigger-image-to-pdf');
    const imageListEl = document.getElementById('list-image-to-pdf');
    const pageSizeSelect = document.getElementById('size-image-to-pdf');
    const orientationSelect = document.getElementById('orient-image-to-pdf');
    const marginSelect = document.getElementById('margin-image-to-pdf');
    const actionBtn = document.getElementById('btn-image-to-pdf');
    const resultBox = document.getElementById('result-image-to-pdf');
    const metaEl = document.getElementById('meta-image-to-pdf');
    const downloadBtn = document.getElementById('dl-image-to-pdf');
    const shareBtn = document.getElementById('share-image-to-pdf');

    // Live Preview & Signature Overlay DOM
    const livePreviewBox = document.getElementById('i2p-live-preview-box');
    const previewCanvas = document.getElementById('mobile-i2p-preview-canvas');
    const previewInfo = document.getElementById('i2p-preview-info');
    const prevPageBtn = document.getElementById('btn-i2p-prev-page');
    const nextPageBtn = document.getElementById('btn-i2p-next-page');
    const sigOverlay = document.getElementById('mobile-i2p-sig-overlay');
    const sigImgEl = document.getElementById('mobile-i2p-sig-img');
    const sigDelBtn = document.getElementById('mobile-i2p-sig-del');
    const sigResizeHandle = document.getElementById('mobile-i2p-sig-handle');
    const btnOpenSig = document.getElementById('btn-open-signature-modal');
    const labelSigBtn = document.getElementById('label-signature-btn');

    // Editor Modal DOM
    const editorModal = document.getElementById('mobile-i2p-editor-modal');
    const editorCloseBtn = document.getElementById('btn-close-i2p-editor');
    const editorDiscardBtn = document.getElementById('btn-i2p-discard-editor');
    const editorSaveBtn = document.getElementById('btn-i2p-save-editor');
    const editorCanvas = document.getElementById('mobile-i2p-editor-canvas');
    const editorToggleCropBtn = document.getElementById('btn-i2p-toggle-crop');
    const editorRotateCw = document.getElementById('btn-i2p-rotate-cw');
    const editorRotateCcw = document.getElementById('btn-i2p-rotate-ccw');
    const editorFlipH = document.getElementById('btn-i2p-flip-h');
    const editorFlipV = document.getElementById('btn-i2p-flip-v');
    const editorCropPanel = document.getElementById('panel-i2p-crop');
    const editorRatioBtns = document.querySelectorAll('.mobile-crop-ratio-btn');
    const editorApplyCropBtn = document.getElementById('btn-i2p-apply-crop');
    const editorResetCropBtn = document.getElementById('btn-i2p-reset-crop');
    const editorCancelCropBtn = document.getElementById('btn-i2p-cancel-crop');
    const editorFilterCardsRow = document.getElementById('row-i2p-filter-cards');

    // Signature Studio Modal DOM
    const sigModal = document.getElementById('mobile-i2p-signature-modal');
    const sigCloseBtn = document.getElementById('btn-close-i2p-sig');
    const sigCancelBtn = document.getElementById('btn-cancel-i2p-sig');
    const sigApplyBtn = document.getElementById('btn-apply-i2p-sig');
    const sigUploadBox = document.getElementById('box-i2p-sig-upload');
    const sigInput = document.getElementById('input-i2p-sig');
    const sigChangeBtn = document.getElementById('btn-change-i2p-sig');
    const sigPreviewWrap = document.getElementById('wrap-i2p-sig-preview');
    const sigCanvas = document.getElementById('mobile-i2p-sig-canvas');
    const sigControlsBox = document.getElementById('controls-i2p-sig');
    const sigSensSlider = document.getElementById('slider-i2p-sig-sens');
    const sigSensBadge = document.getElementById('badge-i2p-sig-sens');
    const sigInkChips = document.querySelectorAll('.mobile-ink-chip');
    const sigAutoCropCheck = document.getElementById('check-i2p-sig-autocrop');

    let imageItems = [];
    let activePreviewPage = 0;
    let generatedPdf = null;

    // Editor Modal Temp State
    let editingIndex = -1;
    let editingImgObj = null;
    let editorTempState = { crop: null, rotate: 0, flipH: false, flipV: false, filter: 'original' };
    let editorCropActive = false;
    let editorCropRatio = 'free';
    let editorCropRect = { x: 20, y: 20, w: 200, h: 200 };
    let isCropDragging = false;
    let cropDragMode = null;
    let cropDragStart = { x: 0, y: 0, rectX: 0, rectY: 0, rectW: 0, rectH: 0 };

    // Signature State
    let signatureRawImg = null;
    let signatureExtracted = null; // { dataUrl, width, height, aspectRatio }
    let signatureData = {
      active: false,
      dataUrl: null,
      aspectRatio: 1,
      relX: 0.60,
      relY: 0.72,
      relW: 0.30
    };
    let isSigDragging = false;
    let isSigResizing = false;
    let sigDragOrigin = { clientX: 0, clientY: 0, relX: 0, relY: 0, relW: 0 };

    bindFileTrigger(triggerBtn, input);
    bindFileTrigger(sigUploadBox, sigInput);
    bindFileTrigger(sigChangeBtn, sigInput);

    function renderImageList() {
      if (!imageListEl) return;
      if (imageItems.length === 0) {
        imageListEl.innerHTML = '<div class="mobile-empty-hint" style="color: var(--text-muted); font-size: 0.84rem; text-align: center; padding: 20px 0;">No images added yet. Tap <strong>+ Add Images</strong> to start.</div>';
        if (actionBtn) actionBtn.disabled = true;
        if (livePreviewBox) livePreviewBox.classList.add('hidden');
        return;
      }

      if (actionBtn) actionBtn.disabled = false;
      if (livePreviewBox) livePreviewBox.classList.remove('hidden');

      imageListEl.innerHTML = imageItems.map((item, idx) => `
        <div class="mobile-reorder-item" data-idx="${idx}">
          <div class="reorder-thumb">
            <img src="${item.previewUrl}" alt="Page ${idx + 1}" />
          </div>
          <div class="reorder-info">
            <div class="reorder-name">Page ${idx + 1}: ${item.file.name}</div>
            <div class="reorder-size">${item.width}×${item.height}px • ${item.editState.filter !== 'original' ? item.editState.filter : 'Normal'} ${item.editState.crop ? '• Cropped' : ''}</div>
            <div class="reorder-controls">
              <button type="button" class="btn btn-xs btn-secondary btn-edit-page" data-idx="${idx}" style="font-weight: 700; color: var(--color-primary); gap: 4px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 12px; height: 12px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                Edit / Filter
              </button>
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

      // Edit Button
      imageListEl.querySelectorAll('.btn-edit-page').forEach(b => {
        b.addEventListener('click', () => {
          MobileUtils.triggerHaptic('light');
          const idx = parseInt(b.dataset.idx, 10);
          openEditorModal(idx);
        });
      });

      // Move Up
      imageListEl.querySelectorAll('.btn-move-up').forEach(b => {
        b.addEventListener('click', () => {
          MobileUtils.triggerHaptic('light');
          const idx = parseInt(b.dataset.idx, 10);
          if (idx > 0) {
            const tmp = imageItems[idx];
            imageItems[idx] = imageItems[idx - 1];
            imageItems[idx - 1] = tmp;
            renderImageList();
            updateLivePreview();
          }
        });
      });

      // Move Down
      imageListEl.querySelectorAll('.btn-move-down').forEach(b => {
        b.addEventListener('click', () => {
          MobileUtils.triggerHaptic('light');
          const idx = parseInt(b.dataset.idx, 10);
          if (idx < imageItems.length - 1) {
            const tmp = imageItems[idx];
            imageItems[idx] = imageItems[idx + 1];
            imageItems[idx + 1] = tmp;
            renderImageList();
            updateLivePreview();
          }
        });
      });

      // Remove
      imageListEl.querySelectorAll('.btn-remove').forEach(b => {
        b.addEventListener('click', () => {
          MobileUtils.triggerHaptic('light');
          const idx = parseInt(b.dataset.idx, 10);
          MobileUtils.revokeUrl(imageItems[idx].previewUrl);
          imageItems.splice(idx, 1);
          if (activePreviewPage >= imageItems.length) activePreviewPage = Math.max(0, imageItems.length - 1);
          renderImageList();
          updateLivePreview();
        });
      });

      // Per-image orientation select
      imageListEl.querySelectorAll('.item-orient-select').forEach(sel => {
        sel.addEventListener('change', () => {
          const idx = parseInt(sel.dataset.idx, 10);
          imageItems[idx].orientation = sel.value;
          updateLivePreview();
        });
      });

      updateLivePreview();
    }

    if (input) {
      input.addEventListener('change', async () => {
        if (input.files && input.files.length > 0) {
          MobileUtils.triggerHaptic('light');
          for (let i = 0; i < input.files.length; i++) {
            const file = input.files[i];
            const dataUrl = await MobileUtils.readFileAsDataURL(file);
            const img = await MobileUtils.loadImageFromSrc(dataUrl);

            imageItems.push({
              file,
              dataUrl,
              previewUrl: dataUrl,
              width: img.width,
              height: img.height,
              orientation: 'auto',
              editState: {
                crop: null,
                rotate: 0,
                flipH: false,
                flipV: false,
                filter: 'original'
              }
            });
          }
          renderImageList();
          input.value = '';
        }
      });
    }

    // =========================================================================
    // LIVE PDF PAGE PREVIEW & INTERACTIVE SIGNATURE OVERLAY
    // =========================================================================
    async function updateLivePreview() {
      if (!previewCanvas || imageItems.length === 0) return;
      if (activePreviewPage >= imageItems.length) activePreviewPage = Math.max(0, imageItems.length - 1);

      if (previewInfo) previewInfo.textContent = `Page ${activePreviewPage + 1} of ${imageItems.length}`;
      if (prevPageBtn) prevPageBtn.disabled = activePreviewPage === 0;
      if (nextPageBtn) nextPageBtn.disabled = activePreviewPage === imageItems.length - 1;

      const curItem = imageItems[activePreviewPage];
      if (!curItem) return;

      const imgObj = await MobileUtils.loadImageFromSrc(curItem.dataUrl);

      // Render onto an offscreen canvas
      const offscreen = document.createElement('canvas');
      MobileImageToPdf.renderEditedImageToCanvas(offscreen, imgObj, curItem.editState);

      const maxDisplayW = 280;
      const scale = Math.min(maxDisplayW / offscreen.width, 360 / offscreen.height, 1);
      previewCanvas.width = Math.max(100, Math.round(offscreen.width * scale));
      previewCanvas.height = Math.max(100, Math.round(offscreen.height * scale));

      const ctx = previewCanvas.getContext('2d');
      ctx.drawImage(offscreen, 0, 0, previewCanvas.width, previewCanvas.height);

      renderSignatureOverlay();
    }

    function renderSignatureOverlay() {
      if (!sigOverlay || !signatureData.active || !signatureData.dataUrl) {
        if (sigOverlay) sigOverlay.classList.add('hidden');
        return;
      }

      sigOverlay.classList.remove('hidden');
      if (sigImgEl) sigImgEl.src = signatureData.dataUrl;

      const cw = previewCanvas.width;
      const ch = previewCanvas.height;
      if (cw <= 0 || ch <= 0) return;

      const pxW = Math.max(24, Math.round(cw * signatureData.relW));
      const pxH = Math.max(12, Math.round(pxW / (signatureData.aspectRatio || 1)));
      const pxX = Math.max(0, Math.min(cw - pxW, Math.round(cw * signatureData.relX)));
      const pxY = Math.max(0, Math.min(ch - pxH, Math.round(ch * signatureData.relY)));

      sigOverlay.style.left = `${pxX}px`;
      sigOverlay.style.top = `${pxY}px`;
      sigOverlay.style.width = `${pxW}px`;
      sigOverlay.style.height = `${pxH}px`;
    }

    // Prev / Next Page Preview Navigation
    if (prevPageBtn) {
      prevPageBtn.addEventListener('click', () => {
        if (activePreviewPage > 0) {
          activePreviewPage--;
          updateLivePreview();
        }
      });
    }

    if (nextPageBtn) {
      nextPageBtn.addEventListener('click', () => {
        if (activePreviewPage < imageItems.length - 1) {
          activePreviewPage++;
          updateLivePreview();
        }
      });
    }

    // Signature Drag on Live Preview
    if (sigOverlay) {
      sigOverlay.addEventListener('mousedown', onSigPointerDown);
      sigOverlay.addEventListener('touchstart', onSigTouchStart, { passive: false });

      if (sigResizeHandle) {
        sigResizeHandle.addEventListener('mousedown', onSigResizeDown);
        sigResizeHandle.addEventListener('touchstart', onSigResizeTouchStart, { passive: false });
      }

      if (sigDelBtn) {
        sigDelBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          signatureData.active = false;
          renderSignatureOverlay();
          if (labelSigBtn) labelSigBtn.textContent = 'Signature Studio';
          MobileUtils.showToast('Signature removed', 'info');
        });
      }
    }

    function onSigPointerDown(e) {
      if (e.target === sigResizeHandle || e.target === sigDelBtn || isSigResizing) return;
      isSigDragging = true;
      sigDragOrigin = {
        clientX: e.clientX,
        clientY: e.clientY,
        relX: signatureData.relX,
        relY: signatureData.relY
      };
      e.preventDefault();
    }

    function onSigTouchStart(e) {
      if (e.target === sigResizeHandle || e.target === sigDelBtn || isSigResizing || !e.touches[0]) return;
      isSigDragging = true;
      sigDragOrigin = {
        clientX: e.touches[0].clientX,
        clientY: e.touches[0].clientY,
        relX: signatureData.relX,
        relY: signatureData.relY
      };
      e.preventDefault();
    }

    function onSigResizeDown(e) {
      e.stopPropagation();
      isSigResizing = true;
      sigDragOrigin = {
        clientX: e.clientX,
        clientY: e.clientY,
        relW: signatureData.relW
      };
      e.preventDefault();
    }

    function onSigResizeTouchStart(e) {
      e.stopPropagation();
      if (!e.touches[0]) return;
      isSigResizing = true;
      sigDragOrigin = {
        clientX: e.touches[0].clientX,
        clientY: e.touches[0].clientY,
        relW: signatureData.relW
      };
      e.preventDefault();
    }

    function handleSigDragMove(clientX, clientY) {
      if (!signatureData.active || !previewCanvas) return;
      const cw = previewCanvas.width;
      const ch = previewCanvas.height;
      if (cw <= 0 || ch <= 0) return;

      if (isSigDragging) {
        const dx = (clientX - sigDragOrigin.clientX) / cw;
        const dy = (clientY - sigDragOrigin.clientY) / ch;

        const pxW = cw * signatureData.relW;
        const pxH = pxW / (signatureData.aspectRatio || 1);
        const relH = pxH / ch;

        signatureData.relX = Math.max(0, Math.min(1 - signatureData.relW, sigDragOrigin.relX + dx));
        signatureData.relY = Math.max(0, Math.min(1 - relH, sigDragOrigin.relY + dy));
        renderSignatureOverlay();
      } else if (isSigResizing) {
        const dx = (clientX - sigDragOrigin.clientX) / cw;
        const newW = Math.max(0.1, Math.min(0.85, sigDragOrigin.relW + dx));
        signatureData.relW = newW;
        renderSignatureOverlay();
      }
    }

    window.addEventListener('mousemove', (e) => {
      if (isSigDragging || isSigResizing) handleSigDragMove(e.clientX, e.clientY);
    });

    window.addEventListener('touchmove', (e) => {
      if ((isSigDragging || isSigResizing) && e.touches[0]) {
        handleSigDragMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener('mouseup', () => {
      isSigDragging = false;
      isSigResizing = false;
    });

    window.addEventListener('touchend', () => {
      isSigDragging = false;
      isSigResizing = false;
    });

    // =========================================================================
    // IMAGE EDITOR MODAL (TRANSFORM, CROP & FILTER PRESETS)
    // =========================================================================
    async function openEditorModal(index) {
      editingIndex = index;
      const item = imageItems[index];
      if (!item) return;

      editorTempState = JSON.parse(JSON.stringify(item.editState));
      editorCropActive = false;
      editorCropRatio = 'free';

      if (editorToggleCropBtn) editorToggleCropBtn.classList.remove('active');
      if (editorCropPanel) editorCropPanel.classList.add('hidden');

      editingImgObj = await MobileUtils.loadImageFromSrc(item.dataUrl);

      renderFilterCards();
      drawEditorCanvas();

      if (editorModal) editorModal.classList.remove('hidden');
    }

    function closeEditorModal() {
      if (editorModal) editorModal.classList.add('hidden');
      editingIndex = -1;
      editingImgObj = null;
      editorCropActive = false;
    }

    if (editorCloseBtn) editorCloseBtn.addEventListener('click', closeEditorModal);
    if (editorDiscardBtn) editorDiscardBtn.addEventListener('click', closeEditorModal);

    if (editorSaveBtn) {
      editorSaveBtn.addEventListener('click', async () => {
        if (editingIndex < 0 || editingIndex >= imageItems.length) return;
        const item = imageItems[editingIndex];
        item.editState = JSON.parse(JSON.stringify(editorTempState));

        // Create updated thumbnail preview
        const offscreen = document.createElement('canvas');
        MobileImageToPdf.renderEditedImageToCanvas(offscreen, editingImgObj, item.editState);
        item.previewUrl = offscreen.toDataURL('image/jpeg', 0.88);
        item.width = offscreen.width;
        item.height = offscreen.height;

        renderImageList();
        updateLivePreview();
        closeEditorModal();
        MobileUtils.showToast('Changes saved!', 'success');
      });
    }

    // Transform buttons
    if (editorRotateCw) {
      editorRotateCw.addEventListener('click', () => {
        editorTempState.rotate = (editorTempState.rotate + 90) % 360;
        drawEditorCanvas();
        renderFilterCards();
      });
    }

    if (editorRotateCcw) {
      editorRotateCcw.addEventListener('click', () => {
        editorTempState.rotate = (editorTempState.rotate - 90 + 360) % 360;
        drawEditorCanvas();
        renderFilterCards();
      });
    }

    if (editorFlipH) {
      editorFlipH.addEventListener('click', () => {
        editorTempState.flipH = !editorTempState.flipH;
        drawEditorCanvas();
        renderFilterCards();
      });
    }

    if (editorFlipV) {
      editorFlipV.addEventListener('click', () => {
        editorTempState.flipV = !editorTempState.flipV;
        drawEditorCanvas();
        renderFilterCards();
      });
    }

    // Crop Toggle & Ratios
    if (editorToggleCropBtn) {
      editorToggleCropBtn.addEventListener('click', () => {
        editorCropActive = !editorCropActive;
        editorToggleCropBtn.classList.toggle('active', editorCropActive);
        if (editorCropPanel) editorCropPanel.classList.toggle('hidden', !editorCropActive);
        if (editorCropActive) initCropRect();
        drawEditorCanvas();
      });
    }

    editorRatioBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        editorCropRatio = btn.dataset.ratio;
        editorRatioBtns.forEach(b => b.classList.toggle('active', b === btn));
        adjustCropRectToRatio();
        drawEditorCanvas();
      });
    });

    if (editorApplyCropBtn) {
      editorApplyCropBtn.addEventListener('click', () => {
        if (!editorCanvas || !editingImgObj) return;
        const cw = editorCanvas.width;
        const ch = editorCanvas.height;
        const isRotated90 = (editorTempState.rotate === 90 || editorTempState.rotate === 270);
        const baseW = isRotated90 ? editingImgObj.naturalHeight : editingImgObj.naturalWidth;
        const baseH = isRotated90 ? editingImgObj.naturalWidth : editingImgObj.naturalHeight;

        const scaleX = baseW / cw;
        const scaleY = baseH / ch;

        editorTempState.crop = {
          x: Math.max(0, Math.round(editorCropRect.x * scaleX)),
          y: Math.max(0, Math.round(editorCropRect.y * scaleY)),
          w: Math.min(baseW, Math.round(editorCropRect.w * scaleX)),
          h: Math.min(baseH, Math.round(editorCropRect.h * scaleY))
        };

        editorCropActive = false;
        if (editorToggleCropBtn) editorToggleCropBtn.classList.remove('active');
        if (editorCropPanel) editorCropPanel.classList.add('hidden');

        drawEditorCanvas();
        renderFilterCards();
        MobileUtils.showToast('Crop applied! Tap Save Changes to keep.', 'info');
      });
    }

    if (editorResetCropBtn) {
      editorResetCropBtn.addEventListener('click', () => {
        editorTempState.crop = null;
        editorCropActive = false;
        if (editorToggleCropBtn) editorToggleCropBtn.classList.remove('active');
        if (editorCropPanel) editorCropPanel.classList.add('hidden');
        drawEditorCanvas();
        renderFilterCards();
        MobileUtils.showToast('Crop reset to full image.', 'info');
      });
    }

    if (editorCancelCropBtn) {
      editorCancelCropBtn.addEventListener('click', () => {
        editorCropActive = false;
        if (editorToggleCropBtn) editorToggleCropBtn.classList.remove('active');
        if (editorCropPanel) editorCropPanel.classList.add('hidden');
        drawEditorCanvas();
      });
    }

    function initCropRect() {
      if (!editorCanvas) return;
      const cw = editorCanvas.width;
      const ch = editorCanvas.height;
      editorCropRect = {
        x: Math.round(cw * 0.1),
        y: Math.round(ch * 0.1),
        w: Math.round(cw * 0.8),
        h: Math.round(ch * 0.8)
      };
      adjustCropRectToRatio();
    }

    function adjustCropRectToRatio() {
      if (editorCropRatio === 'free') return;
      let targetRatio = 1;
      if (editorCropRatio === '1:1') targetRatio = 1;
      else if (editorCropRatio === '4:3') targetRatio = 4 / 3;
      else if (editorCropRatio === '16:9') targetRatio = 16 / 9;
      else if (editorCropRatio === 'a4') targetRatio = 210 / 297;

      const currentRatio = editorCropRect.w / editorCropRect.h;
      if (currentRatio > targetRatio) {
        editorCropRect.w = editorCropRect.h * targetRatio;
      } else {
        editorCropRect.h = editorCropRect.w / targetRatio;
      }
    }

    function drawEditorCanvas() {
      if (!editorCanvas || !editingImgObj) return;

      const isRotated90 = (editorTempState.rotate === 90 || editorTempState.rotate === 270);
      let baseW = editorTempState.crop ? editorTempState.crop.w : (editingImgObj.naturalWidth || editingImgObj.width);
      let baseH = editorTempState.crop ? editorTempState.crop.h : (editingImgObj.naturalHeight || editingImgObj.height);
      let dispW = isRotated90 ? baseH : baseW;
      let dispH = isRotated90 ? baseW : baseH;

      const maxDisplayW = Math.min(320, window.innerWidth - 48);
      const maxDisplayH = 260;
      const scale = Math.min(maxDisplayW / dispW, maxDisplayH / dispH, 1);

      const canvasW = Math.max(80, Math.round(dispW * scale));
      const canvasH = Math.max(80, Math.round(dispH * scale));

      MobileImageToPdf.renderEditedImageToCanvas(editorCanvas, editingImgObj, editorTempState, canvasW, canvasH);

      if (editorCropActive) {
        drawCropOverlay(editorCanvas);
      }
    }

    function drawCropOverlay(canvas) {
      const ctx = canvas.getContext('2d');
      const cw = canvas.width;
      const ch = canvas.height;
      const r = editorCropRect;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(0, 0, cw, r.y);
      ctx.fillRect(0, r.y + r.h, cw, ch - (r.y + r.h));
      ctx.fillRect(0, r.y, r.x, r.h);
      ctx.fillRect(r.x + r.w, r.y, cw - (r.x + r.w), r.h);

      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;
      ctx.strokeRect(r.x, r.y, r.w, r.h);

      // Rule of thirds grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(r.x + r.w / 3, r.y);
      ctx.lineTo(r.x + r.w / 3, r.y + r.h);
      ctx.moveTo(r.x + (r.w * 2) / 3, r.y);
      ctx.lineTo(r.x + (r.w * 2) / 3, r.y + r.h);
      ctx.moveTo(r.x, r.y + r.h / 3);
      ctx.lineTo(r.x + r.w, r.y + r.h / 3);
      ctx.moveTo(r.x, r.y + (r.h * 2) / 3);
      ctx.lineTo(r.x + r.w, r.y + (r.h * 2) / 3);
      ctx.stroke();
      ctx.setLineDash([]);

      // Corner Drag Handles
      const handles = [
        { x: r.x, y: r.y },
        { x: r.x + r.w, y: r.y },
        { x: r.x + r.w, y: r.y + r.h },
        { x: r.x, y: r.y + r.h }
      ];

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;
      handles.forEach(h => {
        ctx.beginPath();
        ctx.arc(h.x, h.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    }

    // Touch & Cursor Crop Pointer Events
    function getCanvasCoords(clientX, clientY) {
      if (!editorCanvas) return { x: 0, y: 0 };
      const rect = editorCanvas.getBoundingClientRect();
      const scaleX = editorCanvas.width / (rect.width || 1);
      const scaleY = editorCanvas.height / (rect.height || 1);
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    }

    function getCropHandleAt(x, y) {
      const r = editorCropRect;
      const pad = 28; // Touch area
      if (Math.hypot(x - r.x, y - r.y) < pad) return 'nw';
      if (Math.hypot(x - (r.x + r.w), y - r.y) < pad) return 'ne';
      if (Math.hypot(x - (r.x + r.w), y - (r.y + r.h)) < pad) return 'se';
      if (Math.hypot(x - r.x, y - (r.y + r.h)) < pad) return 'sw';
      if (x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h) return 'move';
      return null;
    }

    if (editorCanvas) {
      editorCanvas.addEventListener('mousedown', (e) => {
        if (!editorCropActive) return;
        const { x, y } = getCanvasCoords(e.clientX, e.clientY);
        cropDragMode = getCropHandleAt(x, y);
        if (cropDragMode) {
          isCropDragging = true;
          cropDragStart = { x, y, rectX: editorCropRect.x, rectY: editorCropRect.y, rectW: editorCropRect.w, rectH: editorCropRect.h };
        }
      });

      editorCanvas.addEventListener('touchstart', (e) => {
        if (!editorCropActive || !e.touches[0]) return;
        const { x, y } = getCanvasCoords(e.touches[0].clientX, e.touches[0].clientY);
        cropDragMode = getCropHandleAt(x, y);
        if (cropDragMode) {
          e.preventDefault();
          isCropDragging = true;
          cropDragStart = { x, y, rectX: editorCropRect.x, rectY: editorCropRect.y, rectW: editorCropRect.w, rectH: editorCropRect.h };
        }
      }, { passive: false });
    }

    function updateCropDrag(clientX, clientY) {
      if (!editorCropActive || !isCropDragging || !editorCanvas) return;
      const { x, y } = getCanvasCoords(clientX, clientY);
      const dx = x - cropDragStart.x;
      const dy = y - cropDragStart.y;
      const cw = editorCanvas.width;
      const ch = editorCanvas.height;
      const minSize = 25;

      let newX = cropDragStart.rectX;
      let newY = cropDragStart.rectY;
      let newW = cropDragStart.rectW;
      let newH = cropDragStart.rectH;

      if (cropDragMode === 'move') {
        newX = Math.max(0, Math.min(cw - newW, cropDragStart.rectX + dx));
        newY = Math.max(0, Math.min(ch - newH, cropDragStart.rectY + dy));
      } else if (cropDragMode === 'se') {
        newW = Math.max(minSize, Math.min(cw - newX, cropDragStart.rectW + dx));
        newH = Math.max(minSize, Math.min(ch - newY, cropDragStart.rectH + dy));
      } else if (cropDragMode === 'nw') {
        newW = Math.max(minSize, cropDragStart.rectW - dx);
        newH = Math.max(minSize, cropDragStart.rectH - dy);
        newX = cropDragStart.rectX + (cropDragStart.rectW - newW);
        newY = cropDragStart.rectY + (cropDragStart.rectH - newH);
      } else if (cropDragMode === 'ne') {
        newW = Math.max(minSize, Math.min(cw - newX, cropDragStart.rectW + dx));
        newH = Math.max(minSize, cropDragStart.rectH - dy);
        newY = cropDragStart.rectY + (cropDragStart.rectH - newH);
      } else if (cropDragMode === 'sw') {
        newW = Math.max(minSize, cropDragStart.rectW - dx);
        newH = Math.max(minSize, Math.min(ch - newY, cropDragStart.rectH + dy));
        newX = cropDragStart.rectX + (cropDragStart.rectW - newW);
      }

      editorCropRect = { x: newX, y: newY, w: newW, h: newH };
      adjustCropRectToRatio();
      drawEditorCanvas();
    }

    window.addEventListener('mousemove', (e) => {
      if (isCropDragging) updateCropDrag(e.clientX, e.clientY);
    });

    window.addEventListener('touchmove', (e) => {
      if (isCropDragging && e.touches[0]) updateCropDrag(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    window.addEventListener('mouseup', () => { isCropDragging = false; cropDragMode = null; });
    window.addEventListener('touchend', () => { isCropDragging = false; cropDragMode = null; });

    // Render Filter Preset Cards
    function renderFilterCards() {
      if (!editorFilterCardsRow || !editingImgObj) return;
      editorFilterCardsRow.innerHTML = '';

      const activeF = editorTempState.filter || 'original';

      MobileImageToPdf.FILTER_PRESETS.forEach(preset => {
        const card = document.createElement('div');
        card.className = `mobile-filter-card ${preset.id === activeF ? 'active' : ''}`;
        card.dataset.filter = preset.id;

        const thumbCanvas = document.createElement('canvas');
        const thumbState = {
          crop: editorTempState.crop,
          rotate: editorTempState.rotate,
          flipH: editorTempState.flipH,
          flipV: editorTempState.flipV,
          filter: preset.id
        };
        MobileImageToPdf.renderEditedImageToCanvas(thumbCanvas, editingImgObj, thumbState, 60, 60);

        card.innerHTML = `
          <div class="mobile-filter-card-thumb"></div>
          <span class="mobile-filter-card-name">${preset.name}</span>
        `;
        card.querySelector('.mobile-filter-card-thumb').appendChild(thumbCanvas);

        card.addEventListener('click', () => {
          editorTempState.filter = preset.id;
          editorFilterCardsRow.querySelectorAll('.mobile-filter-card').forEach(c => c.classList.toggle('active', c === card));
          drawEditorCanvas();
        });

        editorFilterCardsRow.appendChild(card);
      });
    }

    // =========================================================================
    // SIGNATURE STUDIO MODAL
    // =========================================================================
    if (btnOpenSig) {
      btnOpenSig.addEventListener('click', () => {
        if (sigModal) sigModal.classList.remove('hidden');
        if (signatureRawImg) {
          if (sigUploadBox) sigUploadBox.classList.add('hidden');
          if (sigPreviewWrap) sigPreviewWrap.classList.remove('hidden');
          if (sigControlsBox) sigControlsBox.classList.remove('hidden');
          processSignature();
        } else {
          if (sigUploadBox) sigUploadBox.classList.remove('hidden');
          if (sigPreviewWrap) sigPreviewWrap.classList.add('hidden');
          if (sigControlsBox) sigControlsBox.classList.add('hidden');
        }
      });
    }

    if (sigCloseBtn) sigCloseBtn.addEventListener('click', () => sigModal && sigModal.classList.add('hidden'));
    if (sigCancelBtn) sigCancelBtn.addEventListener('click', () => sigModal && sigModal.classList.add('hidden'));

    if (sigInput) {
      sigInput.addEventListener('change', async () => {
        if (sigInput.files && sigInput.files[0]) {
          MobileUtils.triggerHaptic('light');
          const file = sigInput.files[0];
          const dataUrl = await MobileUtils.readFileAsDataURL(file);
          signatureRawImg = await MobileUtils.loadImageFromSrc(dataUrl);

          if (sigUploadBox) sigUploadBox.classList.add('hidden');
          if (sigPreviewWrap) sigPreviewWrap.classList.remove('hidden');
          if (sigControlsBox) sigControlsBox.classList.remove('hidden');
          if (sigApplyBtn) sigApplyBtn.disabled = false;

          processSignature();
          sigInput.value = '';
        }
      });
    }

    let sigSettings = { sensitivity: 45, inkColor: 'original', autoCrop: true };

    if (sigSensSlider) {
      sigSensSlider.addEventListener('input', () => {
        sigSettings.sensitivity = parseInt(sigSensSlider.value, 10);
        if (sigSensBadge) sigSensBadge.textContent = `${sigSettings.sensitivity}%`;
        processSignature();
      });
    }

    sigInkChips.forEach(chip => {
      chip.addEventListener('click', () => {
        sigSettings.inkColor = chip.dataset.color;
        sigInkChips.forEach(c => c.classList.toggle('active', c === chip));
        processSignature();
      });
    });

    if (sigAutoCropCheck) {
      sigAutoCropCheck.addEventListener('change', () => {
        sigSettings.autoCrop = sigAutoCropCheck.checked;
        processSignature();
      });
    }

    function processSignature() {
      if (!signatureRawImg || !sigCanvas) return;
      signatureExtracted = MobileImageToPdf.extractSignature(signatureRawImg, sigSettings);

      const maxW = 260, maxH = 130;
      const scale = Math.min(maxW / signatureExtracted.width, maxH / signatureExtracted.height, 1);
      sigCanvas.width = Math.max(50, Math.round(signatureExtracted.width * scale));
      sigCanvas.height = Math.max(30, Math.round(signatureExtracted.height * scale));

      const ctx = sigCanvas.getContext('2d');
      ctx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
      ctx.drawImage(signatureExtracted.canvas, 0, 0, sigCanvas.width, sigCanvas.height);
    }

    if (sigApplyBtn) {
      sigApplyBtn.addEventListener('click', () => {
        if (!signatureExtracted || !signatureExtracted.dataUrl) return;
        signatureData.active = true;
        signatureData.dataUrl = signatureExtracted.dataUrl;
        signatureData.aspectRatio = signatureExtracted.aspectRatio;

        if (labelSigBtn) labelSigBtn.textContent = 'Edit Signature';
        if (sigModal) sigModal.classList.add('hidden');

        updateLivePreview();
        MobileUtils.showToast('Signature added! Drag to position on pages.', 'success');
      });
    }

    // =========================================================================
    // GENERATE PDF
    // =========================================================================
    if (actionBtn) {
      actionBtn.addEventListener('click', async () => {
        if (imageItems.length === 0) return;
        MobileUtils.triggerHaptic('light');
        actionBtn.disabled = true;
        actionBtn.textContent = 'Creating PDF...';

        try {
          const options = {
            pageSize: pageSizeSelect ? pageSizeSelect.value : 'a4',
            globalOrientation: orientationSelect ? orientationSelect.value : 'auto',
            margin: marginSelect ? marginSelect.value : 'none',
            filename: 'FileForge_Images.pdf'
          };

          generatedPdf = await MobileImageToPdf.generatePdf(imageItems, options, signatureData, (curr, total) => {
            actionBtn.textContent = `Rendering Page ${curr} of ${total}...`;
          });

          if (metaEl) {
            metaEl.textContent = `${generatedPdf.pageCount} Page${generatedPdf.pageCount !== 1 ? 's' : ''} • ${MobileUtils.formatBytes(generatedPdf.size)} ${signatureData.active ? '• With Signature' : ''}`;
          }

          resultBox.classList.remove('hidden');
          MobileUtils.triggerHaptic('success');
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

    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        if (generatedPdf && generatedPdf.blob) {
          MobileUtils.shareBlob(generatedPdf.blob, generatedPdf.filename, 'Generated PDF');
        }
      });
    }
  }


  // --- 4 & 5. PDF to JPG / PDF to PNG Controller ---
  function initPdfToImagesTool(toolId, format) {
    const input = document.getElementById(`input-${toolId}`);
    const box = document.getElementById(`upload-${toolId}`);
    const changeBtn = document.getElementById(`change-${toolId}`);
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
    const shareAllBtn = document.getElementById(`share-all-${toolId}`);

    let currentFile = null;
    let convertedImages = [];

    bindFileTrigger(box, input);
    bindFileTrigger(changeBtn, input);

    if (input) {
      input.addEventListener('change', () => {
        if (input.files && input.files[0]) {
          MobileUtils.triggerHaptic('light');
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
        MobileUtils.triggerHaptic('light');
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
          MobileUtils.triggerHaptic('success');
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

    if (shareAllBtn) {
      shareAllBtn.addEventListener('click', async () => {
        if (convertedImages.length === 0) return;
        try {
          const zipName = `${MobileUtils.getBaseName(currentFile.name)}_images.zip`;
          const zipRes = await MobileZipEngine.bundleBlobsAsZip(convertedImages, zipName);
          MobileUtils.shareBlob(zipRes.blob, zipRes.filename, 'Extracted Pages (ZIP)');
        } catch (e) {
          MobileUtils.showToast('Failed to share ZIP', 'error');
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
    const changeBtn = document.getElementById(`change-${toolId}`);
    const selectedSec = document.getElementById(`selected-${toolId}`);
    const fileNameEl = document.getElementById(`name-${toolId}`);
    const fileSizeEl = document.getElementById(`size-${toolId}`);
    const actionBtn = document.getElementById(`btn-${toolId}`);
    const resultBox = document.getElementById(`result-${toolId}`);
    const previewImg = document.getElementById(`preview-${toolId}`);
    const downloadBtn = document.getElementById(`dl-${toolId}`);
    const shareBtn = document.getElementById(`share-${toolId}`);

    let currentFile = null;
    let convertedResult = null;

    bindFileTrigger(box, input);
    bindFileTrigger(changeBtn, input);

    if (input) {
      input.addEventListener('change', () => {
        if (input.files && input.files[0]) {
          MobileUtils.triggerHaptic('light');
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
        MobileUtils.triggerHaptic('light');
        actionBtn.disabled = true;
        actionBtn.textContent = 'Converting...';

        try {
          convertedResult = await MobileImageEngine.convertImage(currentFile, targetFormat, 0.95);
          previewImg.src = convertedResult.previewUrl;
          resultBox.classList.remove('hidden');
          MobileUtils.triggerHaptic('success');
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

    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        if (convertedResult && convertedResult.blob) {
          MobileUtils.shareBlob(convertedResult.blob, convertedResult.filename, `Converted ${targetExt.toUpperCase()}`);
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

  // --- 8. Image Resizer Controller (Interactive Touch / Finger Scaling) ---
  function initImageResizer() {
    const input = document.getElementById('input-image-resizer');
    const box = document.getElementById('upload-image-resizer');
    const changeBtn = document.getElementById('change-image-resizer');
    const selectedSec = document.getElementById('selected-image-resizer');
    const fileNameEl = document.getElementById('name-image-resizer');
    const originalDimsEl = document.getElementById('dims-image-resizer');
    const touchBox = document.getElementById('box-touch-resizer');
    const imageWrapper = document.getElementById('wrapper-touch-image');
    const touchThumb = document.getElementById('thumb-touch-resizer');
    const touchHandle = document.getElementById('handle-touch-resizer');
    const badgePct = document.getElementById('badge-pct-image-resizer');
    const slider = document.getElementById('slider-image-resizer');
    const valSlider = document.getElementById('val-slider-image-resizer');
    const presetBtns = document.querySelectorAll('.touch-preset-btn');
    const lockRatioCheck = document.getElementById('lock-ratio-image-resizer');
    const widthInput = document.getElementById('width-image-resizer');
    const heightInput = document.getElementById('height-image-resizer');
    const actionBtn = document.getElementById('btn-image-resizer');
    const resultBox = document.getElementById('result-image-resizer');
    const previewImg = document.getElementById('preview-image-resizer');
    const resultDimsEl = document.getElementById('result-dims-image-resizer');
    const downloadBtn = document.getElementById('dl-image-resizer');
    const shareBtn = document.getElementById('share-image-resizer');

    let currentFile = null;
    let originalWidth = 0;
    let originalHeight = 0;
    let currentScalePct = 100;
    let resizedResult = null;

    bindFileTrigger(box, input);
    bindFileTrigger(changeBtn, input);

    function updateDimensionsFromScale(scalePct) {
      currentScalePct = Math.max(10, Math.min(300, Math.round(scalePct)));
      const newW = Math.max(1, Math.round((originalWidth * currentScalePct) / 100));
      const newH = Math.max(1, Math.round((originalHeight * currentScalePct) / 100));

      if (widthInput) widthInput.value = newW;
      if (heightInput) heightInput.value = newH;
      if (slider) slider.value = currentScalePct;
      if (valSlider) valSlider.textContent = `${currentScalePct}%`;
      if (badgePct) badgePct.textContent = `${currentScalePct}% (${newW}×${newH}px)`;

      presetBtns.forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.scale, 10) === currentScalePct);
      });

      // Visual scaling in touch canvas preview
      if (imageWrapper) {
        const visualScale = Math.min(1.5, Math.max(0.3, currentScalePct / 100));
        imageWrapper.style.transform = `scale(${visualScale})`;
        imageWrapper.style.transformOrigin = 'center center';
      }
    }

    // Touch / Mouse Drag Resizing on Corner Handle
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startScale = 100;

    function onDragStart(clientX, clientY) {
      isDragging = true;
      startX = clientX;
      startY = clientY;
      startScale = currentScalePct;
      MobileUtils.triggerHaptic('light');
    }

    function onDragMove(clientX, clientY) {
      if (!isDragging) return;
      const deltaX = clientX - startX;
      const deltaY = clientY - startY;
      const delta = (deltaX + deltaY) / 2;
      const sensitivity = 0.6; // Adjust speed of finger drag
      const newScale = Math.round(startScale + delta * sensitivity);
      updateDimensionsFromScale(newScale);
    }

    function onDragEnd() {
      if (isDragging) {
        isDragging = false;
        MobileUtils.triggerHaptic('light');
      }
    }

    if (touchHandle) {
      touchHandle.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches[0]) {
          onDragStart(e.touches[0].clientX, e.touches[0].clientY);
        }
        e.preventDefault();
      }, { passive: false });

      touchHandle.addEventListener('mousedown', (e) => {
        onDragStart(e.clientX, e.clientY);
        e.preventDefault();
      });
    }

    window.addEventListener('touchmove', (e) => {
      if (isDragging && e.touches && e.touches[0]) {
        onDragMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener('mousemove', (e) => {
      if (isDragging) onDragMove(e.clientX, e.clientY);
    });

    window.addEventListener('touchend', onDragEnd);
    window.addEventListener('mouseup', onDragEnd);

    // Finger slider input
    if (slider) {
      slider.addEventListener('input', () => {
        updateDimensionsFromScale(parseInt(slider.value, 10));
      });
    }

    // Preset buttons
    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        MobileUtils.triggerHaptic('light');
        const scale = parseInt(btn.dataset.scale, 10);
        if (scale) updateDimensionsFromScale(scale);
      });
    });

    // Width input manual change
    if (widthInput) {
      widthInput.addEventListener('input', () => {
        const w = parseInt(widthInput.value, 10) || 1;
        if (originalWidth) {
          const scale = (w / originalWidth) * 100;
          if (lockRatioCheck && lockRatioCheck.checked && heightInput) {
            heightInput.value = Math.max(1, Math.round((originalHeight * w) / originalWidth));
          }
          currentScalePct = Math.round(scale);
          if (slider) slider.value = currentScalePct;
          if (valSlider) valSlider.textContent = `${currentScalePct}%`;
          if (badgePct) badgePct.textContent = `${currentScalePct}%`;
        }
      });
    }

    // Height input manual change
    if (heightInput) {
      heightInput.addEventListener('input', () => {
        const h = parseInt(heightInput.value, 10) || 1;
        if (originalHeight) {
          const scale = (h / originalHeight) * 100;
          if (lockRatioCheck && lockRatioCheck.checked && widthInput) {
            widthInput.value = Math.max(1, Math.round((originalWidth * h) / originalHeight));
          }
          currentScalePct = Math.round(scale);
          if (slider) slider.value = currentScalePct;
          if (valSlider) valSlider.textContent = `${currentScalePct}%`;
          if (badgePct) badgePct.textContent = `${currentScalePct}%`;
        }
      });
    }

    if (input) {
      input.addEventListener('change', async () => {
        if (input.files && input.files[0]) {
          MobileUtils.triggerHaptic('light');
          currentFile = input.files[0];
          fileNameEl.textContent = currentFile.name;
          const dataUrl = await MobileUtils.readFileAsDataURL(currentFile);
          const img = await MobileUtils.loadImageFromSrc(dataUrl);
          originalWidth = img.width;
          originalHeight = img.height;
          originalDimsEl.textContent = `${originalWidth} × ${originalHeight} px`;

          if (touchThumb) touchThumb.src = dataUrl;
          updateDimensionsFromScale(100);

          box.classList.add('hidden');
          selectedSec.classList.remove('hidden');
          resultBox.classList.add('hidden');
        }
      });
    }

    if (actionBtn) {
      actionBtn.addEventListener('click', async () => {
        if (!currentFile) return;
        MobileUtils.triggerHaptic('light');
        actionBtn.disabled = true;
        actionBtn.textContent = 'Resizing...';

        try {
          const targetW = parseInt(widthInput.value, 10) || originalWidth;
          const targetH = parseInt(heightInput.value, 10) || originalHeight;
          resizedResult = await MobileImageEngine.resizeImage(currentFile, {
            width: targetW,
            height: targetH
          });

          resultDimsEl.textContent = `${resizedResult.width} × ${resizedResult.height} px (${MobileUtils.formatBytes(resizedResult.size)})`;
          previewImg.src = resizedResult.previewUrl;
          resultBox.classList.remove('hidden');
          MobileUtils.triggerHaptic('success');
          MobileUtils.showToast('Image Resized!', 'success');
        } catch (err) {
          MobileUtils.showToast(err.message || 'Resize failed', 'error');
        } finally {
          actionBtn.disabled = false;
          actionBtn.textContent = 'Resize & Save Image';
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

    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        if (resizedResult && resizedResult.blob) {
          const ext = MobileUtils.getExtension(currentFile.name) || 'png';
          MobileUtils.shareBlob(resizedResult.blob, `${MobileUtils.getBaseName(currentFile.name)}_resized.${ext}`, 'Resized Image');
        }
      });
    }
  }

  // --- 9. Image Converter Controller ---
  function initImageConverter() {
    const input = document.getElementById('input-image-converter');
    const box = document.getElementById('upload-image-converter');
    const changeBtn = document.getElementById('change-image-converter');
    const selectedSec = document.getElementById('selected-image-converter');
    const fileNameEl = document.getElementById('name-image-converter');
    const fileSizeEl = document.getElementById('size-image-converter');
    const formatSelect = document.getElementById('format-image-converter');
    const actionBtn = document.getElementById('btn-image-converter');
    const resultBox = document.getElementById('result-image-converter');
    const previewImg = document.getElementById('preview-image-converter');
    const downloadBtn = document.getElementById('dl-image-converter');
    const shareBtn = document.getElementById('share-image-converter');

    let currentFile = null;
    let convertedResult = null;

    bindFileTrigger(box, input);
    bindFileTrigger(changeBtn, input);

    if (input) {
      input.addEventListener('change', () => {
        if (input.files && input.files[0]) {
          MobileUtils.triggerHaptic('light');
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
        MobileUtils.triggerHaptic('light');
        actionBtn.disabled = true;
        actionBtn.textContent = 'Converting...';

        try {
          const targetFmt = formatSelect ? formatSelect.value : 'image/png';
          convertedResult = await MobileImageEngine.convertImage(currentFile, targetFmt);
          previewImg.src = convertedResult.previewUrl;
          resultBox.classList.remove('hidden');
          MobileUtils.triggerHaptic('success');
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

    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        if (convertedResult && convertedResult.blob) {
          MobileUtils.shareBlob(convertedResult.blob, convertedResult.filename, 'Converted Image');
        }
      });
    }
  }

  // --- 10. PDF Merger Controller ---
  function initPdfMerger() {
    const input = document.getElementById('input-pdf-merger');
    const triggerBtn = document.getElementById('btn-trigger-pdf-merger');
    const listEl = document.getElementById('list-pdf-merger');
    const actionBtn = document.getElementById('btn-pdf-merger');
    const resultBox = document.getElementById('result-pdf-merger');
    const resultInfo = document.getElementById('info-pdf-merger');
    const downloadBtn = document.getElementById('dl-pdf-merger');
    const shareBtn = document.getElementById('share-pdf-merger');

    let pdfFiles = [];
    let mergedResult = null;

    bindFileTrigger(triggerBtn, input);

    function renderList() {
      if (!listEl) return;
      if (pdfFiles.length === 0) {
        listEl.innerHTML = '<div class="mobile-empty-hint" style="color: var(--text-muted); font-size: 0.84rem; text-align: center; padding: 20px 0;">Add at least 2 PDF files to combine them.</div>';
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
          MobileUtils.triggerHaptic('light');
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
          MobileUtils.triggerHaptic('light');
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
          MobileUtils.triggerHaptic('light');
          const idx = parseInt(b.dataset.idx, 10);
          pdfFiles.splice(idx, 1);
          renderList();
        });
      });
    }

    if (input) {
      input.addEventListener('change', () => {
        if (input.files && input.files.length > 0) {
          MobileUtils.triggerHaptic('light');
          Array.from(input.files).forEach(f => pdfFiles.push(f));
          renderList();
          input.value = '';
        }
      });
    }

    if (actionBtn) {
      actionBtn.addEventListener('click', async () => {
        if (pdfFiles.length < 2) return;
        MobileUtils.triggerHaptic('light');
        actionBtn.disabled = true;
        actionBtn.textContent = 'Merging PDFs...';

        try {
          mergedResult = await MobilePdfEngine.mergePdfs(pdfFiles);
          resultInfo.textContent = `Merged ${pdfFiles.length} files (${mergedResult.pageCount} pages, ${MobileUtils.formatBytes(mergedResult.size)})`;
          resultBox.classList.remove('hidden');
          MobileUtils.triggerHaptic('success');
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

    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        if (mergedResult && mergedResult.blob) {
          MobileUtils.shareBlob(mergedResult.blob, mergedResult.filename, 'Merged PDF');
        }
      });
    }
  }

  // --- 11. PDF Splitter Controller ---
  function initPdfSplitter() {
    const input = document.getElementById('input-pdf-splitter');
    const box = document.getElementById('upload-pdf-splitter');
    const changeBtn = document.getElementById('change-pdf-splitter');
    const selectedSec = document.getElementById('selected-pdf-splitter');
    const fileNameEl = document.getElementById('name-pdf-splitter');
    const fileSizeEl = document.getElementById('size-pdf-splitter');
    const rangeInput = document.getElementById('range-pdf-splitter');
    const actionBtn = document.getElementById('btn-pdf-splitter');
    const resultBox = document.getElementById('result-pdf-splitter');
    const downloadBtn = document.getElementById('dl-pdf-splitter');
    const shareBtn = document.getElementById('share-pdf-splitter');

    let currentFile = null;
    let splitResult = null;

    bindFileTrigger(box, input);
    bindFileTrigger(changeBtn, input);

    if (input) {
      input.addEventListener('change', () => {
        if (input.files && input.files[0]) {
          MobileUtils.triggerHaptic('light');
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
        MobileUtils.triggerHaptic('light');
        actionBtn.disabled = true;
        actionBtn.textContent = 'Splitting...';

        try {
          const rangeStr = rangeInput ? rangeInput.value : '';
          splitResult = await MobilePdfEngine.splitPdf(currentFile, 'ranges', rangeStr);
          resultBox.classList.remove('hidden');
          MobileUtils.triggerHaptic('success');
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

    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        if (splitResult && splitResult.blob) {
          MobileUtils.shareBlob(splitResult.blob, splitResult.filename, 'Split PDF');
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
    const shareBtn = document.getElementById('share-pdf-page-extractor');

    let currentFile = null;
    let selectedIndices = new Set();
    let extractedResult = null;

    bindFileTrigger(box, input);

    if (input) {
      input.addEventListener('change', async () => {
        if (input.files && input.files[0]) {
          MobileUtils.triggerHaptic('light');
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
                  MobileUtils.triggerHaptic('light');
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
        MobileUtils.triggerHaptic('light');
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
        MobileUtils.triggerHaptic('light');
        actionBtn.disabled = true;
        actionBtn.textContent = 'Extracting...';

        try {
          const sortedIndices = Array.from(selectedIndices).sort((a, b) => a - b);
          extractedResult = await MobilePdfEngine.extractPages(currentFile, sortedIndices);
          resultBox.classList.remove('hidden');
          MobileUtils.triggerHaptic('success');
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

    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        if (extractedResult && extractedResult.blob) {
          MobileUtils.shareBlob(extractedResult.blob, extractedResult.filename, 'Extracted PDF Pages');
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
    const shareBtn = document.getElementById('share-zip-creator');

    let fileItems = [];
    let generatedZip = null;

    bindFileTrigger(addFilesBtn, input);
    bindFileTrigger(addFolderBtn, folderInput);

    function renderList() {
      if (!listEl) return;
      if (fileItems.length === 0) {
        listEl.innerHTML = '<div class="mobile-empty-hint" style="color: var(--text-muted); font-size: 0.84rem; text-align: center; padding: 20px 0;">Add files or a folder to package into a ZIP.</div>';
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
          MobileUtils.triggerHaptic('light');
          const idx = parseInt(b.dataset.idx, 10);
          fileItems.splice(idx, 1);
          renderList();
        });
      });
    }

    if (input) {
      input.addEventListener('change', () => {
        if (input.files && input.files.length > 0) {
          MobileUtils.triggerHaptic('light');
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
          MobileUtils.triggerHaptic('light');
          Array.from(folderInput.files).forEach(f => {
            fileItems.push({ file: f, path: f.webkitRelativePath || f.name });
          });
          renderList();
          folderInput.value = '';
        }
      });
    }

    if (actionBtn) {
      actionBtn.addEventListener('click', async () => {
        if (fileItems.length === 0) return;
        MobileUtils.triggerHaptic('light');
        actionBtn.disabled = true;
        actionBtn.textContent = 'Creating ZIP...';

        try {
          const zipName = (zipNameInput && zipNameInput.value.trim()) || 'archive.zip';
          generatedZip = await MobileZipEngine.createZip(fileItems, zipName);
          resultBox.classList.remove('hidden');
          MobileUtils.triggerHaptic('success');
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

    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        if (generatedZip && generatedZip.blob) {
          MobileUtils.shareBlob(generatedZip.blob, generatedZip.filename, 'Created ZIP Archive');
        }
      });
    }
  }

  // --- 14. ZIP File Extractor Controller ---
  function initZipExtractor() {
    const input = document.getElementById('input-zip-extractor');
    const box = document.getElementById('upload-zip-extractor');
    const changeBtn = document.getElementById('change-zip-extractor');
    const selectedSec = document.getElementById('selected-zip-extractor');
    const fileNameEl = document.getElementById('name-zip-extractor');
    const entriesList = document.getElementById('list-zip-extractor');

    let currentZipData = null;

    bindFileTrigger(box, input);
    bindFileTrigger(changeBtn, input);

    if (input) {
      input.addEventListener('change', async () => {
        if (input.files && input.files[0]) {
          MobileUtils.triggerHaptic('light');
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
                MobileUtils.triggerHaptic('light');
                const idx = parseInt(b.dataset.idx, 10);
                const entryObj = currentZipData.entries[idx];
                if (entryObj && !entryObj.isDir) {
                  const fileRes = await MobileZipEngine.extractSingleFile(entryObj.entry);
                  if (fileRes) MobileUtils.downloadBlob(fileRes.blob, fileRes.filename);
                }
              });
            });

            MobileUtils.triggerHaptic('success');
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
    const triggerBtn = document.getElementById('btn-trigger-download-all-zip');
    const listEl = document.getElementById('list-download-all-zip');
    const zipNameInput = document.getElementById('name-download-all-zip');
    const actionBtn = document.getElementById('btn-download-all-zip');
    const resultBox = document.getElementById('result-download-all-zip');
    const downloadBtn = document.getElementById('dl-download-all-zip');
    const shareBtn = document.getElementById('share-download-all-zip');

    let filesList = [];
    let packagedZip = null;

    bindFileTrigger(triggerBtn, input);

    function renderList() {
      if (!listEl) return;
      if (filesList.length === 0) {
        listEl.innerHTML = '<div class="mobile-empty-hint" style="color: var(--text-muted); font-size: 0.84rem; text-align: center; padding: 20px 0;">Select any files you wish to compress into one ZIP download.</div>';
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
          MobileUtils.triggerHaptic('light');
          const idx = parseInt(b.dataset.idx, 10);
          filesList.splice(idx, 1);
          renderList();
        });
      });
    }

    if (input) {
      input.addEventListener('change', () => {
        if (input.files && input.files.length > 0) {
          MobileUtils.triggerHaptic('light');
          Array.from(input.files).forEach(f => filesList.push(f));
          renderList();
          input.value = '';
        }
      });
    }

    if (actionBtn) {
      actionBtn.addEventListener('click', async () => {
        if (filesList.length === 0) return;
        MobileUtils.triggerHaptic('light');
        actionBtn.disabled = true;
        actionBtn.textContent = 'Packaging ZIP...';

        try {
          const zipName = (zipNameInput && zipNameInput.value.trim()) || 'bundle.zip';
          packagedZip = await MobileZipEngine.createZip(filesList, zipName);
          resultBox.classList.remove('hidden');
          MobileUtils.triggerHaptic('success');
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

    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        if (packagedZip && packagedZip.blob) {
          MobileUtils.shareBlob(packagedZip.blob, packagedZip.filename, 'Packaged ZIP Archive');
        }
      });
    }
  }

  // Handle native Android back event called from Android MainActivity
  function handleAndroidBack() {
    // Priority 1: Close open modal / dialog overlays
    const openModals = document.querySelectorAll('.mobile-modal-overlay:not(.hidden)');
    if (openModals.length > 0) {
      openModals.forEach(m => m.classList.add('hidden'));
      return true;
    }

    // Priority 1b: Close exit modal if open
    if (isExitModalOpen()) {
      hideExitModal();
      return true;
    }

    // Priority 2: Close open advanced editor / crop panel
    const cropPanel = document.getElementById('panel-i2p-crop');
    if (cropPanel && !cropPanel.classList.contains('hidden')) {
      cropPanel.classList.add('hidden');
      return true;
    }

    const hash = (window.location.hash || '').replace('#', '').trim();

    // Priority 3: Result screen -> Tool screen (if in a tool and a result box is visible)
    if (hash && hash !== 'home' && hash !== 'settings' && !['about', 'privacy', 'terms'].includes(hash)) {
      const activeToolView = document.getElementById(`tool-view-${hash}`);
      if (activeToolView) {
        const visibleResult = activeToolView.querySelector('.mobile-result-box:not(.hidden)');
        if (visibleResult) {
          visibleResult.classList.add('hidden');
          return true;
        }
      }
    }

    // Priority 5: Settings / About / Privacy / Terms -> previous screen
    if (['about', 'privacy', 'terms'].includes(hash)) {
      window.location.hash = '#settings';
      return true;
    }

    if (hash === 'settings') {
      window.location.hash = '';
      return true;
    }

    // Priority 4: Tool screen -> Home
    if (hash && hash !== 'home') {
      window.location.hash = '';
      return true;
    }

    // Priority 6: Home -> Exit FileForge according to Confirm Before Exit
    if (!hash || hash === 'home') {
      const confirmExit = localStorage.getItem('fileforge_mobile_confirm_exit') !== 'false';
      if (confirmExit) {
        showExitModal();
        return true;
      }
      return false;
    }

    return false;
  }

  return {
    init,
    showHomeView,
    showToolView,
    showSettingsView,
    resetState,
    handleAndroidBack
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = './vendor/pdf.worker.min.js';
  }
  MobileApp.init();
});
