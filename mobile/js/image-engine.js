/**
 * FileForge Mobile - Image Processing Engine
 * 100% Client-side Canvas Processing
 */
const MobileImageEngine = (() => {

  /**
   * Adaptive Color Quantization for PNG images on fresh pixel buffer
   * Reduces palette variance so DEFLATE achieves true compression
   */
  function applyPngQuantization(data, width, height, quality) {
    let levels = 32;
    if (quality >= 0.85) levels = 64;
    else if (quality >= 0.65) levels = 32;
    else if (quality >= 0.40) levels = 16;
    else levels = 8;

    const step = 256 / levels;
    const half = step / 2;
    const len = data.length;

    for (let i = 0; i < len; i += 4) {
      const a = data[i + 3];
      if (a < 16) {
        data[i + 3] = 0;
        continue;
      }
      data[i] = Math.min(255, Math.floor(data[i] / step) * step + half);
      data[i + 1] = Math.min(255, Math.floor(data[i + 1] / step) * step + half);
      data[i + 2] = Math.min(255, Math.floor(data[i + 2] / step) * step + half);
      if (a > 240) data[i + 3] = 255;
    }
  }

  /**
   * Safe Canvas to Blob wrapper with WebView fallback
   */
  function safeCanvasToBlob(canvas, mimeType, quality) {
    return new Promise((resolve, reject) => {
      try {
        canvas.toBlob((blob) => {
          if (blob && blob.size > 0) {
            resolve(blob);
          } else {
            // Fallback for WebViews with broken toBlob
            try {
              const dataUrl = canvas.toDataURL(mimeType, quality);
              const arr = dataUrl.split(',');
              const mime = arr[0].match(/:(.*?);/)[1];
              const bstr = atob(arr[1]);
              let n = bstr.length;
              const u8arr = new Uint8Array(n);
              while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
              }
              const fallbackBlob = new Blob([u8arr], { type: mime });
              resolve(fallbackBlob);
            } catch (fallbackErr) {
              reject(new Error('Canvas encoding failed. Please try a different quality or image.'));
            }
          }
        }, mimeType, quality);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Compress an image file with strict size comparison & safety guards
   */
  async function compressImage(file, options = {}) {
    const quality = options.quality !== undefined ? options.quality : 0.75;
    const maxWidth = options.maxWidth || null;
    const maxHeight = options.maxHeight || null;
    const isExplicitFormat = !!options.format && options.formatChoice !== 'original';
    
    let outputFormat = options.format;
    if (!outputFormat) {
      if (file.type === 'image/png' || /\.png$/i.test(file.name)) outputFormat = 'image/png';
      else if (file.type === 'image/webp' || /\.webp$/i.test(file.name)) outputFormat = 'image/webp';
      else outputFormat = 'image/jpeg';
    }

    const dataUrl = await MobileUtils.readFileAsDataURL(file);
    const img = await MobileUtils.loadImageFromSrc(dataUrl);

    let originalWidth = img.naturalWidth || img.width;
    let originalHeight = img.naturalHeight || img.height;
    let width = originalWidth;
    let height = originalHeight;

    if (maxWidth && width > maxWidth) {
      height = Math.round((height * maxWidth) / width);
      width = maxWidth;
    }
    if (maxHeight && height > maxHeight) {
      width = Math.round((width * maxHeight) / height);
      height = maxHeight;
    }

    const dimensionsUnchanged = (width === originalWidth && height === originalHeight);

    // Master clean canvas
    const masterCanvas = document.createElement('canvas');
    masterCanvas.width = width;
    masterCanvas.height = height;
    const masterCtx = masterCanvas.getContext('2d', { willReadFrequently: true });
    masterCtx.imageSmoothingEnabled = true;
    masterCtx.imageSmoothingQuality = 'high';

    if (outputFormat === 'image/jpeg') {
      masterCtx.fillStyle = '#FFFFFF';
      masterCtx.fillRect(0, 0, width, height);
    }
    masterCtx.drawImage(img, 0, 0, width, height);

    let finalBlob = null;
    let retainedOriginal = false;
    let isExplicitConversion = isExplicitFormat && (
      (outputFormat === 'image/jpeg' && !file.type.includes('jpeg') && !file.type.includes('jpg')) ||
      (outputFormat === 'image/png' && !file.type.includes('png')) ||
      (outputFormat === 'image/webp' && !file.type.includes('webp'))
    );

    if (outputFormat === 'image/png') {
      // 1. Initial Quantization Attempt from fresh master canvas
      const workCanvas = document.createElement('canvas');
      workCanvas.width = width;
      workCanvas.height = height;
      const workCtx = workCanvas.getContext('2d');
      workCtx.drawImage(masterCanvas, 0, 0);

      // Get ORIGINAL fresh ImageData
      const origImageData = masterCtx.getImageData(0, 0, width, height);
      const clonedData = new Uint8ClampedArray(origImageData.data);
      applyPngQuantization(clonedData, width, height, quality);
      const workingImageData = new ImageData(clonedData, width, height);
      workCtx.putImageData(workingImageData, 0, 0);

      let bestBlob = await safeCanvasToBlob(workCanvas, 'image/png', quality);

      // 2. If PNG is still larger than original with unchanged dimensions, step down quantization
      if (bestBlob.size >= file.size && dimensionsUnchanged) {
        const testQualities = [0.65, 0.45, 0.25, 0.15];
        for (const testQ of testQualities) {
          if (testQ >= quality) continue;
          const freshCloned = new Uint8ClampedArray(origImageData.data);
          applyPngQuantization(freshCloned, width, height, testQ);
          workCtx.putImageData(new ImageData(freshCloned, width, height), 0, 0);
          const candidate = await safeCanvasToBlob(workCanvas, 'image/png', testQ);
          if (candidate && candidate.size < bestBlob.size) {
            bestBlob = candidate;
            if (bestBlob.size < file.size) break;
          }
        }
      }

      // 3. Strict Size Rule for PNG: If still >= original with unchanged dimensions & not explicit conversion
      if (bestBlob.size >= file.size && dimensionsUnchanged && !isExplicitConversion) {
        finalBlob = file;
        retainedOriginal = true;
      } else {
        finalBlob = bestBlob;
      }
    } else {
      // JPEG & WebP Compression with Iterative Quality Stepping
      let bestBlob = await safeCanvasToBlob(masterCanvas, outputFormat, quality);

      if (bestBlob.size >= file.size && dimensionsUnchanged && !isExplicitConversion) {
        let tryQuality = quality;
        while (tryQuality > 0.18 && bestBlob.size >= file.size) {
          tryQuality -= 0.12;
          const candidate = await safeCanvasToBlob(masterCanvas, outputFormat, Math.max(0.1, tryQuality));
          if (candidate && candidate.size < bestBlob.size) {
            bestBlob = candidate;
          } else {
            break;
          }
        }
      }

      // Safety check: Never return larger file when format is original and dimensions unchanged
      if (bestBlob.size >= file.size && dimensionsUnchanged && !isExplicitConversion) {
        finalBlob = file;
        retainedOriginal = true;
      } else {
        finalBlob = bestBlob;
      }
    }

    const originalSize = file.size;
    const newSize = finalBlob.size;
    const savingsPercent = originalSize > 0 && newSize < originalSize
      ? Math.round(((originalSize - newSize) / originalSize) * 100)
      : 0;

    const previewUrl = URL.createObjectURL(finalBlob);
    MobileUtils.trackUrl(previewUrl);

    return {
      blob: finalBlob,
      originalSize,
      newSize,
      savingsPercent,
      retainedOriginal,
      isExplicitConversion,
      dimensionsUnchanged,
      width,
      height,
      previewUrl
    };
  }

  /**
   * Resize image by dimensions or scale percentage
   */
  async function resizeImage(file, options = {}) {
    const dataUrl = await MobileUtils.readFileAsDataURL(file);
    const img = await MobileUtils.loadImageFromSrc(dataUrl);

    let targetWidth = options.width;
    let targetHeight = options.height;
    const maintainAspect = options.maintainAspect !== false;

    if (options.scalePercent) {
      const scale = options.scalePercent / 100;
      targetWidth = Math.max(1, Math.round(img.width * scale));
      targetHeight = Math.max(1, Math.round(img.height * scale));
    } else {
      targetWidth = parseInt(targetWidth, 10) || img.width;
      targetHeight = parseInt(targetHeight, 10) || img.height;
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const format = options.format || file.type || 'image/png';
    if (format === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
    }

    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Image resize failed'));
          return;
        }
        const previewUrl = URL.createObjectURL(blob);
        MobileUtils.trackUrl(previewUrl);

        resolve({
          blob,
          width: targetWidth,
          height: targetHeight,
          size: blob.size,
          previewUrl
        });
      }, format, options.quality || 0.92);
    });
  }

  /**
   * Convert image format (JPG, PNG, WebP)
   */
  async function convertImage(file, targetFormat = 'image/png', quality = 0.92) {
    const dataUrl = await MobileUtils.readFileAsDataURL(file);
    const img = await MobileUtils.loadImageFromSrc(dataUrl);

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');

    if (targetFormat === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, img.width, img.height);
    }

    ctx.drawImage(img, 0, 0);

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Image conversion failed'));
          return;
        }
        const previewUrl = URL.createObjectURL(blob);
        MobileUtils.trackUrl(previewUrl);

        let ext = 'png';
        if (targetFormat === 'image/jpeg') ext = 'jpg';
        if (targetFormat === 'image/webp') ext = 'webp';

        const outputName = `${MobileUtils.getBaseName(file.name)}.${ext}`;

        resolve({
          blob,
          filename: outputName,
          size: blob.size,
          previewUrl
        });
      }, targetFormat, quality);
    });
  }

  return {
    compressImage,
    resizeImage,
    convertImage
  };
})();
