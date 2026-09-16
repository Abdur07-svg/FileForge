/**
 * FileForge - Tool-Specific How-to-Use Mobile Guides Configuration
 * Lightweight, zero-dependency contextual guides for all FileForge tools.
 */

const ToolGuides = (() => {
  const GUIDES = {
    'pdf-compressor': {
      title: 'How to use PDF Compressor',
      steps: [
        { label: 'Upload PDF', desc: 'Tap **+ Choose PDF** or drop your PDF document.' },
        { label: 'Select Preset', desc: 'Choose **Small File (30%)**, **Balanced (60%)**, or **Best Quality (85%)**.' },
        { label: 'Fine-tune (Optional)', desc: 'Tap **Advanced Compression Fine-Tuning ▾** to set an exact quality percentage.' },
        { label: 'Compress', desc: 'Tap **Compress PDF** to shrink your file.' },
        { label: 'Download', desc: 'Tap **Download Compressed PDF** to save your reduced PDF.' }
      ]
    },
    'image-compressor': {
      title: 'How to use Image Compressor',
      steps: [
        { label: 'Add Images', desc: 'Tap **+ Add Images** to select JPG, PNG, or WebP photos.' },
        { label: 'Choose Quality', desc: 'Select **Low**, **Balanced**, or **High** quality preset.' },
        { label: 'Output Format', desc: 'Keep original format or choose JPG, WebP, or PNG.' },
        { label: 'Compress', desc: 'Tap **Compress Image** to process your photos.' },
        { label: 'Download', desc: 'Tap **Download Image** or **Download All (ZIP)** to save your results.' }
      ]
    },
    'pdf-to-jpg': {
      title: 'How to use PDF to JPG',
      steps: [
        { label: 'Upload PDF', desc: 'Tap **+ Choose PDF** to load your document.' },
        { label: 'Select Quality', desc: 'Choose output format (JPG) and resolution (Standard or HD DPI).' },
        { label: 'Select Pages', desc: 'Tap thumbnails to select individual pages or tap **Select All**.' },
        { label: 'Convert', desc: 'Tap **Convert Selected Pages** to rasterize PDF pages.' },
        { label: 'Download', desc: 'Tap **Download All as ZIP** to save all converted pages.' }
      ]
    },
    'pdf-to-png': {
      title: 'How to use PDF to PNG',
      steps: [
        { label: 'Upload PDF', desc: 'Tap **+ Choose PDF** to load your document.' },
        { label: 'Select Pages', desc: 'Tap page thumbnails to select pages or tap **Select All**.' },
        { label: 'Convert', desc: 'Tap **Convert Selected Pages** to render crisp PNG graphics.' },
        { label: 'Download', desc: 'Tap **Download All as ZIP** to save your PNG files.' }
      ]
    },
    'jpg-to-png': {
      title: 'How to use JPG to PNG',
      steps: [
        { label: 'Add JPG Images', desc: 'Tap **+ Add Images** to select JPEG photos.' },
        { label: 'Set Format', desc: 'Ensure **PNG** is selected in the Convert To dropdown.' },
        { label: 'Convert', desc: 'Tap **Convert Format** to generate PNG files.' },
        { label: 'Download', desc: 'Tap **Download All (ZIP)** or download single images.' }
      ]
    },
    'png-to-jpg': {
      title: 'How to use PNG to JPG',
      steps: [
        { label: 'Add PNG Images', desc: 'Tap **+ Add Images** to select PNG graphics.' },
        { label: 'Background Color', desc: 'Choose a background color (White or Black) for transparent areas.' },
        { label: 'Convert', desc: 'Tap **Convert Format** to process your images.' },
        { label: 'Download', desc: 'Tap **Download All (ZIP)** to save your JPG photos.' }
      ]
    },
    'jpg-to-pdf': {
      title: 'How to use JPG to PDF',
      steps: [
        { label: 'Add Images', desc: 'Tap **+ Add Images** to select JPG or PNG photos.' },
        { label: 'Page Order', desc: 'Drag or use page controls to order your images.' },
        { label: 'Configure Page', desc: 'Select page size (A4/Letter), orientation, and margins.' },
        { label: 'Create PDF', desc: 'Tap **Create PDF Document** to compile your document.' },
        { label: 'Download', desc: 'Tap **Download PDF** to save your file.' }
      ]
    },
    'png-to-pdf': {
      title: 'How to use PNG to PDF',
      steps: [
        { label: 'Add Images', desc: 'Tap **+ Add Images** to choose PNG files.' },
        { label: 'Page Layout', desc: 'Choose A4 or Original Size, orientation, and margins.' },
        { label: 'Create PDF', desc: 'Tap **Create PDF Document** to build the document.' },
        { label: 'Download', desc: 'Tap **Download PDF** to save the file.' }
      ]
    },
    'image-resizer': {
      title: 'How to use Image Resizer',
      steps: [
        { label: 'Add Images', desc: 'Tap **+ Choose Image** or **+ Add Images**.' },
        { label: 'Resize Box', desc: 'Drag the handles on the preview canvas using your finger or mouse.' },
        { label: 'Exact Inputs', desc: 'Enter exact **Width (px)** and **Height (px)** or choose a percentage.' },
        { label: 'Resize or Crop', desc: 'Tap **Resize Image** or tap **Apply Crop** to crop to selection.' },
        { label: 'Download', desc: 'Tap **Download Image** to save your resized file.' }
      ]
    },
    'image-converter': {
      title: 'How to use Image Converter',
      steps: [
        { label: 'Add Images', desc: 'Tap **+ Add Images** to select JPG, PNG, WebP, GIF, or BMP files.' },
        { label: 'Select Target Format', desc: 'Choose **PNG**, **JPG / JPEG**, or **WebP**.' },
        { label: 'Convert', desc: 'Tap **Convert Format** to process all images in bulk.' },
        { label: 'Download', desc: 'Tap **Download All (ZIP)** to download your converted files.' }
      ]
    },
    'pdf-extractor': {
      title: 'How to use PDF Page Extractor',
      steps: [
        { label: 'Upload PDF', desc: 'Tap **+ Choose PDF** to load document thumbnails.' },
        { label: 'Select Pages', desc: 'Tap individual page thumbnails or tap **Select All** / **Odd Pages**.' },
        { label: 'Extract', desc: 'Tap **Extract Selected Pages** to generate the new document.' },
        { label: 'Download', desc: 'Tap **Download Extracted PDF** to save your file.' }
      ]
    },
    'pdf-merger': {
      title: 'How to use PDF Merger',
      steps: [
        { label: 'Add PDFs', desc: 'Tap **+ Add PDFs** to select 2 or more PDF documents.' },
        { label: 'Reorder Files', desc: 'Drag or move files to set the desired document order.' },
        { label: 'Merge', desc: 'Tap **Merge PDFs** to combine all documents into one.' },
        { label: 'Download', desc: 'Tap **Download Merged PDF** to save your combined file.' }
      ]
    },
    'pdf-splitter': {
      title: 'How to use PDF Splitter',
      steps: [
        { label: 'Upload PDF', desc: 'Tap **+ Choose PDF** to load your document.' },
        { label: 'Set Ranges', desc: 'Enter custom page ranges (e.g. `1-3, 5`) or split into single pages.' },
        { label: 'Split', desc: 'Tap **Split PDF** to divide the file.' },
        { label: 'Download', desc: 'Tap **Download Split PDFs (ZIP)** to save the result.' }
      ]
    },
    'pdf-rotate': {
      title: 'How to use PDF Rotate',
      steps: [
        { label: 'Upload PDF', desc: 'Tap **+ Choose PDF** to view page thumbnails.' },
        { label: 'Select Angles', desc: 'Tap **↻ 90° CW**, **↺ 90° CCW**, or **⇋ 180°** on pages.' },
        { label: 'Rotate Document', desc: 'Tap **Rotate PDF** to apply rotation losslessly.' },
        { label: 'Download', desc: 'Tap **Download Rotated PDF** to save.' }
      ]
    },
    'pdf-delete-pages': {
      title: 'How to use PDF Delete Pages',
      steps: [
        { label: 'Upload PDF', desc: 'Tap **+ Choose PDF** to load page thumbnails.' },
        { label: 'Mark for Deletion', desc: 'Tap unwanted page thumbnails to highlight them for deletion.' },
        { label: 'Delete', desc: 'Tap **Delete Selected Pages** to remove them.' },
        { label: 'Download', desc: 'Tap **Download PDF** to save your cleaned document.' }
      ]
    },
    'pdf-reorder-pages': {
      title: 'How to use PDF Reorder Pages',
      steps: [
        { label: 'Upload PDF', desc: 'Tap **+ Choose PDF** to display all pages.' },
        { label: 'Reorder', desc: 'Drag thumbnails to rearrange pages or tap **Reverse Order**.' },
        { label: 'Save Order', desc: 'Tap **Reorder Pages** to finalize page sequence.' },
        { label: 'Download', desc: 'Tap **Download PDF** to save the reordered file.' }
      ]
    },
    'pdf-watermark': {
      title: 'How to use PDF Watermark',
      steps: [
        { label: 'Upload PDF', desc: 'Tap **+ Choose PDF** to load your document.' },
        { label: 'Watermark Content', desc: 'Type custom watermark text or upload a logo image.' },
        { label: 'Adjust Settings', desc: 'Set font size, opacity, angle (°), and positioning.' },
        { label: 'Apply', desc: 'Tap **Apply Watermark** to stamp all pages.' },
        { label: 'Download', desc: 'Tap **Download Watermarked PDF** to save.' }
      ]
    },
    'pdf-page-number': {
      title: 'How to use PDF Page Number',
      steps: [
        { label: 'Upload PDF', desc: 'Tap **+ Choose PDF** to load document.' },
        { label: 'Position & Format', desc: 'Choose header/footer position and page number format.' },
        { label: 'Apply', desc: 'Tap **Add Page Numbers** to stamp pages.' },
        { label: 'Download', desc: 'Tap **Download PDF** to save your document.' }
      ]
    },
    'pdf-protect': {
      title: 'How to use PDF Protect',
      steps: [
        { label: 'Upload PDF', desc: 'Tap **+ Choose PDF** to select your document.' },
        { label: 'Enter Password', desc: 'Type a strong document open password.' },
        { label: 'Encrypt', desc: 'Tap **Protect PDF** to encrypt the file in browser memory.' },
        { label: 'Download', desc: 'Tap **Download Protected PDF** to save.' }
      ]
    },
    'pdf-metadata-editor': {
      title: 'How to use PDF Metadata Editor',
      steps: [
        { label: 'Upload PDF', desc: 'Tap **+ Choose PDF** to inspect metadata.' },
        { label: 'Edit Fields', desc: 'Modify Title, Author, Subject, Keywords or tap **Strip All Metadata**.' },
        { label: 'Save', desc: 'Tap **Save Metadata** to update document header.' },
        { label: 'Download', desc: 'Tap **Download PDF** to save your file.' }
      ]
    },
    'pdf-to-text': {
      title: 'How to use PDF to Text',
      steps: [
        { label: 'Upload PDF', desc: 'Tap **+ Choose PDF** to extract content.' },
        { label: 'Extract', desc: 'Tap **Extract Text** to parse text from all pages.' },
        { label: 'Copy or Download', desc: 'Tap **Copy Text** or tap **Download .txt File**.' }
      ]
    },
    'pdf-crop': {
      title: 'How to use PDF Crop',
      steps: [
        { label: 'Upload PDF', desc: 'Tap **+ Choose PDF** to load page preview.' },
        { label: 'Adjust Crop Box', desc: 'Drag handles on preview canvas or enter margin numbers.' },
        { label: 'Crop PDF', desc: 'Tap **Crop PDF** to trim margins losslessly.' },
        { label: 'Download', desc: 'Tap **Download Cropped PDF** to save.' }
      ]
    },
    'pdf-grayscale': {
      title: 'How to use PDF Grayscale',
      steps: [
        { label: 'Upload PDF', desc: 'Tap **+ Choose PDF** to select document.' },
        { label: 'Preset Mode', desc: 'Choose Standard Grayscale, High Contrast, or B&W Scan.' },
        { label: 'Convert', desc: 'Tap **Convert to Grayscale** to process.' },
        { label: 'Download', desc: 'Tap **Download Grayscale PDF** to save.' }
      ]
    },
    'image-cropper': {
      title: 'How to use Image Cropper',
      steps: [
        { label: 'Upload Image', desc: 'Tap **+ Choose Image** to load your photo.' },
        { label: 'Aspect Ratio', desc: 'Select aspect ratio preset (**1:1**, **16:9**, **4:3**, **9:16**, or **Freeform**).' },
        { label: 'Adjust Crop Box', desc: 'Drag handles on preview canvas with finger or cursor.' },
        { label: 'Apply Crop', desc: 'Tap **Apply Crop** to crop the image visually.' },
        { label: 'Download', desc: 'Tap **Download Image** to save your cropped photo.' }
      ]
    },
    'image-rotate': {
      title: 'How to use Image Rotate',
      steps: [
        { label: 'Upload Image', desc: 'Tap **+ Choose Image** to load photo.' },
        { label: 'Select Angle', desc: 'Tap **↻ 90° CW**, **↺ 90° CCW**, or **⇋ 180°**.' },
        { label: 'Rotate', desc: 'Tap **Rotate Image** to apply.' },
        { label: 'Download', desc: 'Tap **Download Image** to save.' }
      ]
    },
    'image-flip': {
      title: 'How to use Image Flip',
      steps: [
        { label: 'Upload Image', desc: 'Tap **+ Choose Image** to load image.' },
        { label: 'Flip Direction', desc: 'Tap **⇆ Flip Horizontal** or **⇅ Flip Vertical**.' },
        { label: 'Apply', desc: 'Tap **Flip Image** to apply transformation.' },
        { label: 'Download', desc: 'Tap **Download Image** to save.' }
      ]
    },
    'image-watermark': {
      title: 'How to use Image Watermark',
      steps: [
        { label: 'Upload Image', desc: 'Tap **+ Choose Image** to load photo.' },
        { label: 'Watermark Type', desc: 'Choose Text Watermark or Image Logo.' },
        { label: 'Apply', desc: 'Tap **Apply Watermark** to stamp image.' },
        { label: 'Download', desc: 'Tap **Download Watermarked Image** to save.' }
      ]
    },
    'image-metadata-remover': {
      title: 'How to use Image Metadata Remover',
      steps: [
        { label: 'Add Images', desc: 'Tap **+ Add Images** to load photos.' },
        { label: 'Strip Privacy Data', desc: 'Tap **Strip Metadata 🛡️** to remove EXIF & GPS location tags.' },
        { label: 'Download', desc: 'Tap **Download Clean Images (ZIP)** to save.' }
      ]
    },
    'image-grayscale': {
      title: 'How to use Image Grayscale',
      steps: [
        { label: 'Upload Image', desc: 'Tap **+ Choose Image** to load photo.' },
        { label: 'Mode', desc: 'Select Standard B&W, High Contrast, Sepia, or Inverted.' },
        { label: 'Convert', desc: 'Tap **Convert to Grayscale** to process.' },
        { label: 'Download', desc: 'Tap **Download Image** to save.' }
      ]
    },
    'image-to-base64': {
      title: 'How to use Image to Base64',
      steps: [
        { label: 'Upload Image', desc: 'Tap **+ Choose Image** to load photo.' },
        { label: 'Encoded Strings', desc: 'Copy Data URI, Raw Base64 string, HTML tag, or CSS snippet.' },
        { label: 'Download', desc: 'Tap **💾 Download All as .txt** to save all text snippets.' }
      ]
    },
    'base64-to-image': {
      title: 'How to use Base64 to Image',
      steps: [
        { label: 'Paste String', desc: 'Paste Base64 or Data URI string into input box.' },
        { label: 'Decode', desc: 'Tap **Decode Image ⚡** to render preview.' },
        { label: 'Download', desc: 'Select output format (PNG/JPG) and tap **Download Decoded Image**.' }
      ]
    },
    'image-color-picker': {
      title: 'How to use Image Color Picker',
      steps: [
        { label: 'Upload Image', desc: 'Tap **+ Choose Image** to load photo.' },
        { label: 'Sample Pixel', desc: 'Tap any pixel on canvas using loupe magnifier.' },
        { label: 'Copy Code', desc: 'Tap **Copy HEX Code**, **Copy RGB**, or **Copy HSL**.' }
      ]
    },
    'image-preview-tool': {
      title: 'How to use Image Preview Tool',
      steps: [
        { label: 'Upload Image', desc: 'Tap **+ Choose Image** to inspect file.' },
        { label: 'Inspect Controls', desc: 'Use **+**, **-**, **1:1**, **Fit**, and rotation buttons to analyze metrics.' }
      ]
    },
    'webp-to-jpg': {
      title: 'How to use WebP to JPG',
      steps: [
        { label: 'Add WebP Files', desc: 'Tap **+ Add Images** to choose WebP files.' },
        { label: 'Convert', desc: 'Tap **Convert Format** to generate JPG photos.' },
        { label: 'Download', desc: 'Tap **Download All (ZIP)** to save converted files.' }
      ]
    },
    'webp-to-png': {
      title: 'How to use WebP to PNG',
      steps: [
        { label: 'Add WebP Files', desc: 'Tap **+ Add Images** to choose WebP files.' },
        { label: 'Convert', desc: 'Tap **Convert Format** to generate PNG graphics.' },
        { label: 'Download', desc: 'Tap **Download All (ZIP)** to save converted files.' }
      ]
    },
    'jpg-to-webp': {
      title: 'How to use JPG to WebP',
      steps: [
        { label: 'Add JPG Files', desc: 'Tap **+ Add Images** to select JPEG photos.' },
        { label: 'Convert', desc: 'Tap **Convert Format** to generate WebP files.' },
        { label: 'Download', desc: 'Tap **Download All (ZIP)** to save.' }
      ]
    },
    'png-to-webp': {
      title: 'How to use PNG to WebP',
      steps: [
        { label: 'Add PNG Files', desc: 'Tap **+ Add Images** to select PNG graphics.' },
        { label: 'Convert', desc: 'Tap **Convert Format** to generate WebP files.' },
        { label: 'Download', desc: 'Tap **Download All (ZIP)** to save.' }
      ]
    },
    'gif-to-jpg': {
      title: 'How to use GIF to JPG',
      steps: [
        { label: 'Add GIF Files', desc: 'Tap **+ Add Images** to select GIF images.' },
        { label: 'Convert', desc: 'Tap **Convert Format** to render JPG photos.' },
        { label: 'Download', desc: 'Tap **Download All (ZIP)** to save.' }
      ]
    },
    'gif-to-png': {
      title: 'How to use GIF to PNG',
      steps: [
        { label: 'Add GIF Files', desc: 'Tap **+ Add Images** to select GIF graphics.' },
        { label: 'Convert', desc: 'Tap **Convert Format** to generate PNG images.' },
        { label: 'Download', desc: 'Tap **Download All (ZIP)** to save.' }
      ]
    },
    'bmp-to-jpg': {
      title: 'How to use BMP to JPG',
      steps: [
        { label: 'Add BMP Files', desc: 'Tap **+ Add Images** to select BMP bitmaps.' },
        { label: 'Convert', desc: 'Tap **Convert Format** to generate JPEG photos.' },
        { label: 'Download', desc: 'Tap **Download All (ZIP)** to save.' }
      ]
    },
    'bmp-to-png': {
      title: 'How to use BMP to PNG',
      steps: [
        { label: 'Add BMP Files', desc: 'Tap **+ Add Images** to select BMP graphics.' },
        { label: 'Convert', desc: 'Tap **Convert Format** to generate PNG files.' },
        { label: 'Download', desc: 'Tap **Download All (ZIP)** to save.' }
      ]
    },
    'svg-to-png': {
      title: 'How to use SVG to PNG',
      steps: [
        { label: 'Add SVG Files', desc: 'Tap **+ Add Images** to select SVG vectors.' },
        { label: 'Convert', desc: 'Tap **Convert Format** to rasterize PNG images.' },
        { label: 'Download', desc: 'Tap **Download All (ZIP)** to save.' }
      ]
    },
    'svg-to-jpg': {
      title: 'How to use SVG to JPG',
      steps: [
        { label: 'Add SVG Files', desc: 'Tap **+ Add Images** to select SVG vectors.' },
        { label: 'Convert', desc: 'Tap **Convert Format** to generate JPEG photos.' },
        { label: 'Download', desc: 'Tap **Download All (ZIP)** to save.' }
      ]
    },
    'zip-creator': {
      title: 'How to use ZIP File Creator',
      steps: [
        { label: 'Add Files', desc: 'Tap **+ Add Files** to select individual documents or images.' },
        { label: 'Set Archive Name', desc: 'Type custom archive name (e.g. `archive.zip`).' },
        { label: 'Compression Level', desc: 'Choose Standard Deflate (Level 6) or Store Only.' },
        { label: 'Build ZIP', desc: 'Tap **Create ZIP Archive** to compress.' },
        { label: 'Download', desc: 'Save generated `.zip` archive to your device.' }
      ]
    },
    'zip-extractor': {
      title: 'How to use ZIP File Extractor',
      steps: [
        { label: 'Select ZIP', desc: 'Tap **+ Select ZIP File** to inspect archive.' },
        { label: 'Inspect List', desc: 'Review list of compressed files and file sizes.' },
        { label: 'Unpack', desc: 'Tap **Unpack ZIP File** to extract all contents in browser memory.' }
      ]
    },
    'file-analyzer': {
      title: 'How to use File Size Analyzer',
      steps: [
        { label: 'Upload File', desc: 'Tap **+ Browse File** to select any file.' },
        { label: 'Inspect Metrics', desc: 'View formatted size, exact byte count, KB, MB, and MIME type.' },
        { label: 'SHA-256 Checksum', desc: 'Tap **Copy SHA-256 Hash** to copy cryptographic checksum.' }
      ]
    },
    'file-previewer': {
      title: 'How to use Universal File Previewer',
      steps: [
        { label: 'Select File', desc: 'Tap **+ Select File** to load PDF, image, text, JSON, or code.' },
        { label: 'Preview Content', desc: 'Use page navigation for PDFs, zoom for images, or scroll for text.' },
        { label: 'Download', desc: 'Tap **Download File** to save.' }
      ]
    },
    'file-renamer': {
      title: 'How to use Batch File Renamer',
      steps: [
        { label: 'Add Files', desc: 'Tap **+ Add Files** to select multiple files.' },
        { label: 'Configure Rule', desc: 'Enter Prefix, Suffix, Find & Replace, Casing, or Numbering.' },
        { label: 'Preview Changes', desc: 'Tap **Preview Changes** to check updated file names.' },
        { label: 'Rename & Save', desc: 'Tap **Rename Files** to download renamed ZIP package.' }
      ]
    },
    'batch-processor': {
      title: 'How to use Batch File Processor',
      steps: [
        { label: 'Add Files', desc: 'Tap **+ Add Files** to queue multiple documents or photos.' },
        { label: 'Batch Action', desc: 'Choose action (Compress Images, Convert to JPG/PNG/WebP, or ZIP Bundle).' },
        { label: 'Process', desc: 'Tap **Batch Process** to execute actions in parallel.' },
        { label: 'Download', desc: 'Tap **Download All (ZIP)** to save processed files.' }
      ]
    },
    'download-all-zip': {
      title: 'How to use Download All as ZIP',
      steps: [
        { label: 'Add Files', desc: 'Tap **+ Add Files** to select files to package.' },
        { label: 'Archive Name', desc: 'Enter desired archive name (e.g. `bundled-files.zip`).' },
        { label: 'Bundle', desc: 'Tap **Create ZIP Archive** to download package.' }
      ]
    },
    'image-to-pdf': {
      title: 'How to use Image to PDF',
      steps: [
        { label: 'Add Images', desc: 'Tap **+ Add Images** and select JPG, PNG, or WebP photos.' },
        { label: 'Arrange Pages', desc: 'Drag thumbnails or use reorder arrows to arrange page sequence.' },
        { label: 'Edit Images', desc: 'Tap **Edit** on an image to crop, rotate, flip, or apply filters.' },
        { label: 'Add Signature', desc: 'Tap **Add Signature** to upload & place a transparent signature.' },
        { label: 'Configure PDF', desc: 'Choose page size (A4/Letter), orientation, margins, and image placement.' },
        { label: 'Create PDF', desc: 'Tap **Create PDF Document** to build the final file.' },
        { label: 'Download', desc: 'Tap **Download PDF** to save your document.' }
      ]
    }
  };

  const FALLBACK_GUIDE = {
    title: 'How to use this tool',
    steps: [
      { label: 'Select File', desc: 'Tap the browse button to select or drop your file.' },
      { label: 'Choose Options', desc: 'Configure available tool options and settings.' },
      { label: 'Process File', desc: 'Tap the action button to process your file.' },
      { label: 'Download Result', desc: 'Tap the download button to save your processed file.' }
    ]
  };

  function getGuide(toolId) {
    if (!toolId) return FALLBACK_GUIDE;
    return GUIDES[toolId] || FALLBACK_GUIDE;
  }

  function renderGuide(toolId) {
    const guide = getGuide(toolId);
    const titleEl = document.getElementById('tool-guide-title');
    const stepsEl = document.getElementById('tool-guide-steps');
    const detailsEl = document.getElementById('tool-guide-details');

    if (titleEl) {
      titleEl.textContent = guide.title;
    }

    if (stepsEl) {
      stepsEl.innerHTML = '';
      guide.steps.forEach((step, index) => {
        const li = document.createElement('li');
        li.className = 'guide-step-item';
        
        // Format markdown bold text inside desc (e.g. **+ Choose PDF**)
        const formattedDesc = step.desc.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        li.innerHTML = `
          <div class="guide-step-num">${index + 1}</div>
          <div class="guide-step-body">
            <div class="guide-step-label">${step.label}</div>
            <div class="guide-step-desc">${formattedDesc}</div>
          </div>
        `;
        stepsEl.appendChild(li);
      });
    }

    if (detailsEl) {
      detailsEl.open = false; // Collapsed by default
      detailsEl.setAttribute('aria-expanded', 'false');
    }
  }

  return {
    getGuide,
    renderGuide
  };
})();

window.ToolGuides = ToolGuides;
