/**
 * FileForge Mobile - PDF Engine
 * Utilizes pdf-lib and PDF.js locally for 100% Client-side Processing
 */
const MobilePdfEngine = (() => {

  /**
   * Compress PDF by re-encoding pages with canvas JPEG streams
   */
  async function compressPdf(file, qualityLevel = 'medium', onProgress = null) {
    if (!window.PDFLib || !window.pdfjsLib) {
      throw new Error('PDF libraries are not loaded');
    }

    // Quality presets: scale and jpeg quality
    const presets = {
      extreme: { scale: 1.0, quality: 0.45 },
      medium:  { scale: 1.25, quality: 0.65 },
      low:     { scale: 1.5, quality: 0.80 }
    };
    const { scale, quality } = presets[qualityLevel] || presets.medium;

    const arrayBuffer = await MobileUtils.readFileAsArrayBuffer(file);
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdfDoc.numPages;

    const newPdfDoc = await PDFLib.PDFDocument.create();

    for (let i = 1; i <= numPages; i++) {
      if (onProgress) onProgress(i, numPages);

      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport }).promise;

      const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
      const jpegBytes = await fetch(jpegDataUrl).then(res => res.arrayBuffer());
      const embeddedImage = await newPdfDoc.embedJpg(jpegBytes);

      // Create page with original dimensions (at 72 DPI)
      const origViewport = page.getViewport({ scale: 1.0 });
      const newPage = newPdfDoc.addPage([origViewport.width, origViewport.height]);
      newPage.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: origViewport.width,
        height: origViewport.height
      });
    }

    const compressedPdfBytes = await newPdfDoc.save();
    const blob = new Blob([compressedPdfBytes], { type: 'application/pdf' });
    const originalSize = file.size;
    const newSize = blob.size;
    const savingsPercent = originalSize > 0
      ? Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100))
      : 0;

    return {
      blob,
      originalSize,
      newSize,
      savingsPercent,
      filename: `${MobileUtils.getBaseName(file.name)}_compressed.pdf`
    };
  }

  /**
   * Merge multiple PDF files into one
   */
  async function mergePdfs(files, onProgress = null) {
    if (!window.PDFLib) throw new Error('PDF-Lib is not loaded');
    if (!files || files.length < 2) throw new Error('Please select at least 2 PDF files');

    const mergedDoc = await PDFLib.PDFDocument.create();

    for (let fIdx = 0; fIdx < files.length; fIdx++) {
      if (onProgress) onProgress(fIdx + 1, files.length);

      const file = files[fIdx];
      const arrayBuffer = await MobileUtils.readFileAsArrayBuffer(file);
      const srcDoc = await PDFLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const copiedPages = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices());

      copiedPages.forEach((page) => mergedDoc.addPage(page));
    }

    const mergedBytes = await mergedDoc.save();
    const blob = new Blob([mergedBytes], { type: 'application/pdf' });

    return {
      blob,
      filename: 'merged_document.pdf',
      size: blob.size,
      pageCount: mergedDoc.getPageCount()
    };
  }

  /**
   * Split PDF by range, specific pages, or burst into all single pages
   */
  async function splitPdf(file, mode = 'ranges', rangeStr = '', onProgress = null) {
    if (!window.PDFLib) throw new Error('PDF-Lib is not loaded');

    const arrayBuffer = await MobileUtils.readFileAsArrayBuffer(file);
    const srcDoc = await PDFLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const totalPages = srcDoc.getPageCount();

    if (mode === 'all') {
      // Split each page into individual PDF files
      const splitFiles = [];
      for (let i = 0; i < totalPages; i++) {
        if (onProgress) onProgress(i + 1, totalPages);

        const singleDoc = await PDFLib.PDFDocument.create();
        const [page] = await singleDoc.copyPages(srcDoc, [i]);
        singleDoc.addPage(page);

        const bytes = await singleDoc.save();
        const blob = new Blob([bytes], { type: 'application/pdf' });
        splitFiles.push({
          blob,
          filename: `${MobileUtils.getBaseName(file.name)}_page_${i + 1}.pdf`,
          pageNumber: i + 1
        });
      }
      return { type: 'multi', files: splitFiles };
    }

    // Parse page ranges (e.g., "1-3, 5, 7-9")
    const selectedIndices = parsePageRanges(rangeStr, totalPages);
    if (selectedIndices.length === 0) {
      throw new Error('Please enter valid page numbers or ranges (e.g. 1-3, 5)');
    }

    const newDoc = await PDFLib.PDFDocument.create();
    const copiedPages = await newDoc.copyPages(srcDoc, selectedIndices);
    copiedPages.forEach(p => newDoc.addPage(p));

    const bytes = await newDoc.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });

    return {
      type: 'single',
      blob,
      filename: `${MobileUtils.getBaseName(file.name)}_split.pdf`,
      size: blob.size,
      pageCount: selectedIndices.length
    };
  }

  /**
   * Extract specified page indices into a new PDF
   */
  async function extractPages(file, pageIndices = []) {
    if (!window.PDFLib) throw new Error('PDF-Lib is not loaded');
    if (!pageIndices || pageIndices.length === 0) {
      throw new Error('No pages selected for extraction');
    }

    const arrayBuffer = await MobileUtils.readFileAsArrayBuffer(file);
    const srcDoc = await PDFLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const totalPages = srcDoc.getPageCount();

    // Filter valid 0-based indices
    const validIndices = pageIndices.filter(idx => idx >= 0 && idx < totalPages);
    if (validIndices.length === 0) {
      throw new Error('Selected pages are out of range');
    }

    const newDoc = await PDFLib.PDFDocument.create();
    const copiedPages = await newDoc.copyPages(srcDoc, validIndices);
    copiedPages.forEach(p => newDoc.addPage(p));

    const bytes = await newDoc.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });

    return {
      blob,
      filename: `${MobileUtils.getBaseName(file.name)}_extracted.pdf`,
      size: blob.size,
      pageCount: validIndices.length
    };
  }

  /**
   * Convert PDF pages to JPG or PNG images
   */
  async function pdfToImages(file, format = 'image/jpeg', scale = 1.5, onProgress = null) {
    if (!window.pdfjsLib) throw new Error('PDF.js library is not loaded');

    const arrayBuffer = await MobileUtils.readFileAsArrayBuffer(file);
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdfDoc.numPages;

    const ext = format === 'image/png' ? 'png' : 'jpg';
    const images = [];

    for (let i = 1; i <= numPages; i++) {
      if (onProgress) onProgress(i, numPages);

      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      if (format === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      await page.render({ canvasContext: ctx, viewport }).promise;

      const blob = await new Promise(resolve => canvas.toBlob(resolve, format, 0.92));
      const previewUrl = URL.createObjectURL(blob);
      MobileUtils.trackUrl(previewUrl);

      images.push({
        pageNumber: i,
        blob,
        previewUrl,
        filename: `${MobileUtils.getBaseName(file.name)}_page_${i}.${ext}`
      });
    }

    return {
      images,
      totalCount: numPages
    };
  }

  /**
   * Helper: Parse page ranges string into array of 0-based page indices
   */
  function parsePageRanges(rangeStr, totalPages) {
    if (!rangeStr || !rangeStr.trim()) {
      return Array.from({ length: totalPages }, (_, i) => i);
    }

    const indices = new Set();
    const parts = rangeStr.split(/[,;\s]+/).map(p => p.trim()).filter(Boolean);

    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        let start = parseInt(startStr, 10);
        let end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          start = Math.max(1, Math.min(start, totalPages));
          end = Math.max(1, Math.min(end, totalPages));
          for (let p = Math.min(start, end); p <= Math.max(start, end); p++) {
            indices.add(p - 1);
          }
        }
      } else {
        const num = parseInt(part, 10);
        if (!isNaN(num) && num >= 1 && num <= totalPages) {
          indices.add(num - 1);
        }
      }
    }

    return Array.from(indices).sort((a, b) => a - b);
  }

  /**
   * Load thumbnail list of PDF pages for visual page selection
   */
  async function loadPdfThumbnails(file, scale = 0.3) {
    if (!window.pdfjsLib) throw new Error('PDF.js library is not loaded');

    const arrayBuffer = await MobileUtils.readFileAsArrayBuffer(file);
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdfDoc.numPages;

    const thumbnails = [];
    for (let i = 1; i <= numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport }).promise;

      thumbnails.push({
        pageNumber: i,
        dataUrl: canvas.toDataURL('image/jpeg', 0.65)
      });
    }

    return thumbnails;
  }

  return {
    compressPdf,
    mergePdfs,
    splitPdf,
    extractPages,
    pdfToImages,
    loadPdfThumbnails,
    parsePageRanges
  };
})();
