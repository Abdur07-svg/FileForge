/**
 * FileForge - Batch File Renamer Tool
 * Easily add prefix/suffix, search & replace, sequential numbers, or change casing on multiple files before downloading.
 */

const FileRenamer = (() => {
  let filesList = []; // { file, origName, newName, size }
  let dom = {};

  function init() {
    dom = {
      container: document.getElementById('tool-file-renamer'),
      dropzone: document.getElementById('frnm-dropzone'),
      fileInput: document.getElementById('frnm-file-input'),
      browseBtn: document.getElementById('frnm-browse-btn'),
      workspace: document.getElementById('frnm-workspace'),
      emptyState: document.getElementById('frnm-empty-state'),
      
      // Controls
      prefixInput: document.getElementById('frnm-prefix'),
      suffixInput: document.getElementById('frnm-suffix'),
      findInput: document.getElementById('frnm-find'),
      replaceInput: document.getElementById('frnm-replace'),
      numberingCheck: document.getElementById('frnm-numbering'),
      caseSelect: document.getElementById('frnm-case'),
      
      // List
      fileList: document.getElementById('frnm-file-list'),
      fileCountText: document.getElementById('frnm-count'),
      
      // Actions
      applyBtn: document.getElementById('frnm-apply-btn'),
      downloadZipBtn: document.getElementById('frnm-download-zip-btn'),
      downloadAllBtn: document.getElementById('frnm-download-all-btn'),
      resetBtn: document.getElementById('frnm-reset-btn')
    };

    if (!dom.container) return;

    bindEvents();
  }

  function bindEvents() {
    Utils.setupDropZone(dom.dropzone, handleFiles);
    dom.browseBtn.addEventListener('click', () => dom.fileInput.click());
    dom.fileInput.addEventListener('change', (e) => {
      handleFiles(Array.from(e.target.files));
      dom.fileInput.value = '';
    });

    const inputs = [
      dom.prefixInput, dom.suffixInput, dom.findInput,
      dom.replaceInput, dom.numberingCheck, dom.caseSelect
    ];

    inputs.forEach(input => {
      if (input) {
        input.addEventListener('input', computeNewNames);
        input.addEventListener('change', computeNewNames);
      }
    });

    if (dom.downloadZipBtn) dom.downloadZipBtn.addEventListener('click', downloadAsZip);
    if (dom.downloadAllBtn) dom.downloadAllBtn.addEventListener('click', downloadIndividually);
    if (dom.resetBtn) dom.resetBtn.addEventListener('click', resetTool);
  }

  function handleFiles(files) {
    if (!files || files.length === 0) return;

    for (const file of files) {
      filesList.push({
        file,
        origName: file.name,
        newName: file.name,
        size: file.size
      });
    }

    dom.emptyState.classList.add('hidden');
    dom.workspace.classList.remove('hidden');

    computeNewNames();
    Utils.showToast(`Loaded ${files.length} file(s) for renaming`, 'success');
  }

  function computeNewNames() {
    const prefix = dom.prefixInput ? dom.prefixInput.value : '';
    const suffix = dom.suffixInput ? dom.suffixInput.value : '';
    const findStr = dom.findInput ? dom.findInput.value : '';
    const replaceStr = dom.replaceInput ? dom.replaceInput.value : '';
    const useNumbering = dom.numberingCheck ? dom.numberingCheck.checked : false;
    const caseRule = dom.caseSelect ? dom.caseSelect.value : 'original';

    filesList.forEach((item, index) => {
      let base = Utils.getBaseName(item.origName);
      let ext = Utils.getExtension(item.origName);

      // Find & Replace
      if (findStr) {
        base = base.split(findStr).join(replaceStr);
      }

      // Case transformation
      if (caseRule === 'lower') {
        base = base.toLowerCase();
      } else if (caseRule === 'upper') {
        base = base.toUpperCase();
      } else if (caseRule === 'title') {
        base = base.replace(/\b\w/g, l => l.toUpperCase());
      }

      // Prefix / Suffix
      if (prefix) base = prefix + base;
      if (suffix) base = base + suffix;

      // Sequential Numbering
      if (useNumbering) {
        const numStr = String(index + 1).padStart(2, '0');
        base = `${base}_${numStr}`;
      }

      item.newName = ext ? `${base}.${ext}` : base;
    });

    renderList();
  }

  function renderList() {
    if (!dom.fileList) return;
    dom.fileList.innerHTML = '';

    filesList.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'reorder-item';

      const isChanged = item.origName !== item.newName;

      row.innerHTML = `
        <div class="reorder-item-left">
          <span class="reorder-index-badge">${index + 1}</span>
          <div class="reorder-item-info">
            <span class="reorder-item-title" style="color: ${isChanged ? 'var(--color-success)' : 'var(--text-primary)'}; font-weight: 700;">${item.newName}</span>
            <span class="reorder-item-sub">Original: <del style="opacity: 0.7;">${item.origName}</del> &bull; ${Utils.formatBytes(item.size)}</span>
          </div>
        </div>
        <div class="reorder-item-actions">
          <button type="button" class="btn btn-xs btn-primary frnm-dl-single" data-index="${index}">Download</button>
          <button type="button" class="reorder-action-btn delete frnm-del-btn" data-index="${index}" title="Remove">&times;</button>
        </div>
      `;

      row.querySelector('.frnm-dl-single').addEventListener('click', () => {
        Utils.downloadBlob(item.file, item.newName);
      });

      row.querySelector('.frnm-del-btn').addEventListener('click', () => {
        filesList.splice(index, 1);
        if (filesList.length === 0) resetTool();
        else computeNewNames();
      });

      dom.fileList.appendChild(row);
    });

    if (dom.fileCountText) dom.fileCountText.textContent = `${filesList.length} file(s)`;
  }

  async function downloadAsZip() {
    if (filesList.length === 0) return;
    if (typeof JSZip === 'undefined') {
      Utils.showToast('JSZip engine not loaded.', 'error');
      return;
    }

    Utils.setProcessing(true);
    try {
      const zip = new JSZip();
      filesList.forEach(item => {
        zip.file(item.newName, item.file);
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      Utils.downloadBlob(zipBlob, 'renamed-files.zip');
      Utils.showToast(`Downloaded ${filesList.length} renamed files as ZIP!`, 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('Failed to create ZIP: ' + err.message, 'error');
    } finally {
      Utils.setProcessing(false);
    }
  }

  function downloadIndividually() {
    if (filesList.length === 0) return;
    filesList.forEach((item, i) => {
      setTimeout(() => {
        Utils.downloadBlob(item.file, item.newName);
      }, i * 200);
    });
    Utils.showToast(`Downloading ${filesList.length} renamed file(s)...`, 'success');
  }

  function resetTool() {
    filesList = [];
    if (dom.emptyState) dom.emptyState.classList.remove('hidden');
    if (dom.workspace) dom.workspace.classList.add('hidden');
    if (dom.prefixInput) dom.prefixInput.value = '';
    if (dom.suffixInput) dom.suffixInput.value = '';
    if (dom.findInput) dom.findInput.value = '';
    if (dom.replaceInput) dom.replaceInput.value = '';
    if (dom.numberingCheck) dom.numberingCheck.checked = false;
    if (dom.caseSelect) dom.caseSelect.value = 'original';
  }

  return {
    init,
    handleFiles,
    reset: resetTool
  };
})();

window.FileRenamer = FileRenamer;
