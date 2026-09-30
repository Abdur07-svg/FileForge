const MobileImageToPdf = (() => {

  const FILTER_PRESETS = [
    { id: 'original', name: 'Original', desc: 'No modification' },
    { id: 'vibrant', name: 'Vibrant', desc: 'Vivid & clear' },
    { id: 'soft-tone', name: 'Soft Tone', desc: 'Balanced tone' },
    { id: 'color', name: 'Color', desc: 'Color boosted' },
    { id: 'sharp-black', name: 'Sharp Black', desc: 'Deep black text' },
    { id: 'grayscale', name: 'Grayscale', desc: 'Clean B&W' },
    { id: 'high-contrast', name: 'High Contrast', desc: 'High contrast' },
    { id: 'clean-document', name: 'Clean Doc', desc: 'Document white' }
  ];

  const PAGE_SIZES = {
    a4: { width: 595.28, height: 841.89 },
    letter: { width: 612.0, height: 792.0 },
    legal: { width: 612.0, height: 1008.0 }
  };

  const MARGINS = {
    none: 0,
    small: 18,
    medium: 36,
    large: 54
  };

  function renderEditedImageToCanvas(canvas, imgObj, editState = {}, targetWidth = null, targetHeight = null) {
    const rot = ((editState.rotate % 360) + 360) % 360;
    const isRotated90 = (rot === 90 || rot === 270);

    const natW = imgObj.naturalWidth || imgObj.width || 100;
    const natH = imgObj.naturalHeight || imgObj.height || 100;
    const fullRotatedW = isRotated90 ? natH : natW;
    const fullRotatedH = isRotated90 ? natW : natH;

    const hasCrop = editState.crop && editState.crop.w > 0 && editState.crop.h > 0;
    let cropX = 0, cropY = 0, cropW = fullRotatedW, cropH = fullRotatedH;

    if (hasCrop) {
      cropX = Math.max(0, Math.min(fullRotatedW - 1, editState.crop.x));
      cropY = Math.max(0, Math.min(fullRotatedH - 1, editState.crop.y));
      cropW = Math.max(1, Math.min(fullRotatedW - cropX, editState.crop.w));
      cropH = Math.max(1, Math.min(fullRotatedH - cropY, editState.crop.h));
    }

    const finalW = hasCrop ? cropW : fullRotatedW;
    const finalH = hasCrop ? cropH : fullRotatedH;

    canvas.width = targetWidth || finalW;
    canvas.height = targetHeight || finalH;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let filterCSS = 'none';
    const f = editState.filter || 'original';

    if (f === 'vibrant') {
      filterCSS = 'saturate(1.4) contrast(1.1) brightness(1.02)';
    } else if (f === 'soft-tone') {
      filterCSS = 'contrast(0.92) brightness(1.04) saturate(0.95)';
    } else if (f === 'color') {
      filterCSS = 'saturate(1.22) contrast(1.06) brightness(1.02)';
    } else if (f === 'sharp-black') {
      filterCSS = 'contrast(1.6) brightness(0.94) grayscale(0.15)';
    } else if (f === 'grayscale') {
      filterCSS = 'grayscale(100%) contrast(1.08)';
    } else if (f === 'high-contrast') {
      filterCSS = 'contrast(1.75) brightness(1.04)';
    } else if (f === 'clean-document') {
      filterCSS = 'contrast(1.35) brightness(1.15) saturate(0.9)';
    }

    if (!hasCrop) {
      ctx.save();
      ctx.filter = filterCSS;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      if (rot) ctx.rotate((rot * Math.PI) / 180);
      const scaleX = editState.flipH ? -1 : 1;
      const scaleY = editState.flipV ? -1 : 1;
      ctx.scale(scaleX, scaleY);

      const drawW = isRotated90 ? canvas.height : canvas.width;
      const drawH = isRotated90 ? canvas.width : canvas.height;
      ctx.drawImage(imgObj, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
      ctx.filter = 'none';
    } else {
      const rotCanvas = document.createElement('canvas');
      rotCanvas.width = fullRotatedW;
      rotCanvas.height = fullRotatedH;
      const rotCtx = rotCanvas.getContext('2d');

      rotCtx.translate(fullRotatedW / 2, fullRotatedH / 2);
      if (rot) rotCtx.rotate((rot * Math.PI) / 180);
      const scaleX = editState.flipH ? -1 : 1;
      const scaleY = editState.flipV ? -1 : 1;
      rotCtx.scale(scaleX, scaleY);

      const drawW = isRotated90 ? fullRotatedH : fullRotatedW;
      const drawH = isRotated90 ? fullRotatedW : fullRotatedH;
      rotCtx.drawImage(imgObj, -drawW / 2, -drawH / 2, drawW, drawH);

      ctx.save();
      ctx.filter = filterCSS;
      ctx.drawImage(rotCanvas, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);
      ctx.restore();
      ctx.filter = 'none';

      rotCanvas.width = 1;
      rotCanvas.height = 1;
    }

    if (f === 'clean-document') {
      try {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i + 1], b = d[i + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          if (lum > 205) {
            d[i] = Math.min(255, r + (255 - r) * 0.75);
            d[i + 1] = Math.min(255, g + (255 - g) * 0.75);
            d[i + 2] = Math.min(255, b + (255 - b) * 0.75);
          } else if (lum < 110) {
            d[i] = Math.max(0, r * 0.88);
            d[i + 1] = Math.max(0, g * 0.88);
            d[i + 2] = Math.max(0, b * 0.88);
          }
        }
        ctx.putImageData(imgData, 0, 0);
      } catch (e) {

      }
    }
  }

  function extractSignature(imgObj, settings = {}) {
    const sensitivity = settings.sensitivity !== undefined ? settings.sensitivity : 45;
    const inkColor = settings.inkColor || 'original';
    const autoCrop = settings.autoCrop !== false;

    const canvas = document.createElement('canvas');
    canvas.width = imgObj.naturalWidth || imgObj.width;
    canvas.height = imgObj.naturalHeight || imgObj.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgObj, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;

    const threshold = 120 + (sensitivity / 100) * 125;

    let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
    let hasInk = false;

    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      if (lum >= threshold) {
        d[i + 3] = 0;
      } else {
        const alphaFactor = Math.min(1, Math.max(0, (threshold - lum) / (threshold * 0.45)));
        const alpha = Math.round(alphaFactor * 255);
        d[i + 3] = alpha;

        if (alpha > 20) {
          const pixelIdx = i / 4;
          const px = pixelIdx % canvas.width;
          const py = Math.floor(pixelIdx / canvas.width);
          if (px < minX) minX = px;
          if (px > maxX) maxX = px;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;
          hasInk = true;

          if (inkColor === 'black') {
            d[i] = 20;
            d[i + 1] = 20;
            d[i + 2] = 20;
          } else if (inkColor === 'blue') {
            d[i] = 20;
            d[i + 1] = 60;
            d[i + 2] = 165;
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    let finalCanvas = canvas;
    if (autoCrop && hasInk && minX < maxX && minY < maxY) {
      const pad = 8;
      const cropX = Math.max(0, minX - pad);
      const cropY = Math.max(0, minY - pad);
      const cropW = Math.min(canvas.width - cropX, (maxX - minX) + pad * 2);
      const cropH = Math.min(canvas.height - cropY, (maxY - minY) + pad * 2);

      const cropped = document.createElement('canvas');
      cropped.width = cropW;
      cropped.height = cropH;
      const cCtx = cropped.getContext('2d');
      cCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      finalCanvas = cropped;
    }

    const dataUrl = finalCanvas.toDataURL('image/png');
    return {
      dataUrl,
      width: finalCanvas.width,
      height: finalCanvas.height,
      aspectRatio: finalCanvas.width / (finalCanvas.height || 1),
      canvas: finalCanvas
    };
  }

  async function generatePdf(imageItems, options = {}, signatureData = null, onProgress = null) {
    if (!window.PDFLib) throw new Error('PDF-Lib is not loaded');
    if (!imageItems || imageItems.length === 0) throw new Error('No images selected');

    const pdfDoc = await PDFLib.PDFDocument.create();
    const pageSizeKey = options.pageSize || 'a4';
    const globalOrientation = options.globalOrientation || 'auto';
    const marginKey = options.margin || 'none';
    const marginPts = MARGINS[marginKey] !== undefined ? MARGINS[marginKey] : 0;
    const quality = options.quality || 0.88;

    let embeddedSig = null;
    if (signatureData && signatureData.active && signatureData.dataUrl) {
      const sigImg = await MobileUtils.loadImageFromSrc(signatureData.dataUrl);
      const sigCanvas = document.createElement('canvas');
      sigCanvas.width = sigImg.naturalWidth;
      sigCanvas.height = sigImg.naturalHeight;
      const sCtx = sigCanvas.getContext('2d');
      sCtx.drawImage(sigImg, 0, 0);

      const sigPngDataUrl = sigCanvas.toDataURL('image/png');
      const sigBytes = await fetch(sigPngDataUrl).then(res => res.arrayBuffer());
      embeddedSig = await pdfDoc.embedPng(sigBytes);
    }

    for (let i = 0; i < imageItems.length; i++) {
      if (onProgress) onProgress(i + 1, imageItems.length);

      const item = imageItems[i];
      const imgObj = await MobileUtils.loadImageFromSrc(item.dataUrl || item.previewUrl);

      const renderCanvas = document.createElement('canvas');
      renderEditedImageToCanvas(renderCanvas, imgObj, item.editState || {});

      if (renderCanvas.width > 4000 || renderCanvas.height > 4000) {
        const maxDim = 3600;
        const scale = Math.min(maxDim / renderCanvas.width, maxDim / renderCanvas.height);
        const scaledCanvas = document.createElement('canvas');
        scaledCanvas.width = Math.round(renderCanvas.width * scale);
        scaledCanvas.height = Math.round(renderCanvas.height * scale);
        const scCtx = scaledCanvas.getContext('2d');
        scCtx.drawImage(renderCanvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
        renderCanvas.width = scaledCanvas.width;
        renderCanvas.height = scaledCanvas.height;
        const rCtx = renderCanvas.getContext('2d');
        rCtx.drawImage(scaledCanvas, 0, 0);
      }

      const isPng = item.file && (item.file.type === 'image/png' || /\.png$/i.test(item.file.name));
      let embeddedImage;

      if (isPng) {
        const pngDataUrl = renderCanvas.toDataURL('image/png');
        const pngBytes = await fetch(pngDataUrl).then(res => res.arrayBuffer());
        embeddedImage = await pdfDoc.embedPng(pngBytes);
      } else {
        const jpgDataUrl = renderCanvas.toDataURL('image/jpeg', quality);
        const jpgBytes = await fetch(jpgDataUrl).then(res => res.arrayBuffer());
        embeddedImage = await pdfDoc.embedJpg(jpgBytes);
      }

      const imgWidth = renderCanvas.width;
      const imgHeight = renderCanvas.height;

      let pageW, pageH;
      const itemOrientation = item.orientation || globalOrientation;

      if (pageSizeKey === 'fit') {
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

      const page = pdfDoc.addPage([pageW, pageH]);

      const availW = Math.max(1, pageW - marginPts * 2);
      const availH = Math.max(1, pageH - marginPts * 2);

      const scale = Math.min(availW / imgWidth, availH / imgHeight);
      const drawW = imgWidth * scale;
      const drawH = imgHeight * scale;

      const drawX = marginPts + (availW - drawW) / 2;
      const drawY = marginPts + (availH - drawH) / 2;

      page.drawImage(embeddedImage, {
        x: drawX,
        y: drawY,
        width: drawW,
        height: drawH
      });

      if (embeddedSig && signatureData) {
        const sigPdfW = pageW * signatureData.relW;
        const sigPdfH = sigPdfW / (signatureData.aspectRatio || 1);
        const sigPdfX = pageW * signatureData.relX;

        const sigPdfY = pageH - (pageH * signatureData.relY) - sigPdfH;

        page.drawImage(embeddedSig, {
          x: Math.max(0, sigPdfX),
          y: Math.max(0, sigPdfY),
          width: sigPdfW,
          height: sigPdfH
        });
      }

      renderCanvas.width = 1;
      renderCanvas.height = 1;
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

  return {
    FILTER_PRESETS,
    PAGE_SIZES,
    MARGINS,
    renderEditedImageToCanvas,
    extractSignature,
    generatePdf
  };
})();
