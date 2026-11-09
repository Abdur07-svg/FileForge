/**
 * FileForge QR Designer - Frame & Composite Rendering Engine
 * Renders composite QR codes with 52 frame styles and customizable label typography.
 * Supports live preview synchronization and high-res export (PNG, SVG, Clipboard).
 */
const QRFrameRenderer = (() => {

  /**
   * Helper: Draw rounded rectangle path
   */
  function drawRoundRect(ctx, x, y, width, height, radius) {
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, radius);
      return;
    }
    // Fallback for older browsers
    let r = radius;
    if (typeof r === 'number') {
      r = { tl: r, tr: r, br: r, bl: r };
    } else {
      r = { tl: 0, tr: 0, br: 0, bl: 0, ...r };
    }
    ctx.beginPath();
    ctx.moveTo(x + r.tl, y);
    ctx.lineTo(x + width - r.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r.tr);
    ctx.lineTo(x + width, y + height - r.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r.br, y + height);
    ctx.lineTo(x + r.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r.bl);
    ctx.lineTo(x, y + r.tl);
    ctx.quadraticCurveTo(x, y, x + r.tl, y);
    ctx.closePath();
  }

  /**
   * Helper: Truncate / fit text on canvas
   */
  function fitText(ctx, text, maxWidth) {
    if (!text) return '';
    let str = String(text);
    if (ctx.measureText(str).width <= maxWidth) return str;
    while (str.length > 3 && ctx.measureText(str + '...').width > maxWidth) {
      str = str.slice(0, -1);
    }
    return str + '...';
  }

  /**
   * Calculate dimensions for label and frame
   */
  function computeLayout(qrWidth, qrHeight, framePreset, labelConfig) {
    const frameType = framePreset ? framePreset.type : 'none';
    const hasLabel = Boolean(labelConfig && labelConfig.text && labelConfig.text.trim().length > 0);
    const labelPos = (labelConfig && labelConfig.position) || 'bottom';
    const labelPad = (labelConfig && typeof labelConfig.padding === 'number') ? labelConfig.padding : 12;
    const labelFontSize = (labelConfig && labelConfig.fontSize) ? parseInt(labelConfig.fontSize, 10) : 16;
    const labelEstimatedH = hasLabel ? Math.round(labelFontSize * 1.5 + labelPad * 2) : 0;
    const labelEstimatedW = hasLabel ? Math.round(labelFontSize * 1.5 + labelPad * 2) : 0;

    // Base padding around the QR code inside the frame
    let padTop = 0;
    let padBottom = 0;
    let padLeft = 0;
    let padRight = 0;
    let headerHeight = 0;
    let footerHeight = 0;

    switch (frameType) {
      case 'none':
        padTop = 0;
        padBottom = 0;
        padLeft = 0;
        padRight = 0;
        break;

      case 'banner-bottom':
      case 'mega-cta':
      case 'scan-to-pay':
      case 'wifi-connect':
      case 'social-follow':
      case 'menu-dining':
      case 'feedback-star':
      case 'app-download':
        padTop = 20;
        padBottom = 16;
        padLeft = 20;
        padRight = 20;
        footerHeight = 54;
        break;

      case 'banner-top':
      case 'ribbon-top':
        padTop = 16;
        padBottom = 20;
        padLeft = 20;
        padRight = 20;
        headerHeight = 54;
        break;

      case 'card-rounded':
      case 'double-border':
      case 'floating-soft':
      case 'inset-bevel':
      case 'brutalist-shadow':
      case 'gradient-stroke':
        padTop = 22;
        padBottom = 20;
        padLeft = 22;
        padRight = 22;
        footerHeight = 44;
        break;

      case 'pill-bottom':
      case 'ribbon-bottom':
      case 'floating-tag':
        padTop = 20;
        padBottom = 18;
        padLeft = 20;
        padRight = 20;
        footerHeight = 48;
        break;

      case 'pill-top':
        padTop = 18;
        padBottom = 20;
        padLeft = 20;
        padRight = 20;
        headerHeight = 48;
        break;

      case 'phone-mockup':
        padTop = 38; // speaker & notch
        padBottom = 24;
        padLeft = 22;
        padRight = 22;
        footerHeight = 44;
        break;

      case 'tablet-bezel':
        padTop = 32;
        padBottom = 24;
        padLeft = 28;
        padRight = 28;
        footerHeight = 42;
        break;

      case 'polaroid':
        padTop = 22;
        padBottom = 18;
        padLeft = 22;
        padRight = 22;
        footerHeight = 72; // Wide polaroid writing area
        break;

      case 'browser-window':
        padTop = 20;
        padBottom = 20;
        padLeft = 20;
        padRight = 20;
        headerHeight = 48; // Traffic lights & title
        break;

      case 'terminal':
        padTop = 20;
        padBottom = 20;
        padLeft = 20;
        padRight = 20;
        headerHeight = 42;
        footerHeight = 36;
        break;

      case 'ticket-stub':
      case 'event-ticket':
      case 'boarding-pass':
      case 'dashed-coupon':
        padTop = 24;
        padBottom = 20;
        padLeft = 24;
        padRight = 24;
        headerHeight = 36;
        footerHeight = 48;
        break;

      case 'price-tag':
      case 'bookmark-tab':
        padTop = 42; // hanging hole / tab
        padBottom = 20;
        padLeft = 22;
        padRight = 22;
        footerHeight = 42;
        break;

      case 'id-lanyard':
      case 'conference-badge':
        padTop = 44; // slot cutout
        padBottom = 20;
        padLeft = 22;
        padRight = 22;
        headerHeight = 32;
        footerHeight = 44;
        break;

      default:
        padTop = 20;
        padBottom = 20;
        padLeft = 20;
        padRight = 20;
        footerHeight = 46;
        break;
    }

    // QR container box
    const frameContentW = qrWidth + padLeft + padRight;
    const frameContentH = qrHeight + padTop + padBottom + headerHeight + footerHeight;

    // Include label outer dimensions
    let totalW = frameContentW;
    let totalH = frameContentH;
    let labelOffsetX = 0;
    let labelOffsetY = 0;
    let frameOffsetX = 0;
    let frameOffsetY = 0;

    if (hasLabel) {
      if (labelPos === 'top') {
        totalH += labelEstimatedH;
        frameOffsetY = labelEstimatedH;
        labelOffsetX = 0;
        labelOffsetY = 0;
      } else if (labelPos === 'bottom') {
        totalH += labelEstimatedH;
        labelOffsetX = 0;
        labelOffsetY = frameContentH;
      } else if (labelPos === 'left') {
        totalW += labelEstimatedW;
        frameOffsetX = labelEstimatedW;
        labelOffsetX = 0;
        labelOffsetY = 0;
      } else if (labelPos === 'right') {
        totalW += labelEstimatedW;
        labelOffsetX = frameContentW;
        labelOffsetY = 0;
      }
    }

    return {
      totalW,
      totalH,
      frameContentW,
      frameContentH,
      frameOffsetX,
      frameOffsetY,
      labelOffsetX,
      labelOffsetY,
      qrX: frameOffsetX + padLeft,
      qrY: frameOffsetY + padTop + headerHeight,
      padTop,
      padBottom,
      padLeft,
      padRight,
      headerHeight,
      footerHeight,
      hasLabel,
      labelPos,
      labelEstimatedH,
      labelEstimatedW
    };
  }

  /**
   * Main Composite Rendering Function
   */
  function renderComposite(qrCanvas, framePreset, frameOptions = {}, labelConfig = {}) {
    if (!qrCanvas) return null;

    const qrW = qrCanvas.width || 320;
    const qrH = qrCanvas.height || 320;
    const frameType = framePreset ? framePreset.type : 'none';

    // Theme and styling values
    const frameColor = frameOptions.color || '#121214';
    const frameTextColor = frameOptions.textColor || '#FFFFFF';
    const frameBg = frameOptions.bgColor || '#FFFFFF';
    const frameText = frameOptions.text !== undefined ? frameOptions.text : (framePreset ? framePreset.defaultText : 'SCAN ME');

    // Layout
    const layout = computeLayout(qrW, qrH, framePreset, labelConfig);

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(layout.totalW);
    canvas.height = Math.round(layout.totalH);
    const ctx = canvas.getContext('2d');
    if (!ctx) return qrCanvas;

    // 1. Draw canvas outer background
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const fx = layout.frameOffsetX;
    const fy = layout.frameOffsetY;
    const fw = layout.frameContentW;
    const fh = layout.frameContentH;

    // 2. Draw Frame Background & Decorations
    if (frameType !== 'none') {
      drawFrameDecorations(ctx, frameType, fx, fy, fw, fh, frameColor, frameBg, frameTextColor, frameText, layout, qrW, qrH);
    }

    // 3. Draw QR Code into Aperture
    ctx.drawImage(qrCanvas, layout.qrX, layout.qrY, qrW, qrH);

    // 4. Draw Label Text if present
    if (layout.hasLabel) {
      drawLabelText(ctx, labelConfig, layout, canvas.width, canvas.height);
    }

    return canvas;
  }

  /**
   * Draw individual frame graphics based on type
   */
  function drawFrameDecorations(ctx, type, x, y, w, h, color, bg, textColor, text, layout, qrW, qrH) {
    ctx.save();

    const cornerRadius = 16;

    // Common card background
    if (type !== 'terminal' && type !== 'brutalist-shadow') {
      ctx.fillStyle = bg;
      drawRoundRect(ctx, x, y, w, h, cornerRadius);
      ctx.fill();
    }

    switch (type) {
      case 'banner-bottom':
      case 'mega-cta':
      case 'scan-to-pay':
      case 'wifi-connect':
      case 'social-follow':
      case 'menu-dining':
      case 'feedback-star':
      case 'app-download': {
        // Card border
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 2;
        drawRoundRect(ctx, x + 1, y + 1, w - 2, h - 2, cornerRadius);
        ctx.stroke();

        // Bottom banner
        const bannerH = layout.footerHeight;
        const bannerY = y + h - bannerH;
        ctx.fillStyle = color;
        drawRoundRect(ctx, x, bannerY, w, bannerH, { tl: 0, tr: 0, bl: cornerRadius, br: cornerRadius });
        ctx.fill();

        // Icon + Text
        ctx.fillStyle = textColor;
        ctx.font = 'bold 15px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let displayText = text || 'SCAN ME';
        let prefixIcon = '';
        if (type === 'scan-to-pay') prefixIcon = '💳 ';
        else if (type === 'wifi-connect') prefixIcon = '📶 ';
        else if (type === 'social-follow') prefixIcon = '★ ';
        else if (type === 'menu-dining') prefixIcon = '🍽 ';
        else if (type === 'feedback-star') prefixIcon = '★ ';
        else if (type === 'app-download') prefixIcon = '↓ ';
        else if (type === 'mega-cta') prefixIcon = '📷 ';

        displayText = fitText(ctx, prefixIcon + displayText, w - 24);
        ctx.fillText(displayText, x + w / 2, bannerY + bannerH / 2);
        break;
      }

      case 'banner-top':
      case 'ribbon-top': {
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 2;
        drawRoundRect(ctx, x + 1, y + 1, w - 2, h - 2, cornerRadius);
        ctx.stroke();

        const bannerH = layout.headerHeight;
        ctx.fillStyle = color;
        drawRoundRect(ctx, x, y, w, bannerH, { tl: cornerRadius, tr: cornerRadius, bl: 0, br: 0 });
        ctx.fill();

        ctx.fillStyle = textColor;
        ctx.font = 'bold 15px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(fitText(ctx, text || 'SPECIAL OFFER', w - 24), x + w / 2, y + bannerH / 2);
        break;
      }

      case 'card-rounded':
      case 'floating-soft': {
        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 2;
        drawRoundRect(ctx, x + 1, y + 1, w - 2, h - 2, 22);
        ctx.stroke();

        if (text) {
          const pillW = Math.min(w - 48, 170);
          const pillH = 34;
          const pillX = x + (w - pillW) / 2;
          const pillY = y + h - layout.footerHeight + (layout.footerHeight - pillH) / 2;

          ctx.fillStyle = color;
          drawRoundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
          ctx.fill();

          ctx.fillStyle = textColor;
          ctx.font = 'bold 13px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(fitText(ctx, text, pillW - 16), pillX + pillW / 2, pillY + pillH / 2);
        }
        break;
      }

      case 'double-border': {
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        drawRoundRect(ctx, x + 4, y + 4, w - 8, h - 8, 14);
        ctx.stroke();

        ctx.lineWidth = 1.5;
        drawRoundRect(ctx, x + 10, y + 10, w - 20, h - 20, 10);
        ctx.stroke();

        if (text) {
          const pillW = Math.min(w - 60, 160);
          const pillH = 32;
          const pillX = x + (w - pillW) / 2;
          const pillY = y + h - layout.footerHeight + 4;

          ctx.fillStyle = color;
          drawRoundRect(ctx, pillX, pillY, pillW, pillH, 8);
          ctx.fill();

          ctx.fillStyle = textColor;
          ctx.font = 'bold 13px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(fitText(ctx, text, pillW - 14), pillX + pillW / 2, pillY + pillH / 2);
        }
        break;
      }

      case 'pill-bottom':
      case 'floating-tag': {
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 2;
        drawRoundRect(ctx, x + 2, y + 2, w - 4, h - layout.footerHeight + 10, 18);
        ctx.stroke();

        const pillW = Math.min(w - 40, 180);
        const pillH = 36;
        const pillX = x + (w - pillW) / 2;
        const pillY = y + h - pillH - 4;

        ctx.fillStyle = color;
        drawRoundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
        ctx.fill();

        ctx.fillStyle = textColor;
        ctx.font = 'bold 13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(fitText(ctx, text || 'SCAN ME', pillW - 20), pillX + pillW / 2, pillY + pillH / 2);
        break;
      }

      case 'pill-top': {
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 2;
        drawRoundRect(ctx, x + 2, y + layout.headerHeight - 10, w - 4, h - layout.headerHeight + 8, 18);
        ctx.stroke();

        const pillW = Math.min(w - 40, 180);
        const pillH = 36;
        const pillX = x + (w - pillW) / 2;
        const pillY = y + 4;

        ctx.fillStyle = color;
        drawRoundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
        ctx.fill();

        ctx.fillStyle = textColor;
        ctx.font = 'bold 13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(fitText(ctx, text || 'SCAN ME', pillW - 20), pillX + pillW / 2, pillY + pillH / 2);
        break;
      }

      case 'phone-mockup': {
        // Phone body
        ctx.fillStyle = '#0F172A';
        drawRoundRect(ctx, x, y, w, h, 28);
        ctx.fill();

        // Phone screen bezel
        ctx.fillStyle = bg;
        drawRoundRect(ctx, x + 10, y + 10, w - 20, h - 20, 20);
        ctx.fill();

        // Speaker slot & camera
        ctx.fillStyle = '#334155';
        drawRoundRect(ctx, x + w / 2 - 25, y + 16, 50, 5, 2.5);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + w / 2 + 35, y + 18.5, 3, 0, Math.PI * 2);
        ctx.fill();

        // Phone bottom bar / CTA
        const btnY = y + h - layout.footerHeight;
        ctx.fillStyle = color;
        drawRoundRect(ctx, x + 24, btnY + 4, w - 48, 32, 16);
        ctx.fill();

        ctx.fillStyle = textColor;
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(fitText(ctx, text || 'SCAN WITH PHONE', w - 60), x + w / 2, btnY + 20);
        break;
      }

      case 'polaroid': {
        // White polaroid card with subtle drop border
        ctx.fillStyle = '#FFFFFF';
        drawRoundRect(ctx, x, y, w, h, 8);
        ctx.fill();
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 1.5;
        drawRoundRect(ctx, x, y, w, h, 8);
        ctx.stroke();

        // Handwritten / casual title at bottom
        ctx.fillStyle = color;
        ctx.font = '600 18px "Georgia", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(fitText(ctx, text || 'Scan to View', w - 32), x + w / 2, y + h - 36);
        break;
      }

      case 'browser-window': {
        // Browser header
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 2;
        drawRoundRect(ctx, x + 1, y + 1, w - 2, h - 2, 14);
        ctx.stroke();

        // Header strip
        ctx.fillStyle = '#F1F5F9';
        drawRoundRect(ctx, x, y, w, layout.headerHeight, { tl: 14, tr: 14, bl: 0, br: 0 });
        ctx.fill();
        ctx.strokeStyle = '#E2E8F0';
        ctx.beginPath();
        ctx.moveTo(x, y + layout.headerHeight);
        ctx.lineTo(x + w, y + layout.headerHeight);
        ctx.stroke();

        // Traffic dots
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(x + 18, y + 24, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(x + 34, y + 24, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#10B981';
        ctx.beginPath();
        ctx.arc(x + 50, y + 24, 5, 0, Math.PI * 2);
        ctx.fill();

        // Search address bar in browser
        const barW = w - 120;
        const barH = 26;
        const barX = x + 70;
        const barY = y + 11;
        ctx.fillStyle = '#FFFFFF';
        drawRoundRect(ctx, barX, barY, barW, barH, 13);
        ctx.fill();
        ctx.strokeStyle = '#CBD5E1';
        ctx.stroke();

        ctx.fillStyle = '#475569';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(fitText(ctx, text || 'https://fileforge.com', barW - 16), barX + barW / 2, barY + barH / 2);
        break;
      }

      case 'terminal': {
        // Dark retro terminal
        ctx.fillStyle = '#090D16';
        drawRoundRect(ctx, x, y, w, h, 14);
        ctx.fill();

        // Header bar
        ctx.fillStyle = '#1E293B';
        drawRoundRect(ctx, x, y, w, layout.headerHeight, { tl: 14, tr: 14, bl: 0, br: 0 });
        ctx.fill();

        // Traffic dots
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(x + 18, y + 21, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(x + 32, y + 21, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#10B981';
        ctx.beginPath();
        ctx.arc(x + 46, y + 21, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Terminal prompt title
        ctx.fillStyle = '#38BDF8';
        ctx.font = 'bold 12px "Courier New", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(fitText(ctx, text || '> scan_qr.sh', w - 80), x + 62, y + 21);

        // Footer command prompt
        ctx.fillStyle = '#4ADE80';
        ctx.font = '12px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('> ready for scan _', x + w / 2, y + h - 18);
        break;
      }

      case 'brutalist-shadow': {
        // Neo-brutalist offset solid black drop shadow
        ctx.fillStyle = '#000000';
        drawRoundRect(ctx, x + 8, y + 8, w - 8, h - 8, 4);
        ctx.fill();

        ctx.fillStyle = bg;
        drawRoundRect(ctx, x, y, w - 8, h - 8, 4);
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3.5;
        drawRoundRect(ctx, x, y, w - 8, h - 8, 4);
        ctx.stroke();

        // Bottom brutalist banner
        const bW = w - 8;
        const bH = layout.footerHeight;
        const bY = y + h - 8 - bH;
        ctx.fillStyle = color;
        drawRoundRect(ctx, x, bY, bW, bH, 0);
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, bY, bW, bH);

        ctx.fillStyle = textColor;
        ctx.font = '900 15px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(fitText(ctx, text || 'SCAN CODE', bW - 20), x + bW / 2, bY + bH / 2);
        break;
      }

      case 'dashed-coupon':
      case 'ticket-stub': {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([8, 6]);
        drawRoundRect(ctx, x + 2, y + 2, w - 4, h - 4, 12);
        ctx.stroke();
        ctx.setLineDash([]);

        // Cut notches
        ctx.fillStyle = '#F8FAFC';
        ctx.beginPath();
        ctx.arc(x, y + h / 2, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + w, y + h / 2, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = color;
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(fitText(ctx, text || 'COUPON ✂', w - 40), x + w / 2, y + h - layout.footerHeight / 2);
        break;
      }

      case 'neon-glow': {
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.shadowColor = color;
        ctx.shadowBlur = 14;
        drawRoundRect(ctx, x + 4, y + 4, w - 8, h - 8, 16);
        ctx.stroke();
        ctx.shadowBlur = 0; // reset

        const pillW = Math.min(w - 48, 170);
        const pillH = 34;
        const pillX = x + (w - pillW) / 2;
        const pillY = y + h - layout.footerHeight + (layout.footerHeight - pillH) / 2;

        ctx.fillStyle = color;
        drawRoundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
        ctx.fill();

        ctx.fillStyle = textColor;
        ctx.font = 'bold 13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(fitText(ctx, text || 'CYBER SCAN', pillW - 16), pillX + pillW / 2, pillY + pillH / 2);
        break;
      }

      case 'corner-notches':
      case 'corner-brackets':
      case 'viewfinder': {
        ctx.strokeStyle = color;
        ctx.lineWidth = 3.5;
        const arm = 24;

        // Top-left
        ctx.beginPath();
        ctx.moveTo(x + 6, y + 6 + arm);
        ctx.lineTo(x + 6, y + 6);
        ctx.lineTo(x + 6 + arm, y + 6);
        ctx.stroke();

        // Top-right
        ctx.beginPath();
        ctx.moveTo(x + w - 6 - arm, y + 6);
        ctx.lineTo(x + w - 6, y + 6);
        ctx.lineTo(x + w - 6, y + 6 + arm);
        ctx.stroke();

        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(x + 6, y + h - 6 - arm);
        ctx.lineTo(x + 6, y + h - 6);
        ctx.lineTo(x + 6 + arm, y + h - 6);
        ctx.stroke();

        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(x + w - 6 - arm, y + h - 6);
        ctx.lineTo(x + w - 6, y + h - 6);
        ctx.lineTo(x + w - 6, y + h - 6 - arm);
        ctx.stroke();

        if (text) {
          ctx.fillStyle = color;
          ctx.font = 'bold 13px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(fitText(ctx, `[ ${text} ]`, w - 40), x + w / 2, y + h - layout.footerHeight / 2);
        }
        break;
      }

      default: {
        // General card with styled footer badge
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 2;
        drawRoundRect(ctx, x + 1, y + 1, w - 2, h - 2, cornerRadius);
        ctx.stroke();

        if (text) {
          const bannerH = layout.footerHeight;
          const bannerY = y + h - bannerH;
          ctx.fillStyle = color;
          drawRoundRect(ctx, x, bannerY, w, bannerH, { tl: 0, tr: 0, bl: cornerRadius, br: cornerRadius });
          ctx.fill();

          ctx.fillStyle = textColor;
          ctx.font = 'bold 14px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(fitText(ctx, text, w - 24), x + w / 2, bannerY + bannerH / 2);
        }
        break;
      }
    }

    ctx.restore();
  }

  /**
   * Draw customizable label text at specified position
   */
  function drawLabelText(ctx, labelConfig, layout, canvasW, canvasH) {
    if (!labelConfig || !labelConfig.text || !labelConfig.text.trim()) return;

    ctx.save();

    const text = String(labelConfig.text).trim();
    const pos = labelConfig.position || 'bottom';
    const fontSize = parseInt(labelConfig.fontSize, 10) || 16;
    const fontFamily = labelConfig.fontFamily || 'Inter, sans-serif';
    const fontWeight = labelConfig.fontWeight || '600';
    const textColor = labelConfig.textColor || '#121214';
    const bgColor = labelConfig.bgColor || 'transparent';
    const align = labelConfig.align || 'center';
    const pad = typeof labelConfig.padding === 'number' ? labelConfig.padding : 12;

    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'middle';

    if (pos === 'top') {
      const boxH = layout.labelEstimatedH;
      if (bgColor && bgColor !== 'transparent') {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvasW, boxH);
      }
      ctx.fillStyle = textColor;
      let textX = canvasW / 2;
      if (align === 'left') {
        ctx.textAlign = 'left';
        textX = Math.max(pad * 2, 12);
      } else if (align === 'right') {
        ctx.textAlign = 'right';
        textX = canvasW - Math.max(pad * 2, 12);
      } else {
        ctx.textAlign = 'center';
        textX = canvasW / 2;
      }
      ctx.fillText(fitText(ctx, text, canvasW - pad * 2), textX, boxH / 2);

    } else if (pos === 'bottom') {
      const boxY = layout.labelOffsetY;
      const boxH = layout.labelEstimatedH;
      if (bgColor && bgColor !== 'transparent') {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, boxY, canvasW, boxH);
      }
      ctx.fillStyle = textColor;
      let textX = canvasW / 2;
      if (align === 'left') {
        ctx.textAlign = 'left';
        textX = Math.max(pad * 2, 12);
      } else if (align === 'right') {
        ctx.textAlign = 'right';
        textX = canvasW - Math.max(pad * 2, 12);
      } else {
        ctx.textAlign = 'center';
        textX = canvasW / 2;
      }
      ctx.fillText(fitText(ctx, text, canvasW - pad * 2), textX, boxY + boxH / 2);

    } else if (pos === 'left') {
      const boxW = layout.frameOffsetX;
      if (bgColor && bgColor !== 'transparent') {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, boxW, canvasH);
      }
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.save();
      ctx.translate(boxW / 2, canvasH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(fitText(ctx, text, canvasH - pad * 2), 0, 0);
      ctx.restore();

    } else if (pos === 'right') {
      const boxX = layout.labelOffsetX;
      const boxW = canvasW - boxX;
      if (bgColor && bgColor !== 'transparent') {
        ctx.fillStyle = bgColor;
        ctx.fillRect(boxX, 0, boxW, canvasH);
      }
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.save();
      ctx.translate(boxX + boxW / 2, canvasH / 2);
      ctx.rotate(Math.PI / 2);
      ctx.fillText(fitText(ctx, text, canvasH - pad * 2), 0, 0);
      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Fast SVG Generator for 45 Style Preset Thumbnails
   * Generates clean visual QR thumbnail SVGs
   */
  function generateStyleThumbnailSvg(preset) {
    const fg = preset.fgColor || '#121214';
    const bg = preset.bgColor || '#FFFFFF';
    const eye = preset.eyeColor || fg;

    // Corner square path according to preset.cornerSq
    let sqPath = (cx, cy) => `<rect x="${cx - 6}" y="${cy - 6}" width="12" height="12" fill="none" stroke="${eye}" stroke-width="2.5"/>`;
    if (preset.cornerSq === 'dot') {
      sqPath = (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="6.2" fill="none" stroke="${eye}" stroke-width="2.5"/>`;
    } else if (preset.cornerSq === 'extra-rounded') {
      sqPath = (cx, cy) => `<rect x="${cx - 6}" y="${cy - 6}" width="12" height="12" rx="4" fill="none" stroke="${eye}" stroke-width="2.5"/>`;
    }

    // Corner dot path
    let dotPath = (cx, cy) => `<rect x="${cx - 2.5}" y="${cy - 2.5}" width="5" height="5" fill="${eye}"/>`;
    if (preset.cornerDot === 'dot') {
      dotPath = (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="2.8" fill="${eye}"/>`;
    }

    // Body module path according to preset.pattern
    let mod = (x, y) => `<rect x="${x}" y="${y}" width="2.4" height="2.4" fill="${fg}"/>`;
    if (preset.pattern === 'dots') {
      mod = (x, y) => `<circle cx="${x + 1.2}" cy="${y + 1.2}" r="1.2" fill="${fg}"/>`;
    } else if (preset.pattern === 'rounded' || preset.pattern === 'extra-rounded') {
      mod = (x, y) => `<rect x="${x}" y="${y}" width="2.4" height="2.4" rx="0.8" fill="${fg}"/>`;
    } else if (preset.pattern === 'classy' || preset.pattern === 'classy-rounded') {
      mod = (x, y) => `<polygon points="${x + 1.2},${y} ${x + 2.4},${y + 1.2} ${x + 1.2},${y + 2.4} ${x},${y + 1.2}" fill="${fg}"/>`;
    }

    const svg = `
      <svg viewBox="0 0 48 48" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="border-radius: 6px; background: ${bg};">
        <rect width="48" height="48" fill="${bg}" rx="6"/>
        <!-- Finder TL -->
        ${sqPath(11, 11)}
        ${dotPath(11, 11)}
        <!-- Finder TR -->
        ${sqPath(37, 11)}
        ${dotPath(37, 11)}
        <!-- Finder BL -->
        ${sqPath(11, 37)}
        ${dotPath(11, 37)}

        <!-- Data modules sample matrix -->
        ${mod(20, 8)} ${mod(24, 8)} ${mod(28, 8)}
        ${mod(20, 12)} ${mod(28, 12)}
        ${mod(8, 20)} ${mod(12, 20)} ${mod(16, 20)} ${mod(20, 20)} ${mod(24, 20)} ${mod(28, 20)} ${mod(32, 20)} ${mod(36, 20)} ${mod(40, 20)}
        ${mod(20, 24)} ${mod(24, 24)} ${mod(32, 24)} ${mod(36, 24)}
        ${mod(8, 28)} ${mod(16, 28)} ${mod(24, 28)} ${mod(28, 28)} ${mod(36, 28)} ${mod(40, 28)}
        ${mod(20, 32)} ${mod(24, 32)} ${mod(28, 32)} ${mod(36, 32)}
        ${mod(20, 36)} ${mod(28, 36)} ${mod(32, 36)} ${mod(36, 36)}
        ${mod(20, 40)} ${mod(24, 40)} ${mod(32, 40)} ${mod(40, 40)}
      </svg>
    `;

    return svg.trim();
  }

  /**
   * Fast SVG Generator for 52 Frame Preset Thumbnails
   */
  function generateFrameThumbnailSvg(framePreset) {
    const type = framePreset.type;
    const name = framePreset.name;
    const text = (framePreset.defaultText || 'SCAN').toUpperCase();

    const miniQr = (x, y, s = 0.42, color = '#334155') => `
      <g transform="translate(${x}, ${y}) scale(${s})">
        <rect x="0" y="0" width="14" height="14" rx="2" fill="none" stroke="${color}" stroke-width="2.6"/>
        <rect x="4" y="4" width="6" height="6" fill="${color}"/>
        <rect x="34" y="0" width="14" height="14" rx="2" fill="none" stroke="${color}" stroke-width="2.6"/>
        <rect x="38" y="4" width="6" height="6" fill="${color}"/>
        <rect x="0" y="34" width="14" height="14" rx="2" fill="none" stroke="${color}" stroke-width="2.6"/>
        <rect x="4" y="38" width="6" height="6" fill="${color}"/>
        <rect x="18" y="2" width="12" height="3.5" rx="0.5" fill="${color}"/>
        <rect x="18" y="9" width="4" height="4" rx="0.5" fill="${color}"/>
        <rect x="26" y="9" width="4" height="4" rx="0.5" fill="${color}"/>
        <rect x="2" y="18" width="12" height="3.5" rx="0.5" fill="${color}"/>
        <rect x="18" y="16" width="12" height="12" rx="1" fill="${color}"/>
        <rect x="34" y="18" width="12" height="4" rx="0.5" fill="${color}"/>
        <rect x="2" y="26" width="4" height="4" rx="0.5" fill="${color}"/>
        <rect x="10" y="26" width="4" height="4" rx="0.5" fill="${color}"/>
        <rect x="34" y="25" width="12" height="4" rx="0.5" fill="${color}"/>
        <rect x="18" y="34" width="12" height="4" rx="0.5" fill="${color}"/>
        <rect x="20" y="42" width="8" height="4" rx="0.5" fill="${color}"/>
        <rect x="34" y="34" width="6" height="12" rx="0.5" fill="${color}"/>
        <rect x="44" y="42" width="4" height="4" rx="0.5" fill="${color}"/>
      </g>
    `;

    let content = '';

    switch (type) {
      case 'none':
        content = `
          <rect x="4" y="4" width="40" height="40" rx="6" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.2"/>
          ${miniQr(14, 14, 0.42)}
        `;
        break;

      case 'banner-bottom':
      case 'mega-cta':
      case 'app-download':
        content = `
          <rect x="4" y="3" width="40" height="42" rx="5" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.2"/>
          <path d="M 4 33 H 44 V 40 C 44 42.8 41.8 45 39 45 H 9 C 6.2 45 4 42.8 4 40 Z" fill="#1E293B"/>
          <text x="24" y="40" fill="#FFFFFF" font-size="4.2" font-weight="bold" font-family="sans-serif" text-anchor="middle">${text.slice(0, 8)}</text>
          ${miniQr(14, 9, 0.42)}
        `;
        break;

      case 'banner-top':
        content = `
          <rect x="4" y="3" width="40" height="42" rx="5" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.2"/>
          <path d="M 4 8 C 4 5.2 6.2 3 9 3 H 39 C 41.8 3 44 5.2 44 8 V 14 H 4 Z" fill="#1E293B"/>
          <text x="24" y="10" fill="#FFFFFF" font-size="4.2" font-weight="bold" font-family="sans-serif" text-anchor="middle">${text.slice(0, 8)}</text>
          ${miniQr(14, 19, 0.42)}
        `;
        break;

      case 'card-rounded':
      case 'floating-soft':
        content = `
          <rect x="4" y="3" width="40" height="42" rx="8" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>
          <rect x="12" y="35" width="24" height="6.5" rx="3.25" fill="#1E293B"/>
          <text x="24" y="39.5" fill="#FFFFFF" font-size="3.5" font-weight="bold" font-family="sans-serif" text-anchor="middle">${text.slice(0, 9)}</text>
          ${miniQr(14, 9, 0.42)}
        `;
        break;

      case 'double-border':
        content = `
          <rect x="4" y="3" width="40" height="42" rx="5" fill="#FFFFFF" stroke="#1E293B" stroke-width="1.5"/>
          <rect x="7" y="6" width="34" height="36" rx="3" fill="none" stroke="#1E293B" stroke-width="0.8"/>
          <rect x="13" y="34.5" width="22" height="5.5" rx="2" fill="#1E293B"/>
          <text x="24" y="38.5" fill="#FFFFFF" font-size="3.2" font-weight="bold" font-family="sans-serif" text-anchor="middle">${text.slice(0, 7)}</text>
          ${miniQr(14, 11, 0.40)}
        `;
        break;

      case 'pill-bottom':
      case 'floating-tag':
        content = `
          <rect x="4" y="3" width="40" height="36" rx="6" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.2"/>
          <rect x="11" y="35" width="26" height="7" rx="3.5" fill="#1E293B"/>
          <text x="24" y="39.8" fill="#FFFFFF" font-size="3.6" font-weight="bold" font-family="sans-serif" text-anchor="middle">${text.slice(0, 8)}</text>
          ${miniQr(14, 9, 0.42)}
        `;
        break;

      case 'pill-top':
        content = `
          <rect x="4" y="9" width="40" height="36" rx="6" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.2"/>
          <rect x="11" y="5" width="26" height="7" rx="3.5" fill="#1E293B"/>
          <text x="24" y="9.8" fill="#FFFFFF" font-size="3.6" font-weight="bold" font-family="sans-serif" text-anchor="middle">${text.slice(0, 8)}</text>
          ${miniQr(14, 18, 0.42)}
        `;
        break;

      case 'corner-notches':
      case 'corner-brackets':
        content = `
          <rect x="4" y="4" width="40" height="40" rx="4" fill="#FFFFFF"/>
          <path d="M 6 13 V 6 H 13 M 35 6 H 42 V 13 M 6 35 V 42 H 13 M 35 42 H 42 V 35" fill="none" stroke="#1E293B" stroke-width="2"/>
          ${miniQr(14, 14, 0.42)}
        `;
        break;

      case 'viewfinder':
        content = `
          <rect x="4" y="4" width="40" height="40" rx="4" fill="#FFFFFF"/>
          <path d="M 6 12 V 6 H 12 M 36 6 H 42 V 12 M 6 36 V 42 H 12 M 36 42 H 42 V 36" fill="none" stroke="#EF4444" stroke-width="2"/>
          <circle cx="24" cy="24" r="2" fill="none" stroke="#EF4444" stroke-width="1"/>
          ${miniQr(14, 14, 0.42)}
        `;
        break;

      case 'ribbon-bottom':
        content = `
          <rect x="4" y="3" width="40" height="37" rx="5" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.2"/>
          <polygon points="6,36 10,33 42,33 38,36 42,39 10,39" fill="#1E293B"/>
          <rect x="10" y="33" width="28" height="7" rx="1.5" fill="#1E293B"/>
          <text x="24" y="38" fill="#FFFFFF" font-size="3.5" font-weight="bold" font-family="sans-serif" text-anchor="middle">${text.slice(0, 8)}</text>
          ${miniQr(14, 8, 0.42)}
        `;
        break;

      case 'ribbon-top':
        content = `
          <rect x="4" y="8" width="40" height="37" rx="5" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.2"/>
          <rect x="10" y="4" width="28" height="7" rx="1.5" fill="#1E293B"/>
          <text x="24" y="9" fill="#FFFFFF" font-size="3.5" font-weight="bold" font-family="sans-serif" text-anchor="middle">${text.slice(0, 8)}</text>
          ${miniQr(14, 18, 0.42)}
        `;
        break;

      case 'ticket-stub':
      case 'event-ticket':
        content = `
          <path d="M 4 8 C 4 5.5 6 3.5 8.5 3.5 H 39.5 C 42 3.5 44 5.5 44 8 V 20 A 4 4 0 0 0 44 28 V 40 C 44 42.5 42 44.5 39.5 44.5 H 8.5 C 6 44.5 4 42.5 4 40 V 28 A 4 4 0 0 0 4 20 Z" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.2"/>
          <line x1="8" y1="34" x2="40" y2="34" stroke="#CBD5E1" stroke-width="1" stroke-dasharray="2,2"/>
          <text x="24" y="40.5" fill="#64748B" font-size="3.5" font-weight="bold" font-family="sans-serif" text-anchor="middle">${text.slice(0, 8)}</text>
          ${miniQr(14, 9, 0.42)}
        `;
        break;

      case 'corner-flag':
        content = `
          <rect x="4" y="4" width="40" height="40" rx="5" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.2"/>
          <polygon points="28,4 44,4 44,20" fill="#EF4444"/>
          <text x="39" y="11" fill="#FFFFFF" font-size="3" font-weight="bold" font-family="sans-serif" text-anchor="middle" transform="rotate(45, 39, 11)">SALE</text>
          ${miniQr(13, 14, 0.40)}
        `;
        break;

      case 'price-tag':
        content = `
          <polygon points="12,3 36,3 44,11 44,45 4,45 4,11" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.2"/>
          <circle cx="24" cy="7" r="2.2" fill="#94A3B8"/>
          <rect x="12" y="37" width="24" height="5" rx="2.5" fill="#1E293B"/>
          <text x="24" y="40.8" fill="#FFFFFF" font-size="3" font-weight="bold" font-family="sans-serif" text-anchor="middle">${text.slice(0, 8)}</text>
          ${miniQr(14, 12, 0.42)}
        `;
        break;

      case 'bookmark-tab':
        content = `
          <rect x="5" y="8" width="38" height="37" rx="4" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.2"/>
          <polygon points="10,2 22,2 22,12 16,9 10,12" fill="#2563EB"/>
          <text x="24" y="40" fill="#1E293B" font-size="3.5" font-weight="bold" font-family="sans-serif" text-anchor="middle">${text.slice(0, 8)}</text>
          ${miniQr(14, 14, 0.42)}
        `;
        break;

      case 'seal-badge':
      case 'circle-ring':
        content = `
          <circle cx="24" cy="24" r="21" fill="#FFFFFF" stroke="#1E293B" stroke-width="2"/>
          <circle cx="24" cy="24" r="18" fill="none" stroke="#D97706" stroke-width="1" stroke-dasharray="2,2"/>
          ${miniQr(14, 14, 0.42)}
        `;
        break;

      case 'phone-mockup':
        content = `
          <rect x="8" y="2" width="32" height="44" rx="6" fill="#0F172A"/>
          <rect x="10" y="5" width="28" height="38" rx="4" fill="#FFFFFF"/>
          <rect x="21" y="3" width="6" height="1.2" rx="0.6" fill="#64748B"/>
          <rect x="13" y="36.5" width="22" height="4.5" rx="2.25" fill="#2563EB"/>
          <text x="24" y="39.8" fill="#FFFFFF" font-size="3.2" font-weight="bold" font-family="sans-serif" text-anchor="middle">SCAN</text>
          ${miniQr(14, 10, 0.42)}
        `;
        break;

      case 'tablet-bezel':
        content = `
          <rect x="4" y="4" width="40" height="40" rx="6" fill="#0F172A"/>
          <rect x="6" y="6" width="36" height="36" rx="4" fill="#FFFFFF"/>
          <circle cx="24" cy="5" r="0.8" fill="#64748B"/>
          <rect x="13" y="35" width="22" height="5" rx="2.5" fill="#1E293B"/>
          <text x="24" y="38.8" fill="#FFFFFF" font-size="3.2" font-weight="bold" font-family="sans-serif" text-anchor="middle">SCAN</text>
          ${miniQr(14, 10, 0.42)}
        `;
        break;

      case 'polaroid':
        content = `
          <rect x="5" y="3" width="38" height="42" rx="2" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.2"/>
          <rect x="9" y="6" width="30" height="26" fill="#F8FAFC"/>
          <text x="24" y="39" fill="#334155" font-size="4.2" font-family="serif" text-anchor="middle">${text.slice(0, 10)}</text>
          ${miniQr(14, 8, 0.42)}
        `;
        break;

      case 'browser-window':
        content = `
          <rect x="4" y="4" width="40" height="40" rx="5" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.2"/>
          <path d="M 4 8 C 4 5.2 6.2 4 9 4 H 39 C 41.8 4 44 5.2 44 8 V 12 H 4 Z" fill="#F1F5F9"/>
          <circle cx="8" cy="8" r="1.2" fill="#EF4444"/>
          <circle cx="12" cy="8" r="1.2" fill="#F59E0B"/>
          <circle cx="16" cy="8" r="1.2" fill="#10B981"/>
          <rect x="20" y="6" width="20" height="4" rx="2" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="0.5"/>
          ${miniQr(14, 16, 0.42)}
        `;
        break;

      case 'chat-bubble':
        content = `
          <path d="M 4 8 C 4 5.2 6.2 3 9 3 H 39 C 41.8 3 44 5.2 44 8 V 32 C 44 34.8 41.8 37 39 37 H 20 L 14 43 V 37 H 9 C 6.2 37 4 34.8 4 32 Z" fill="#FFFFFF" stroke="#2563EB" stroke-width="1.5"/>
          ${miniQr(14, 9, 0.42)}
        `;
        break;

      case 'id-lanyard':
        content = `
          <rect x="5" y="6" width="38" height="40" rx="4" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.2"/>
          <rect x="18" y="2" width="12" height="3" rx="1.5" fill="#64748B"/>
          <rect x="5" y="6" width="38" height="5" fill="#2563EB"/>
          <text x="24" y="40" fill="#1E293B" font-size="3.5" font-weight="bold" font-family="sans-serif" text-anchor="middle">PASS</text>
          ${miniQr(14, 14, 0.42)}
        `;
        break;

      case 'terminal':
        content = `
          <rect x="4" y="4" width="40" height="40" rx="4" fill="#090D16"/>
          <path d="M 4 8 C 4 5.5 6 4 8.5 4 H 39.5 C 42 4 44 5.5 44 8 V 11 H 4 Z" fill="#1E293B"/>
          <circle cx="8" cy="7.5" r="1.2" fill="#EF4444"/>
          <circle cx="12" cy="7.5" r="1.2" fill="#F59E0B"/>
          <circle cx="16" cy="7.5" r="1.2" fill="#10B981"/>
          <text x="24" y="40" fill="#4ADE80" font-size="3.5" font-family="monospace" text-anchor="middle">&gt; scan _</text>
          ${miniQr(14, 14, 0.42, '#38BDF8')}
        `;
        break;

      case 'arrow-pointer':
        content = `
          <rect x="4" y="3" width="40" height="42" rx="5" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.2"/>
          <polygon points="24,37 20,33 28,33" fill="#EF4444"/>
          <text x="24" y="41.5" fill="#1E293B" font-size="3.5" font-weight="bold" font-family="sans-serif" text-anchor="middle">SCAN</text>
          ${miniQr(14, 8, 0.42)}
        `;
        break;

      case 'scan-to-pay':
        content = `
          <rect x="4" y="3" width="40" height="42" rx="5" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.2"/>
          <rect x="34" y="6" width="6" height="5" rx="1" fill="#F59E0B"/>
          <rect x="4" y="33" width="40" height="12" rx="4" fill="#059669"/>
          <text x="24" y="40.5" fill="#FFFFFF" font-size="4" font-weight="bold" font-family="sans-serif" text-anchor="middle">PAY</text>
          ${miniQr(14, 8, 0.42)}
        `;
        break;

      case 'wifi-connect':
        content = `
          <rect x="4" y="3" width="40" height="42" rx="5" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.2"/>
          <path d="M 20 8 A 6 6 0 0 1 28 8 M 22 10 A 3 3 0 0 1 26 10 M 24 12 A 0.5 0.5 0 0 1 24 12.5" fill="none" stroke="#2563EB" stroke-width="1.2" stroke-linecap="round"/>
          <rect x="4" y="33" width="40" height="12" rx="4" fill="#2563EB"/>
          <text x="24" y="40.5" fill="#FFFFFF" font-size="3.8" font-weight="bold" font-family="sans-serif" text-anchor="middle">WIFI</text>
          ${miniQr(14, 11, 0.40)}
        `;
        break;

      case 'social-follow':
        content = `
          <rect x="4" y="3" width="40" height="42" rx="5" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.2"/>
          <rect x="4" y="33" width="40" height="12" rx="4" fill="#E11D48"/>
          <text x="24" y="40.5" fill="#FFFFFF" font-size="3.8" font-weight="bold" font-family="sans-serif" text-anchor="middle">★ FOLLOW</text>
          ${miniQr(14, 8, 0.42)}
        `;
        break;

      case 'menu-dining':
        content = `
          <rect x="4" y="3" width="40" height="42" rx="5" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.2"/>
          <rect x="4" y="33" width="40" height="12" rx="4" fill="#B45309"/>
          <text x="24" y="40.5" fill="#FFFFFF" font-size="3.8" font-weight="bold" font-family="sans-serif" text-anchor="middle">MENU</text>
          ${miniQr(14, 8, 0.42)}
        `;
        break;

      case 'feedback-star':
        content = `
          <rect x="4" y="3" width="40" height="42" rx="5" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.2"/>
          <rect x="4" y="33" width="40" height="12" rx="4" fill="#1E293B"/>
          <text x="24" y="40.5" fill="#F59E0B" font-size="4" font-family="sans-serif" text-anchor="middle">★★★★★</text>
          ${miniQr(14, 8, 0.42)}
        `;
        break;

      case 'geometric-hex':
        content = `
          <polygon points="24,3 43,14 43,34 24,45 5,34 5,14" fill="#FFFFFF" stroke="#1E293B" stroke-width="1.8"/>
          ${miniQr(14, 14, 0.42)}
        `;
        break;

      case 'arch-portal':
        content = `
          <path d="M 6 44 V 20 A 18 18 0 0 1 42 20 V 44 Z" fill="#FFFFFF" stroke="#1E293B" stroke-width="1.8"/>
          ${miniQr(14, 16, 0.42)}
        `;
        break;

      case 'wave-card':
        content = `
          <rect x="4" y="3" width="40" height="42" rx="5" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.2"/>
          <path d="M 4 34 Q 14 30 24 35 T 44 33 V 40 C 44 42.8 41.8 45 39 45 H 9 C 6.2 45 4 42.8 4 40 Z" fill="#2563EB"/>
          ${miniQr(14, 8, 0.42)}
        `;
        break;

      case 'postage-stamp':
        content = `
          <rect x="4" y="4" width="40" height="40" rx="3" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5" stroke-dasharray="3,2"/>
          ${miniQr(14, 14, 0.42)}
        `;
        break;

      case 'neon-glow':
        content = `
          <rect x="4" y="4" width="40" height="40" rx="6" fill="#090D16" stroke="#06B6D4" stroke-width="2"/>
          <rect x="7" y="7" width="34" height="34" rx="4" fill="none" stroke="#D946EF" stroke-width="1"/>
          ${miniQr(14, 14, 0.42, '#22D3EE')}
        `;
        break;

      case 'vip-pass':
        content = `
          <rect x="4" y="3" width="40" height="42" rx="6" fill="#18181B" stroke="#F59E0B" stroke-width="2"/>
          <text x="24" y="9" fill="#F59E0B" font-size="3.5" font-weight="900" font-family="sans-serif" text-anchor="middle">★ VIP PASS ★</text>
          ${miniQr(14, 14, 0.42, '#FBBF24')}
        `;
        break;

      case 'wedding-rsvp':
        content = `
          <rect x="4" y="4" width="40" height="40" rx="4" fill="#FFFBEB" stroke="#B45309" stroke-width="1.2"/>
          <rect x="7" y="7" width="34" height="34" rx="2" fill="none" stroke="#D97706" stroke-width="0.8"/>
          <text x="24" y="39.5" fill="#78350F" font-size="3.5" font-family="serif" text-anchor="middle">R . S . V . P</text>
          ${miniQr(14, 10, 0.40, '#78350F')}
        `;
        break;

      case 'festive-holiday':
        content = `
          <rect x="4" y="4" width="40" height="40" rx="5" fill="#FEF2F2" stroke="#DC2626" stroke-width="1.5"/>
          <circle cx="24" cy="5" r="2.5" fill="#15803D"/>
          <text x="24" y="39.5" fill="#DC2626" font-size="3" font-weight="bold" font-family="sans-serif" text-anchor="middle">HOLIDAY</text>
          ${miniQr(14, 10, 0.42, '#991B1B')}
        `;
        break;

      case 'conference-badge':
        content = `
          <rect x="4" y="3" width="40" height="42" rx="5" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.2"/>
          <rect x="4" y="3" width="40" height="7" rx="3" fill="#7C3AED"/>
          <text x="24" y="8" fill="#FFFFFF" font-size="3.2" font-weight="bold" font-family="sans-serif" text-anchor="middle">ATTENDEE</text>
          ${miniQr(14, 14, 0.42)}
        `;
        break;

      case 'boarding-pass':
        content = `
          <rect x="4" y="4" width="40" height="40" rx="4" fill="#FFFFFF" stroke="#0284C7" stroke-width="1.5"/>
          <text x="10" y="9" fill="#0284C7" font-size="4">✈</text>
          <text x="24" y="9" fill="#0369A1" font-size="3.2" font-weight="bold" font-family="sans-serif" text-anchor="middle">BOARDING</text>
          ${miniQr(14, 14, 0.42, '#0369A1')}
        `;
        break;

      case 'wristband':
        content = `
          <rect x="4" y="10" width="40" height="28" rx="4" fill="#10B981" stroke="#059669" stroke-width="1.2"/>
          <rect x="36" y="10" width="8" height="28" rx="2" fill="#047857"/>
          ${miniQr(14, 13, 0.38, '#FFFFFF')}
        `;
        break;

      case 'brutalist-shadow':
        content = `
          <rect x="8" y="8" width="36" height="36" rx="2" fill="#000000"/>
          <rect x="4" y="4" width="36" height="36" rx="2" fill="#FFFFFF" stroke="#000000" stroke-width="2"/>
          <rect x="4" y="29" width="36" height="11" fill="#1E293B" stroke="#000000" stroke-width="1.5"/>
          <text x="22" y="36.5" fill="#FFFFFF" font-size="4.2" font-weight="900" font-family="sans-serif" text-anchor="middle">SCAN</text>
          ${miniQr(12, 7, 0.40)}
        `;
        break;

      case 'dashed-coupon':
        content = `
          <rect x="4" y="4" width="40" height="40" rx="4" fill="#FFFFFF" stroke="#1E293B" stroke-width="1.5" stroke-dasharray="3,2"/>
          <text x="8" y="9" fill="#1E293B" font-size="3.5">✂</text>
          <text x="24" y="40" fill="#1E293B" font-size="3.2" font-weight="bold" font-family="sans-serif" text-anchor="middle">COUPON</text>
          ${miniQr(14, 11, 0.40)}
        `;
        break;

      case 'inset-bevel':
        content = `
          <rect x="4" y="4" width="40" height="40" rx="5" fill="#E2E8F0" stroke="#94A3B8" stroke-width="1.5"/>
          <rect x="7" y="7" width="34" height="34" rx="3" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>
          ${miniQr(14, 14, 0.42)}
        `;
        break;

      case 'architect-pillars':
        content = `
          <rect x="4" y="4" width="40" height="40" rx="4" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>
          <rect x="4" y="4" width="5" height="40" fill="#1E293B"/>
          <rect x="39" y="4" width="5" height="40" fill="#1E293B"/>
          ${miniQr(14, 14, 0.42)}
        `;
        break;

      case 'gradient-stroke':
        content = `
          <defs>
            <linearGradient id="grad-thumb-${framePreset.id}" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#FF5733" />
              <stop offset="50%" stop-color="#9333EA" />
              <stop offset="100%" stop-color="#2563EB" />
            </linearGradient>
          </defs>
          <rect x="4" y="4" width="40" height="40" rx="6" fill="#FFFFFF" stroke="url(#grad-thumb-${framePreset.id})" stroke-width="2.5"/>
          ${miniQr(14, 14, 0.42)}
        `;
        break;

      default:
        content = `
          <rect x="4" y="3" width="40" height="42" rx="5" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.2"/>
          <rect x="12" y="35" width="24" height="6.5" rx="3" fill="#1E293B"/>
          <text x="24" y="39.5" fill="#FFFFFF" font-size="3.5" font-weight="bold" font-family="sans-serif" text-anchor="middle">SCAN</text>
          ${miniQr(14, 9, 0.42)}
        `;
        break;
    }

    const svg = `
      <svg viewBox="0 0 48 48" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        ${content}
      </svg>
    `;

    return svg.trim();
  }

  return {
    renderComposite,
    computeLayout,
    generateStyleThumbnailSvg,
    generateFrameThumbnailSvg
  };

})();

if (typeof window !== 'undefined') {
  window.QRFrameRenderer = QRFrameRenderer;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = QRFrameRenderer;
}

