/**
 * FileForge Mobile - Image to PDF Engine
 * Supports Multi-Image, Reordering, Individual & Mixed Page Orientations, Custom Margins, Page Sizing & Fit Modes
 */
const MobileImageToPdf = (() => {

  // Standard Page Dimensions in points (72 DPI)
  const PAGE_SIZES = {
    a4: { width: 595.28, height: 841.89 },
    letter: { width: 612.0, height: 792.0 },
    legal: { width: 612.0, height: 1008.0 }
  };

  const MARGINS = {
    none: 0,
    small: 18,   // 0.25 in
    medium: 36,  // 0.5 in
    large: 54    // 0.75 in
  };

  /**
   * Generates a multi-page PDF from a list of image item objects.
   * Each item can have:
   *  - file: File or Blob
   *  - orientation: 'auto' | 'portrait' | 'landscape'
   *  - rotation: 0 | 90 | 180 | 270
   * 
   * Global options:
   *  - pageSize: 'a4' | 'letter' | 'legal' | 'fit'
   *  - globalOrientation: 'auto' | 'portrait' | 'landscape'
   *  - margin: 'none' | 'small' | 'medium' | 'large'
   *  - fitMode: 'contain' | 'cover' | 'original'
   *  - compressionQuality: 0.85
   */
  async function generatePdf(imageItems, options = {}, onProgress = null) {
    if (!window.PDFLib) throw new Error('PDF-Lib is not loaded');
    if (!imageItems || imageItems.length === 0) throw new Error('No images selected');

    const pdfDoc = await PDFLib.PDFDocument.create();
    const pageSizeKey = options.pageSize || 'a4';
    const globalOrientation = options.globalOrientation || 'auto';
    const marginKey = options.margin || 'none';
    const marginPts = MARGINS[marginKey] !== undefined ? MARGINS[marginKey] : 0;
    const fitMode = options.fitMode || 'contain';
    const quality = options.quality || 0.88;

    for (let i = 0; i < imageItems.length; i++) {
      if (onProgress) onProgress(i + 1, imageItems.length);

      const item = imageItems[i];
      const file = item.file || item;

      // 1. Process image on canvas to handle rotation & format conversion
      const processed = await processImageToCanvas(file, item.rotation || 0, quality);
      const imgWidth = processed.width;
      const imgHeight = processed.height;

      // 2. Embed into PDF document as JPEG
      const embeddedImage = await pdfDoc.embedJpg(processed.bytes);

      // 3. Determine Page Dimensions & Orientation for this specific page (Mixed Orientation support)
      let pageW, pageH;
      const itemOrientation = item.orientation || globalOrientation;

      if (pageSizeKey === 'fit') {
        // Fit Page to Image Dimensions exactly (+ margins)
        pageW = imgWidth + marginPts * 2;
        pageH = imgHeight + marginPts * 2;
      } else {
        const baseSize = PAGE_SIZES[pageSizeKey] || PAGE_SIZES.a4;
        let isLandscape = false;

        if (itemOrientation === 'landscape') {
          isLandscape = true;
        } else if (itemOrientation === 'portrait') {
          isLandscape = false;
        } else {
          // 'auto': Match image's natural aspect ratio
          isLandscape = imgWidth > imgHeight;
        }

        if (isLandscape) {
          pageW = Math.max(baseSize.width, baseSize.height);
          pageH = Math.min(baseSize.width, baseSize.height);
        } else {
          pageW = Math.min(baseSize.width, baseSize.height);
          pageH = Math.max(baseSize.width, baseSize.height);
        }
      }

      // 4. Create new Page with exact calculated dimensions
      const page = pdfDoc.addPage([pageW, pageH]);

      // 5. Calculate drawing bounds inside margins
      const availW = Math.max(1, pageW - marginPts * 2);
      const availH = Math.max(1, pageH - marginPts * 2);

      let drawW, drawH, drawX, drawY;

      if (fitMode === 'cover') {
        // Fill available area (cropping excess)
        const scale = Math.max(availW / imgWidth, availH / imgHeight);
        drawW = imgWidth * scale;
        drawH = imgHeight * scale;
      } else if (fitMode === 'original') {
        // 1:1 image points (capped at available area)
        const scale = Math.min(1, Math.min(availW / imgWidth, availH / imgHeight));
        drawW = imgWidth * scale;
        drawH = imgHeight * scale;
      } else {
        // 'contain' (Default: best fit preserving aspect ratio)
        const scale = Math.min(availW / imgWidth, availH / imgHeight);
        drawW = imgWidth * scale;
        drawH = imgHeight * scale;
      }

      // Center image within margins
      drawX = marginPts + (availW - drawW) / 2;
      drawY = marginPts + (availH - drawH) / 2;

      page.drawImage(embeddedImage, {
        x: drawX,
        y: drawY,
        width: drawW,
        height: drawH
      });
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    return {
      blob,
      filename: options.filename || 'images_to_pdf.pdf',
      size: blob.size,
      pageCount: imageItems.length
    };
  }

  /**
   * Helper: Read file, apply rotation, and produce clean JPEG bytes
   */
  async function processImageToCanvas(file, rotation = 0, quality = 0.88) {
    const dataUrl = await MobileUtils.readFileAsDataURL(file);
    const img = await MobileUtils.loadImageFromSrc(dataUrl);

    const rad = ((rotation % 360) * Math.PI) / 180;
    const isRotated90or270 = rotation === 90 || rotation === 270;

    const canvasW = isRotated90or270 ? img.height : img.width;
    const canvasH = isRotated90or270 ? img.width : img.height;

    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d');

    // Fill white background for clean PDF rendering
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasW, canvasH);

    ctx.save();
    ctx.translate(canvasW / 2, canvasH / 2);
    ctx.rotate(rad);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();

    const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
    const jpegBytes = await fetch(jpegDataUrl).then(res => res.arrayBuffer());

    return {
      bytes: jpegBytes,
      width: canvasW,
      height: canvasH
    };
  }

  return {
    PAGE_SIZES,
    MARGINS,
    generatePdf
  };
})();
