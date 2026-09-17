/**
 * FileForge Mobile - Image Processing Engine
 * 100% Client-side Canvas Processing
 */
const MobileImageEngine = (() => {

  /**
   * Compress an image file using HTML5 Canvas
   */
  async function compressImage(file, options = {}) {
    const quality = options.quality !== undefined ? options.quality : 0.75;
    const maxWidth = options.maxWidth || null;
    const maxHeight = options.maxHeight || null;
    const outputFormat = options.format || 'image/jpeg';

    const dataUrl = await MobileUtils.readFileAsDataURL(file);
    const img = await MobileUtils.loadImageFromSrc(dataUrl);

    let { width, height } = img;

    if (maxWidth && width > maxWidth) {
      height = Math.round((height * maxWidth) / width);
      width = maxWidth;
    }
    if (maxHeight && height > maxHeight) {
      width = Math.round((width * maxHeight) / height);
      height = maxHeight;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // White background for JPEG if input has transparency
    if (outputFormat === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
    }

    ctx.drawImage(img, 0, 0, width, height);

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Image compression failed to produce blob'));
          return;
        }

        const originalSize = file.size;
        const newSize = blob.size;
        const savingsPercent = originalSize > 0 
          ? Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100))
          : 0;

        const previewUrl = URL.createObjectURL(blob);
        MobileUtils.trackUrl(previewUrl);

        resolve({
          blob,
          originalSize,
          newSize,
          savingsPercent,
          width,
          height,
          previewUrl
        });
      }, outputFormat, quality);
    });
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
