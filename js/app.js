/**
 * FileForge - Main Application Controller
 * Handles routing, tool activation, search, filtering, dark/light theme, and universal dropzone.
 */

const App = (() => {
  // Tool metadata mapping
  const TOOLS_DATA = [
    {
      id: 'pdf-compressor',
      name: 'PDF Compressor',
      category: ['pdf', 'compress'],
      desc: 'Reduce PDF file size while preserving document quality. Choose Low, Medium or High compression.',
      icon: 'compress-pdf',
      badge: 'Popular',
      accepts: ['.pdf', 'application/pdf']
    },
    {
      id: 'image-compressor',
      name: 'Image Compressor',
      category: ['image', 'compress'],
      desc: 'Compress JPG, PNG, and WebP images with custom quality slider, aspect ratio lock & live preview.',
      icon: 'compress-img',
      badge: 'Real-time',
      accepts: ['image/*']
    },
    {
      id: 'pdf-to-jpg',
      name: 'PDF to JPG',
      category: ['pdf', 'convert'],
      desc: 'Render PDF pages into high-resolution JPG images. Download single pages or all in a ZIP archive.',
      icon: 'pdf-to-img',
      badge: 'High DPI',
      accepts: ['.pdf', 'application/pdf']
    },
    {
      id: 'pdf-to-png',
      name: 'PDF to PNG',
      category: ['pdf', 'convert'],
      desc: 'Convert PDF pages into crystal clear, lossless PNG images with selective page extraction.',
      icon: 'pdf-to-img',
      badge: 'Lossless',
      accepts: ['.pdf', 'application/pdf']
    },
    {
      id: 'jpg-to-png',
      name: 'JPG to PNG',
      category: ['image', 'convert'],
      desc: 'Transform JPEG photos into crisp PNG files with high visual fidelity and zero quality degradation.',
      icon: 'convert-img',
      badge: null,
      accepts: ['image/jpeg', '.jpg', '.jpeg']
    },
    {
      id: 'png-to-jpg',
      name: 'PNG to JPG',
      category: ['image', 'convert'],
      desc: 'Convert PNG images to compact JPGs with custom background color picker for transparent areas.',
      icon: 'convert-img',
      badge: null,
      accepts: ['image/png', '.png']
    },
    {
      id: 'jpg-to-pdf',
      name: 'JPG to PDF',
      category: ['image', 'pdf', 'convert'],
      desc: 'Combine multiple JPG photos into a single PDF. Reorder pages, set A4/Letter size & margins.',
      icon: 'img-to-pdf',
      badge: 'Multi-Page',
      accepts: ['image/jpeg', '.jpg', '.jpeg']
    },
    {
      id: 'png-to-pdf',
      name: 'PNG to PDF',
      category: ['image', 'pdf', 'convert'],
      desc: 'Convert PNG graphics and transparent artwork into a clean PDF document with custom margins.',
      icon: 'img-to-pdf',
      badge: null,
      accepts: ['image/png', '.png']
    },
    {
      id: 'image-resizer',
      name: 'Image Resizer',
      category: ['image', 'edit'],
      desc: 'Resize images by exact pixel dimensions or percentages with aspect ratio lock and batch output.',
      icon: 'resize-img',
      badge: 'Batch',
      accepts: ['image/*']
    },
    {
      id: 'image-converter',
      name: 'Image Converter',
      category: ['image', 'convert'],
      desc: 'Universal image converter for JPG, PNG, WebP, GIF and BMP formats with instant ZIP download.',
      icon: 'convert-img',
      badge: 'Universal',
      accepts: ['image/*']
    },
    {
      id: 'pdf-extractor',
      name: 'PDF Page Extractor',
      category: ['pdf', 'edit'],
      desc: 'Visual thumbnail viewer to select and extract specific pages into an entirely new PDF file.',
      icon: 'extract-pdf',
      badge: 'Visual',
      accepts: ['.pdf', 'application/pdf']
    },
    {
      id: 'pdf-merger',
      name: 'PDF Merger',
      category: ['pdf', 'edit'],
      desc: 'Merge multiple PDF documents into one single file. Drag and drop to arrange page order.',
      icon: 'merge-pdf',
      badge: 'Fast',
      accepts: ['.pdf', 'application/pdf']
    },
    {
      id: 'pdf-splitter',
      name: 'PDF Splitter',
      category: ['pdf', 'edit'],
      desc: 'Split PDFs by custom page ranges (e.g. 1-3, 5) or split into individual single-page files.',
      icon: 'split-pdf',
      badge: 'Ranges',
      accepts: ['.pdf', 'application/pdf']
    },
    {
      id: 'pdf-rotate',
      name: 'PDF Rotate',
      category: ['pdf', 'edit'],
      desc: 'Rotate specific PDF pages or all pages 90°, 180° or 270° with live thumbnail preview.',
      icon: 'rotate-pdf',
      badge: 'Visual',
      accepts: ['.pdf', 'application/pdf']
    },
    {
      id: 'pdf-delete-pages',
      name: 'PDF Delete Pages',
      category: ['pdf', 'edit'],
      desc: 'Click to select and delete unwanted pages from PDF documents with instant preview.',
      icon: 'delete-pdf',
      badge: 'Organize',
      accepts: ['.pdf', 'application/pdf']
    },
    {
      id: 'pdf-reorder-pages',
      name: 'PDF Reorder Pages',
      category: ['pdf', 'edit'],
      desc: 'Drag and drop page thumbnails to rearrange and sort PDF pages effortlessly.',
      icon: 'reorder-pdf',
      badge: 'Drag & Drop',
      accepts: ['.pdf', 'application/pdf']
    },
    {
      id: 'pdf-watermark',
      name: 'PDF Watermark',
      category: ['pdf', 'edit'],
      desc: 'Add custom text or image logo watermarks to PDF pages with opacity and angle controls.',
      icon: 'watermark-pdf',
      badge: 'Custom',
      accepts: ['.pdf', 'application/pdf']
    },
    {
      id: 'pdf-page-number',
      name: 'PDF Page Number',
      category: ['pdf', 'edit'],
      desc: 'Add clean page numbers and headers/footers with custom formats and positioning.',
      icon: 'number-pdf',
      badge: 'Format',
      accepts: ['.pdf', 'application/pdf']
    },
    {
      id: 'pdf-protect',
      name: 'PDF Protect',
      category: ['pdf', 'security'],
      desc: 'Encrypt PDF files with strong password protection and optional permission restrictions.',
      icon: 'protect-pdf',
      badge: '128-bit',
      accepts: ['.pdf', 'application/pdf']
    },
    {
      id: 'pdf-metadata-editor',
      name: 'PDF Metadata Editor',
      category: ['pdf', 'edit', 'security'],
      desc: 'View, edit, or strip PDF document title, author, subject, and keyword metadata.',
      icon: 'metadata-pdf',
      badge: 'Privacy',
      accepts: ['.pdf', 'application/pdf']
    },
    {
      id: 'pdf-to-text',
      name: 'PDF to Text',
      category: ['pdf', 'convert'],
      desc: 'Extract clean selectable text from PDF documents with instant copy & .txt download.',
      icon: 'text-pdf',
      badge: 'Extract',
      accepts: ['.pdf', 'application/pdf']
    },
    {
      id: 'pdf-crop',
      name: 'PDF Crop',
      category: ['pdf', 'edit'],
      desc: 'Trim margins or custom crop PDF pages with visual bounding box preview.',
      icon: 'crop-pdf',
      badge: 'Lossless',
      accepts: ['.pdf', 'application/pdf']
    },
    {
      id: 'pdf-grayscale',
      name: 'PDF Grayscale',
      category: ['pdf', 'convert', 'edit'],
      desc: 'Convert color PDF documents into clean, ink-saving monochrome & grayscale files.',
      icon: 'grayscale-pdf',
      badge: 'Ink Saver',
      accepts: ['.pdf', 'application/pdf']
    },
    {
      id: 'image-cropper',
      name: 'Image Cropper',
      category: ['image', 'edit'],
      desc: 'Crop photos with standard aspect ratios (1:1, 16:9, 4:3, 9:16) or custom dimensions.',
      icon: 'crop-img',
      badge: 'Interactive',
      accepts: ['image/*']
    },
    {
      id: 'image-rotate',
      name: 'Image Rotate',
      category: ['image', 'edit'],
      desc: 'Rotate photos 90° CW/CCW, 180°, or fine-tune with custom angle slider.',
      icon: 'rotate-img',
      badge: 'Precise',
      accepts: ['image/*']
    },
    {
      id: 'image-flip',
      name: 'Image Flip',
      category: ['image', 'edit'],
      desc: 'Mirror photos horizontally or flip vertically with instant live preview.',
      icon: 'flip-img',
      badge: 'Mirror',
      accepts: ['image/*']
    },
    {
      id: 'image-watermark',
      name: 'Image Watermark',
      category: ['image', 'edit'],
      desc: 'Stamp text or logo watermarks onto photos with transparency and tile effects.',
      icon: 'watermark-img',
      badge: 'Branding',
      accepts: ['image/*']
    },
    {
      id: 'image-metadata-remover',
      name: 'Image Metadata Remover',
      category: ['image', 'security'],
      desc: 'Strip EXIF, GPS location tags, and device metadata from photos for 100% privacy.',
      icon: 'exif-img',
      badge: '100% Privacy',
      accepts: ['image/*']
    },
    {
      id: 'image-grayscale',
      name: 'Image Grayscale',
      category: ['image', 'edit', 'convert'],
      desc: 'Convert photos to crisp black & white grayscale with adjustable contrast and brightness.',
      icon: 'grayscale-img',
      badge: 'B&W',
      accepts: ['image/*']
    },
    {
      id: 'image-to-base64',
      name: 'Image to Base64',
      category: ['image', 'convert'],
      desc: 'Convert image files to Base64 strings, Data URIs, HTML <img> tags, and CSS background snippets.',
      icon: 'base64-img',
      badge: 'Data URI',
      accepts: ['image/*']
    },
    {
      id: 'base64-to-image',
      name: 'Base64 to Image',
      category: ['image', 'convert'],
      desc: 'Decode Base64 strings or Data URIs back into PNG, JPG, or WebP image files.',
      icon: 'img-base64',
      badge: 'Decoder',
      accepts: ['.txt', 'text/plain']
    },
    {
      id: 'image-color-picker',
      name: 'Image Color Picker',
      category: ['image', 'edit'],
      desc: 'Sample colors from images with a zoom loupe magnifier, HEX/RGB/HSL codes, and custom palette history.',
      icon: 'color-picker-img',
      badge: 'Eyedropper',
      accepts: ['image/*']
    },
    {
      id: 'image-preview-tool',
      name: 'Image Preview Tool',
      category: ['image', 'edit'],
      desc: 'Inspect images with zoom, pan, rotation, aspect ratio analyzer, and dimension details.',
      icon: 'preview-img',
      badge: 'Inspector',
      accepts: ['image/*']
    },
    {
      id: 'webp-to-jpg',
      name: 'WebP to JPG',
      category: ['image', 'convert'],
      desc: 'Convert modern WebP images into universally compatible JPEG photos.',
      icon: 'convert-img',
      badge: null,
      accepts: ['image/webp', '.webp']
    },
    {
      id: 'webp-to-png',
      name: 'WebP to PNG',
      category: ['image', 'convert'],
      desc: 'Convert WebP images into lossless PNG format with transparent alpha preserved.',
      icon: 'convert-img',
      badge: null,
      accepts: ['image/webp', '.webp']
    },
    {
      id: 'jpg-to-webp',
      name: 'JPG to WebP',
      category: ['image', 'convert'],
      desc: 'Convert JPEG photos into lightweight WebP format for fast web page loading.',
      icon: 'convert-img',
      badge: 'Web Ready',
      accepts: ['image/jpeg', '.jpg', '.jpeg']
    },
    {
      id: 'png-to-webp',
      name: 'PNG to WebP',
      category: ['image', 'convert'],
      desc: 'Convert PNG graphics into modern WebP format with preserved transparency and smaller file size.',
      icon: 'convert-img',
      badge: 'Web Ready',
      accepts: ['image/png', '.png']
    },
    {
      id: 'gif-to-jpg',
      name: 'GIF to JPG',
      category: ['image', 'convert'],
      desc: 'Extract still image from GIF into a high-quality JPG image.',
      icon: 'convert-img',
      badge: null,
      accepts: ['image/gif', '.gif']
    },
    {
      id: 'gif-to-png',
      name: 'GIF to PNG',
      category: ['image', 'convert'],
      desc: 'Convert GIF frames into crisp transparent PNG graphics.',
      icon: 'convert-img',
      badge: null,
      accepts: ['image/gif', '.gif']
    },
    {
      id: 'bmp-to-jpg',
      name: 'BMP to JPG',
      category: ['image', 'convert'],
      desc: 'Convert uncompressed bitmap BMP images into compact JPEG photos.',
      icon: 'convert-img',
      badge: null,
      accepts: ['image/bmp', '.bmp']
    },
    {
      id: 'bmp-to-png',
      name: 'BMP to PNG',
      category: ['image', 'convert'],
      desc: 'Convert raw BMP files into lossless and sharp PNG graphics.',
      icon: 'convert-img',
      badge: null,
      accepts: ['image/bmp', '.bmp']
    },
    {
      id: 'svg-to-png',
      name: 'SVG to PNG',
      category: ['image', 'convert'],
      desc: 'Rasterize vector SVG files into crisp high-resolution PNG images.',
      icon: 'convert-img',
      badge: 'Vector',
      accepts: ['image/svg+xml', '.svg']
    },
    {
      id: 'svg-to-jpg',
      name: 'SVG to JPG',
      category: ['image', 'convert'],
      desc: 'Convert vector SVG illustrations into standard JPEG image files.',
      icon: 'convert-img',
      badge: 'Vector',
      accepts: ['image/svg+xml', '.svg']
    },
    {
      id: 'zip-creator',
      name: 'ZIP File Creator',
      category: ['file', 'compress', 'edit'],
      desc: 'Combine multiple files or folders into a single compressed ZIP archive with adjustable compression level.',
      icon: 'zip-creator',
      badge: 'Multi-File',
      accepts: ['*/*']
    },
    {
      id: 'zip-extractor',
      name: 'ZIP File Extractor',
      category: ['file', 'edit'],
      desc: 'Unpack and inspect ZIP archives directly in your browser. Preview files, extract individually or download all.',
      icon: 'zip-extractor',
      badge: 'Unzip',
      accepts: ['.zip', 'application/zip', 'application/x-zip-compressed']
    },
    {
      id: 'file-analyzer',
      name: 'File Size Analyzer',
      category: ['file', 'security'],
      desc: 'Analyze exact file metrics: byte size, MIME type, format details, and generate SHA-256 cryptographic checksums.',
      icon: 'file-analyzer',
      badge: 'SHA-256',
      accepts: ['*/*']
    },
    {
      id: 'file-previewer',
      name: 'Universal File Previewer',
      category: ['file', 'edit'],
      desc: 'Instant multi-format file inspector for PDF pages, images, text documents, source code, and JSON.',
      icon: 'file-previewer',
      badge: 'Multi-Format',
      accepts: ['*/*']
    },
    {
      id: 'file-renamer',
      name: 'Batch File Renamer',
      category: ['file', 'edit'],
      desc: 'Batch rename files with custom prefixes, suffixes, search & replace patterns, numbering, and casing transforms.',
      icon: 'file-renamer',
      badge: 'Batch',
      accepts: ['*/*']
    },
    {
      id: 'batch-processor',
      name: 'Batch File Processor',
      category: ['file', 'convert', 'compress', 'edit'],
      desc: 'Apply actions (image compression, conversion, bulk renaming, ZIP archiving) to multiple files at once.',
      icon: 'batch-processor',
      badge: 'Multi-Action',
      accepts: ['*/*']
    },
    {
      id: 'download-all-zip',
      name: 'Download All as ZIP',
      category: ['file', 'compress'],
      desc: 'Bundle any collection of files into a single instant ZIP package with custom archive naming.',
      icon: 'download-all-zip',
      badge: 'Bundle',
      accepts: ['*/*']
    }
  ];

  let activeToolId = null;
  let activeFilter = 'all';
  let currentPage = 1;
  const ITEMS_PER_PAGE = 8;

  function init() {
    setupTheme();
    setupToolModules();
    setupNavigation();
    setupSearchAndFilters();
    setupUniversalDropzone();
    setupModals();
    handleInitialRoute();

    // Listen to hash changes for browser back/forward buttons
    window.addEventListener('hashchange', handleInitialRoute);

    // Global keyboard shortcuts (Ctrl+K or / to search)
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('tool-search');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      } else if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        const searchInput = document.getElementById('tool-search');
        if (searchInput) searchInput.focus();
      }
    });
  }

  function setupToolModules() {
    if (window.ImageCompressor) ImageCompressor.init();
    if (window.ImageConverter) ImageConverter.init();
    if (window.ImageResizer) ImageResizer.init();
    if (window.PDFCompressor) PDFCompressor.init();
    if (window.PDFToImage) PDFToImage.init();
    if (window.ImageToPDF) ImageToPDF.init();
    if (window.PDFMerger) PDFMerger.init();
    if (window.PDFSplitter) PDFSplitter.init();
    if (window.PDFExtractor) PDFExtractor.init();
    if (window.PDFRotator) PDFRotator.init();
    if (window.PDFDeletePages) PDFDeletePages.init();
    if (window.PDFReorderPages) PDFReorderPages.init();
    if (window.PDFWatermark) PDFWatermark.init();
    if (window.PDFPageNumber) PDFPageNumber.init();
    if (window.PDFProtect) PDFProtect.init();
    if (window.PDFMetadataEditor) PDFMetadataEditor.init();
    if (window.PDFToText) PDFToText.init();
    if (window.PDFCrop) PDFCrop.init();
    if (window.PDFGrayscale) PDFGrayscale.init();
    if (window.ImageCropper) ImageCropper.init();
    if (window.ImageRotator) ImageRotator.init();
    if (window.ImageFlip) ImageFlip.init();
    if (window.ImageWatermark) ImageWatermark.init();
    if (window.ImageMetadataRemover) ImageMetadataRemover.init();
    if (window.ImageGrayscale) ImageGrayscale.init();
    if (window.ImageToBase64) ImageToBase64.init();
    if (window.Base64ToImage) Base64ToImage.init();
    if (window.ImageColorPicker) ImageColorPicker.init();
    if (window.ImagePreviewTool) ImagePreviewTool.init();
    if (window.ZipCreator) ZipCreator.init();
    if (window.ZipExtractor) ZipExtractor.init();
    if (window.FileAnalyzer) FileAnalyzer.init();
    if (window.FilePreviewer) FilePreviewer.init();
    if (window.FileRenamer) FileRenamer.init();
    if (window.BatchProcessor) BatchProcessor.init();
  }

  function setupTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const savedTheme = localStorage.getItem('fileforge_theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    applyTheme(savedTheme);

    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
      });
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('fileforge_theme', theme);
    const sunIcon = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');
    if (sunIcon && moonIcon) {
      if (theme === 'dark') {
        sunIcon.classList.remove('hidden');
        moonIcon.classList.add('hidden');
      } else {
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
      }
    }
  }

  function closeAllDropdowns() {
    if (document.activeElement && document.activeElement.closest('.nav-item-dropdown') && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    document.querySelectorAll('.nav-item-dropdown').forEach(dropdown => {
      dropdown.classList.add('nav-dropdown-closed');
    });
  }

  function closeMobileNav() {
    const mobileNav = document.getElementById('mobile-nav');
    const backdrop = document.getElementById('mobile-nav-backdrop');
    if (mobileNav) mobileNav.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
    document.body.classList.remove('mobile-drawer-active');
  }

  function toggleMobileNav() {
    const mobileNav = document.getElementById('mobile-nav');
    const backdrop = document.getElementById('mobile-nav-backdrop');
    if (mobileNav) {
      const willOpen = !mobileNav.classList.contains('open');
      mobileNav.classList.toggle('open', willOpen);
      if (backdrop) backdrop.classList.toggle('open', willOpen);
      document.body.classList.toggle('mobile-drawer-active', willOpen);
    }
  }

  function setupNavigation() {
    // Re-enable dropdown display whenever mouse enters or leaves dropdown container
    document.querySelectorAll('.nav-item-dropdown').forEach(dropdown => {
      dropdown.addEventListener('mouseleave', () => {
        dropdown.classList.remove('nav-dropdown-closed');
      });
      dropdown.addEventListener('mouseenter', () => {
        dropdown.classList.remove('nav-dropdown-closed');
      });
    });

    // Close desktop dropdowns & mobile nav on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.nav-item-dropdown')) {
        closeAllDropdowns();
      }
      if (!e.target.closest('#mobile-nav') && !e.target.closest('#mobile-menu-toggle')) {
        closeMobileNav();
      }
    });

    // Close on Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeAllDropdowns();
        closeMobileNav();
      }
    });

    // Nav Links with category filters or home
    document.querySelectorAll('[data-nav-filter]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const filter = link.getAttribute('data-nav-filter');
        closeAllDropdowns();
        closeMobileNav();
        showHomeView();
        setFilter(filter);
      });
    });

    // Logo & Home links
    document.querySelectorAll('.nav-home-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        closeAllDropdowns();
        closeMobileNav();
        showHomeView();
      });
    });

    // Back to Tools button in active tool workspace
    document.querySelectorAll('.back-to-tools-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        closeAllDropdowns();
        closeMobileNav();
        showHomeView();
      });
    });

    // Mobile nav toggle & controls
    const mobileMenuBtn = document.getElementById('mobile-menu-toggle');
    const mobileCloseBtn = document.getElementById('mobile-nav-close');
    const mobileBackdrop = document.getElementById('mobile-nav-backdrop');
    const mobileNav = document.getElementById('mobile-nav');

    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleMobileNav();
      });
    }

    if (mobileCloseBtn) {
      mobileCloseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeMobileNav();
      });
    }

    if (mobileBackdrop) {
      mobileBackdrop.addEventListener('click', () => {
        closeMobileNav();
      });
    }

    if (mobileNav) {
      // Close mobile nav when any link inside it is clicked
      mobileNav.querySelectorAll('a, button:not(#mobile-nav-close)').forEach(item => {
        item.addEventListener('click', () => {
          closeMobileNav();
        });
      });
    }
  }

  function setupSearchAndFilters() {
    const searchInput = document.getElementById('tool-search');
    const filterPills = document.querySelectorAll('.filter-pill');
    const prevBtn = document.getElementById('pagination-prev');
    const nextBtn = document.getElementById('pagination-next');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        currentPage = 1;
        const query = e.target.value.toLowerCase().trim();
        filterTools(query, activeFilter, currentPage);
      });
    }

    filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        filterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        activeFilter = pill.dataset.filter;
        currentPage = 1;
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        filterTools(query, activeFilter, currentPage);
      });
    });

    // Tool card clicks
    document.querySelectorAll('.tool-card').forEach(card => {
      card.addEventListener('click', () => {
        const toolId = card.dataset.tool;
        closeAllDropdowns();
        openTool(toolId);
      });
    });

    // Navbar Dropdown item clicks
    document.querySelectorAll('.dropdown-item[data-tool]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const toolId = item.dataset.tool;
        closeAllDropdowns();
        openTool(toolId);
      });
    });

    // Footer "View all ... tools" links
    document.querySelectorAll('.footer-view-all').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const filter = link.getAttribute('data-nav-filter');
        closeAllDropdowns();
        showHomeView();
        setFilter(filter);
      });
    });

    // Pagination buttons
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
          filterTools(query, activeFilter, currentPage);
          scrollToToolsGrid();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const matchingCards = getMatchingCards(query, activeFilter);
        const totalPages = Math.ceil(matchingCards.length / ITEMS_PER_PAGE) || 1;
        if (currentPage < totalPages) {
          currentPage++;
          filterTools(query, activeFilter, currentPage);
          scrollToToolsGrid();
        }
      });
    }

    // Initial tool list rendering with pagination
    filterTools('', activeFilter, 1);
  }

  function scrollToToolsGrid() {
    const toolsSection = document.getElementById('tools-grid-section');
    if (toolsSection) {
      toolsSection.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function getMatchingCards(query, category) {
    const cards = Array.from(document.querySelectorAll('.tool-card'));
    return cards.filter(card => {
      const toolId = card.dataset.tool;
      const tool = TOOLS_DATA.find(t => t.id === toolId);
      if (!tool) return false;

      const matchesCategory = category === 'all' || tool.category.includes(category);
      const matchesQuery = !query ||
        tool.name.toLowerCase().includes(query) ||
        tool.desc.toLowerCase().includes(query) ||
        tool.category.some(c => c.toLowerCase().includes(query));

      return matchesCategory && matchesQuery;
    });
  }

  function setFilter(filter) {
    activeFilter = filter;
    currentPage = 1;
    const filterPills = document.querySelectorAll('.filter-pill');
    filterPills.forEach(pill => {
      pill.classList.toggle('active', pill.dataset.filter === filter);
    });

    const searchInput = document.getElementById('tool-search');
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    filterTools(query, filter, 1);
    scrollToToolsGrid();
  }

  function filterTools(query, category, page = 1) {
    currentPage = page;
    const allCards = Array.from(document.querySelectorAll('.tool-card'));
    const matchingCards = getMatchingCards(query, category);
    const totalCount = matchingCards.length;
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE) || 1;

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIdx = Math.min(startIdx + ITEMS_PER_PAGE, totalCount);
    const visibleSet = new Set(matchingCards.slice(startIdx, endIdx));

    allCards.forEach(card => {
      if (visibleSet.has(card)) {
        card.classList.remove('hidden');
      } else {
        card.classList.add('hidden');
      }
    });

    const noResults = document.getElementById('no-tools-found');
    if (noResults) {
      noResults.classList.toggle('hidden', totalCount > 0);
    }

    renderPagination(totalCount, totalPages, startIdx, endIdx);
  }

  function renderPagination(totalCount, totalPages, startIdx, endIdx) {
    const paginationWrap = document.getElementById('tools-pagination');
    const paginationInfo = document.getElementById('pagination-info');
    const numbersContainer = document.getElementById('pagination-numbers');
    const prevBtn = document.getElementById('pagination-prev');
    const nextBtn = document.getElementById('pagination-next');

    if (!paginationWrap) return;

    if (totalCount === 0) {
      paginationWrap.classList.add('hidden');
      return;
    }

    paginationWrap.classList.remove('hidden');

    if (paginationInfo) {
      paginationInfo.textContent = `Showing ${startIdx + 1}–${endIdx} of ${totalCount} tools`;
    }

    if (prevBtn) prevBtn.disabled = (currentPage <= 1);
    if (nextBtn) nextBtn.disabled = (currentPage >= totalPages);

    if (numbersContainer) {
      numbersContainer.innerHTML = '';
      for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `page-num-btn ${i === currentPage ? 'active' : ''}`;
        btn.textContent = i;
        btn.setAttribute('aria-label', `Page ${i}`);
        btn.addEventListener('click', () => {
          const searchInput = document.getElementById('tool-search');
          const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
          filterTools(query, activeFilter, i);
          scrollToToolsGrid();
        });
        numbersContainer.appendChild(btn);
      }
    }
  }

  function setupUniversalDropzone() {
    const heroDropzone = document.getElementById('hero-universal-dropzone');
    const heroFileInput = document.getElementById('hero-file-input');
    const heroBrowseBtn = document.getElementById('hero-browse-btn');

    if (heroBrowseBtn && heroFileInput) {
      heroBrowseBtn.addEventListener('click', () => heroFileInput.click());
      heroFileInput.addEventListener('change', (e) => {
        handleUniversalFiles(Array.from(e.target.files));
        heroFileInput.value = '';
      });
    }

    if (heroDropzone) {
      Utils.setupDropZone(heroDropzone, handleUniversalFiles);
    }
  }

  function handleUniversalFiles(files) {
    if (!files || files.length === 0) return;
    const file = files[0];
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(file.name);

    if (isPdf) {
      // Offer Quick Action Dialog or route to PDF Compressor by default with file
      showQuickToolModal(files, 'pdf');
    } else if (isImage) {
      showQuickToolModal(files, 'image');
    } else {
      Utils.showToast('Please drop a valid PDF or Image file.', 'warning');
    }
  }

  function showQuickToolModal(files, type) {
    const modal = document.getElementById('universal-modal');
    const title = document.getElementById('universal-modal-title');
    const optionsList = document.getElementById('universal-modal-options');

    if (!modal) {
      // Fallback: direct route
      if (type === 'pdf') openTool('pdf-compressor', files);
      else openTool('image-compressor', files);
      return;
    }

    title.textContent = `Choose a tool for "${files[0].name}" (${files.length} file${files.length > 1 ? 's' : ''}):`;
    optionsList.innerHTML = '';

    const suggestions = type === 'pdf'
      ? [
          { id: 'pdf-compressor', name: 'Compress PDF', desc: 'Reduce PDF file size' },
          { id: 'pdf-to-jpg', name: 'Convert to JPG', desc: 'Extract pages as JPG images' },
          { id: 'pdf-to-png', name: 'Convert to PNG', desc: 'Extract pages as PNG images' },
          { id: 'pdf-extractor', name: 'Extract Pages', desc: 'Select specific pages to extract' },
          { id: 'pdf-merger', name: 'Merge PDF', desc: 'Combine with other PDFs' },
          { id: 'pdf-splitter', name: 'Split PDF', desc: 'Divide PDF by page ranges' }
        ]
      : [
          { id: 'image-compressor', name: 'Compress Image', desc: 'Reduce image file size with live preview' },
          { id: 'image-resizer', name: 'Resize Image', desc: 'Scale by dimensions or percentage' },
          { id: 'image-converter', name: 'Convert Format', desc: 'Convert between JPG, PNG, WebP' },
          { id: 'jpg-to-pdf', name: 'Convert to PDF', desc: 'Compile image into a PDF document' }
        ];

    suggestions.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'quick-tool-option';
      btn.innerHTML = `
        <strong>${item.name}</strong>
        <span>${item.desc}</span>
      `;
      btn.addEventListener('click', () => {
        closeModal('universal-modal');
        openTool(item.id, files);
      });
      optionsList.appendChild(btn);
    });

    openModal('universal-modal');
  }

  function setupModals() {
    // Universal close button for modals (top-right cross, footer close button, backdrop)
    document.querySelectorAll('.modal-close-btn, .modal-close-btn-text, .modal-backdrop').forEach(el => {
      el.addEventListener('click', () => {
        const modal = el.closest('.modal-container');
        if (modal) closeModal(modal);
      });
    });

    // Close on Escape key press
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-container:not(.hidden)').forEach(modal => {
          closeModal(modal);
        });
      }
    });

    // Privacy modal trigger
    document.querySelectorAll('.open-privacy-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        openModal('privacy-modal');
      });
    });

    // Terms modal trigger
    document.querySelectorAll('.open-terms-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        openModal('terms-modal');
      });
    });

    // About modal trigger
    document.querySelectorAll('.open-about-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        openModal('about-modal');
      });
    });

    // Contact modal trigger
    document.querySelectorAll('.open-contact-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        openModal('contact-modal');
      });
    });
  }

  function openModal(id) {
    // Ensure all modals are closed and their scroll positions reset to top
    document.querySelectorAll('.modal-container').forEach(m => {
      m.classList.add('hidden');
      const c = m.querySelector('.modal-card');
      if (c) {
        c.scrollTop = 0;
        c.scrollTo(0, 0);
      }
      m.scrollTop = 0;
    });

    const modal = typeof id === 'string' ? document.getElementById(id) : id;
    if (modal) {
      modal.classList.remove('hidden');
      const card = modal.querySelector('.modal-card');
      if (card) {
        card.scrollTop = 0;
        card.scrollTo(0, 0);
        // Secondary reset on next tick to override browser layout memory
        requestAnimationFrame(() => {
          card.scrollTop = 0;
          card.scrollTo(0, 0);
        });
      }
      modal.scrollTop = 0;
    }
  }

  function closeModal(id) {
    const modal = typeof id === 'string' ? document.getElementById(id) : id;
    if (modal) {
      modal.classList.add('hidden');
      const card = modal.querySelector('.modal-card');
      if (card) {
        card.scrollTop = 0;
      }
      modal.scrollTop = 0;
    }
  }

  function handleInitialRoute() {
    const hash = window.location.hash.replace('#', '');
    if (hash && TOOLS_DATA.some(t => t.id === hash)) {
      openTool(hash);
    } else {
      showHomeView(false);
    }
  }

  function showHomeView(updateHash = true) {
    activeToolId = null;
    if (updateHash) history.pushState(null, '', window.location.pathname);

    // Show homepage sections
    document.getElementById('hero-section').classList.remove('hidden');
    document.getElementById('tools-grid-section').classList.remove('hidden');
    document.getElementById('features-section').classList.remove('hidden');
    document.getElementById('security-section').classList.remove('hidden');

    // Hide tool workspace
    document.getElementById('active-tool-view').classList.add('hidden');

    // Hide all individual tool containers
    document.querySelectorAll('.tool-workspace-container').forEach(c => c.classList.add('hidden'));

    // Refresh pagination view
    const searchInput = document.getElementById('tool-search');
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    filterTools(query, activeFilter, currentPage);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openTool(toolId, preloadedFiles = null) {
    activeToolId = toolId;
    window.location.hash = toolId;

    // Find tool definition
    const tool = TOOLS_DATA.find(t => t.id === toolId);
    if (!tool) return;

    // Hide home sections
    document.getElementById('hero-section').classList.add('hidden');
    document.getElementById('tools-grid-section').classList.add('hidden');
    document.getElementById('features-section').classList.add('hidden');
    document.getElementById('security-section').classList.add('hidden');

    // Show tool workspace container
    const activeView = document.getElementById('active-tool-view');
    activeView.classList.remove('hidden');

    // Update active tool title and description
    document.getElementById('active-tool-title').textContent = tool.name;
    document.getElementById('active-tool-desc').textContent = tool.desc;

    // Hide all tool sub-containers and show current one
    document.querySelectorAll('.tool-workspace-container').forEach(c => c.classList.add('hidden'));

    // Map toolId to corresponding DOM container and module
    let targetContainerId = `tool-${toolId}`;
    let handlerModule = null;

    if (toolId === 'pdf-compressor') {
      handlerModule = window.PDFCompressor;
    } else if (toolId === 'image-compressor') {
      handlerModule = window.ImageCompressor;
    } else if (toolId === 'pdf-to-jpg') {
      targetContainerId = 'tool-pdf-to-image';
      handlerModule = window.PDFToImage;
      if (handlerModule) handlerModule.setPreset('jpeg');
    } else if (toolId === 'pdf-to-png') {
      targetContainerId = 'tool-pdf-to-image';
      handlerModule = window.PDFToImage;
      if (handlerModule) handlerModule.setPreset('png');
    } else if (toolId === 'jpg-to-png') {
      targetContainerId = 'tool-image-converter';
      handlerModule = window.ImageConverter;
      if (handlerModule) handlerModule.setPreset('jpg-to-png');
    } else if (toolId === 'png-to-jpg') {
      targetContainerId = 'tool-image-converter';
      handlerModule = window.ImageConverter;
      if (handlerModule) handlerModule.setPreset('png-to-jpg');
    } else if (toolId === 'jpg-to-pdf') {
      targetContainerId = 'tool-image-to-pdf';
      handlerModule = window.ImageToPDF;
      if (handlerModule && typeof handlerModule.setPreset === 'function') handlerModule.setPreset('jpg-to-pdf');
    } else if (toolId === 'png-to-pdf') {
      targetContainerId = 'tool-image-to-pdf';
      handlerModule = window.ImageToPDF;
      if (handlerModule && typeof handlerModule.setPreset === 'function') handlerModule.setPreset('png-to-pdf');
    } else if (toolId === 'image-resizer') {
      handlerModule = window.ImageResizer;
    } else if (toolId === 'image-converter') {
      handlerModule = window.ImageConverter;
      if (handlerModule) handlerModule.setPreset('general');
    } else if (toolId === 'pdf-extractor') {
      handlerModule = window.PDFExtractor;
    } else if (toolId === 'pdf-merger') {
      handlerModule = window.PDFMerger;
    } else if (toolId === 'pdf-splitter') {
      handlerModule = window.PDFSplitter;
    } else if (toolId === 'pdf-rotate') {
      handlerModule = window.PDFRotator;
    } else if (toolId === 'pdf-delete-pages') {
      handlerModule = window.PDFDeletePages;
    } else if (toolId === 'pdf-reorder-pages') {
      handlerModule = window.PDFReorderPages;
    } else if (toolId === 'pdf-watermark') {
      handlerModule = window.PDFWatermark;
    } else if (toolId === 'pdf-page-number') {
      handlerModule = window.PDFPageNumber;
    } else if (toolId === 'pdf-protect') {
      handlerModule = window.PDFProtect;
    } else if (toolId === 'pdf-metadata-editor') {
      handlerModule = window.PDFMetadataEditor;
    } else if (toolId === 'pdf-to-text') {
      handlerModule = window.PDFToText;
    } else if (toolId === 'pdf-crop') {
      handlerModule = window.PDFCrop;
    } else if (toolId === 'pdf-grayscale') {
      handlerModule = window.PDFGrayscale;
    } else if (toolId === 'image-cropper') {
      handlerModule = window.ImageCropper;
    } else if (toolId === 'image-rotate') {
      handlerModule = window.ImageRotator;
    } else if (toolId === 'image-flip') {
      handlerModule = window.ImageFlip;
    } else if (toolId === 'image-watermark') {
      handlerModule = window.ImageWatermark;
    } else if (toolId === 'image-metadata-remover') {
      handlerModule = window.ImageMetadataRemover;
    } else if (toolId === 'image-grayscale') {
      handlerModule = window.ImageGrayscale;
    } else if (toolId === 'image-to-base64') {
      handlerModule = window.ImageToBase64;
    } else if (toolId === 'base64-to-image') {
      handlerModule = window.Base64ToImage;
    } else if (toolId === 'image-color-picker') {
      handlerModule = window.ImageColorPicker;
    } else if (toolId === 'image-preview-tool') {
      handlerModule = window.ImagePreviewTool;
    } else if (['webp-to-jpg', 'webp-to-png', 'jpg-to-webp', 'png-to-webp', 'gif-to-jpg', 'gif-to-png', 'bmp-to-jpg', 'bmp-to-png', 'svg-to-png', 'svg-to-jpg'].includes(toolId)) {
      targetContainerId = 'tool-image-converter';
      handlerModule = window.ImageConverter;
      if (handlerModule) handlerModule.setPreset(toolId);
    } else if (toolId === 'zip-creator' || toolId === 'download-all-zip') {
      targetContainerId = 'tool-zip-creator';
      handlerModule = window.ZipCreator;
    } else if (toolId === 'zip-extractor') {
      handlerModule = window.ZipExtractor;
    } else if (toolId === 'file-analyzer') {
      handlerModule = window.FileAnalyzer;
    } else if (toolId === 'file-previewer') {
      handlerModule = window.FilePreviewer;
    } else if (toolId === 'file-renamer') {
      handlerModule = window.FileRenamer;
    } else if (toolId === 'batch-processor') {
      handlerModule = window.BatchProcessor;
    }

    const targetEl = document.getElementById(targetContainerId);
    if (targetEl) {
      targetEl.classList.remove('hidden');
    }

    // If files were pre-loaded from universal dropzone, pass them into the module
    if (preloadedFiles && handlerModule && typeof handlerModule.handleFiles === 'function') {
      handlerModule.handleFiles(preloadedFiles);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return {
    init,
    openTool,
    showHomeView,
    setFilter
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  // Initialize PDF.js worker
  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
  App.init();

  // Register Progressive Web App (PWA) Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js', { scope: './' })
        .then((registration) => {
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  if (window.Utils && typeof window.Utils.showToast === 'function') {
                    window.Utils.showToast('FileForge update available! Refresh to load new features.', 'info', 5000);
                  }
                }
              });
            }
          });
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration note:', err);
        });
    });
  }

  // Handle Progressive Web App (PWA) Installation
  let deferredInstallPrompt = null;
  const pwaInstallBtn = document.getElementById('pwa-install-btn');
  const mobilePwaInstallBtn = document.getElementById('mobile-pwa-install-btn');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;

    if (pwaInstallBtn) pwaInstallBtn.classList.remove('hidden');
    if (mobilePwaInstallBtn) mobilePwaInstallBtn.classList.remove('hidden');
  });

  const triggerPwaInstall = async (e) => {
    if (e) e.preventDefault();
    if (!deferredInstallPrompt) {
      if (window.Utils && typeof window.Utils.showToast === 'function') {
        window.Utils.showToast('To install FileForge, use your browser menu (Install app) or address bar icon.', 'info');
      }
      return;
    }

    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      if (window.Utils && typeof window.Utils.showToast === 'function') {
        window.Utils.showToast('Thank you for installing FileForge! 🚀', 'success');
      }
    }
    deferredInstallPrompt = null;
    if (pwaInstallBtn) pwaInstallBtn.classList.add('hidden');
    if (mobilePwaInstallBtn) mobilePwaInstallBtn.classList.add('hidden');
  };

  if (pwaInstallBtn) pwaInstallBtn.addEventListener('click', triggerPwaInstall);
  if (mobilePwaInstallBtn) mobilePwaInstallBtn.addEventListener('click', triggerPwaInstall);

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    if (pwaInstallBtn) pwaInstallBtn.classList.add('hidden');
    if (mobilePwaInstallBtn) mobilePwaInstallBtn.classList.add('hidden');
    if (window.Utils && typeof window.Utils.showToast === 'function') {
      window.Utils.showToast('FileForge successfully installed on your device!', 'success');
    }
  });

  // Handle Offline Status & Offline Popup Modal
  const offlineModal = document.getElementById('offline-modal');
  const offlineContinueBtn = document.getElementById('offline-continue-btn');
  const offlineRetryBtn = document.getElementById('offline-retry-btn');
  let offlineDismissed = false;

  function showOfflineModal() {
    if (offlineModal && !offlineDismissed) {
      offlineModal.classList.remove('hidden');
    }
  }

  function hideOfflineModal() {
    if (offlineModal) {
      offlineModal.classList.add('hidden');
    }
  }

  // Check initial offline status on startup
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    // Show offline popup if the app is opened without an internet connection
    setTimeout(showOfflineModal, 350);
  }

  // Listen to live connectivity changes
  window.addEventListener('offline', () => {
    offlineDismissed = false;
    showOfflineModal();
    if (window.Utils && typeof window.Utils.showToast === 'function') {
      window.Utils.showToast('You are currently offline. On-device tools are ready.', 'warning', 4000);
    }
  });

  window.addEventListener('online', () => {
    hideOfflineModal();
    offlineDismissed = false;
    if (window.Utils && typeof window.Utils.showToast === 'function') {
      window.Utils.showToast('You are back online! 🟢', 'success', 3500);
    }
  });

  if (offlineContinueBtn) {
    offlineContinueBtn.addEventListener('click', () => {
      offlineDismissed = true;
      hideOfflineModal();
      if (window.Utils && typeof window.Utils.showToast === 'function') {
        window.Utils.showToast('Working in offline on-device mode ⚡', 'info', 3000);
      }
    });
  }

  if (offlineRetryBtn) {
    offlineRetryBtn.addEventListener('click', () => {
      if (navigator.onLine) {
        hideOfflineModal();
        offlineDismissed = false;
        if (window.Utils && typeof window.Utils.showToast === 'function') {
          window.Utils.showToast('Connected! You are online 🟢', 'success', 3500);
        }
      } else {
        if (window.Utils && typeof window.Utils.showToast === 'function') {
          window.Utils.showToast('Still offline. FileForge can still process files on-device.', 'warning', 3500);
        }
      }
    });
  }

  if (offlineModal) {
    const backdrop = offlineModal.querySelector('.modal-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', () => {
        offlineDismissed = true;
        hideOfflineModal();
      });
    }
  }
});

