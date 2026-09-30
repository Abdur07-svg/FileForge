const MobileZipEngine = (() => {

  async function createZip(fileItems, zipFilename = 'archive.zip', onProgress = null) {
    if (!window.JSZip) throw new Error('JSZip library is not loaded');
    if (!fileItems || fileItems.length === 0) throw new Error('Please add at least one file');

    const zip = new JSZip();

    for (let i = 0; i < fileItems.length; i++) {
      if (onProgress) onProgress(i + 1, fileItems.length);

      const item = fileItems[i];
      const file = item.file || item;

      const path = item.path || file.webkitRelativePath || file.name;

      const buffer = await MobileUtils.readFileAsArrayBuffer(file);
      zip.file(path, buffer);
    }

    const blob = await zip.generateAsync(
      { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
      (metadata) => {
        if (onProgress && metadata.percent) {
          onProgress(metadata.percent, 100);
        }
      }
    );

    return {
      blob,
      filename: MobileUtils.sanitizeFilename(zipFilename, 'archive.zip'),
      size: blob.size,
      fileCount: fileItems.length
    };
  }

  async function readZip(file, onProgress = null) {
    if (!window.JSZip) throw new Error('JSZip library is not loaded');

    const arrayBuffer = await MobileUtils.readFileAsArrayBuffer(file);
    const zip = await JSZip.loadAsync(arrayBuffer);

    const entries = [];
    const fileKeys = Object.keys(zip.files);

    for (let i = 0; i < fileKeys.length; i++) {
      const path = fileKeys[i];
      const zipEntry = zip.files[path];

      entries.push({
        path: path,
        name: path.split('/').filter(Boolean).pop() || path,
        isDir: zipEntry.dir,
        date: zipEntry.date,
        entry: zipEntry
      });
    }

    return {
      entries,
      zipInstance: zip,
      totalEntries: entries.length,
      fileCount: entries.filter(e => !e.isDir).length
    };
  }

  async function extractSingleFile(zipEntry) {
    if (zipEntry.dir) return null;
    const blob = await zipEntry.async('blob');
    const filename = zipEntry.name.split('/').filter(Boolean).pop() || 'extracted_file';
    return { blob, filename, size: blob.size };
  }

  async function bundleBlobsAsZip(blobItems, zipFilename = 'download_all.zip', onProgress = null) {
    if (!window.JSZip) throw new Error('JSZip library is not loaded');

    const zip = new JSZip();
    for (let i = 0; i < blobItems.length; i++) {
      const item = blobItems[i];
      zip.file(item.filename || `file_${i + 1}`, item.blob);
    }

    const zipBlob = await zip.generateAsync(
      { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 5 } },
      (metadata) => {
        if (onProgress && metadata.percent) onProgress(metadata.percent, 100);
      }
    );

    return {
      blob: zipBlob,
      filename: zipFilename,
      size: zipBlob.size
    };
  }

  return {
    createZip,
    readZip,
    extractSingleFile,
    bundleBlobsAsZip
  };
})();
