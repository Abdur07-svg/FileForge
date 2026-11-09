/**
 * FileForge — Unified QR Frame & Style Preset Renderer
 * 
 * Guarantees 100% mathematical and visual fidelity between:
 *  - Frame preset thumbnails
 *  - Live QR composite preview
 *  - High-resolution PNG, SVG, and PDF exports
 * 
 * Uses a single source of truth for all 52 Frame Presets across 7 themes.
 */

(function(global) {
  'use strict';

  // 1. Single Source of Truth: All 52 Frame Preset Templates
  const FRAME_TEMPLATES = {
  "none": {
    "type": "none",
    "qrBox": {
      "x": 14,
      "y": 14,
      "size": 20.16,
      "scale": 0.42,
      "color": "#334155"
    },
    "beforeSvg": "<rect x=\"4\" y=\"4\" width=\"40\" height=\"40\" rx=\"6\" fill=\"#FFFFFF\" stroke=\"#E2E8F0\" stroke-width=\"1.2\"/>",
    "afterSvg": ""
  },
  "banner-bottom": {
    "type": "banner-bottom",
    "qrBox": {
      "x": 14,
      "y": 9,
      "size": 20.16,
      "scale": 0.42,
      "color": "#334155"
    },
    "beforeSvg": "<rect x=\"4\" y=\"3\" width=\"40\" height=\"42\" rx=\"5\" fill=\"#FFFFFF\" stroke=\"#CBD5E1\" stroke-width=\"1.2\"/>\n          <path d=\"M 4 33 H 44 V 40 C 44 42.8 41.8 45 39 45 H 9 C 6.2 45 4 42.8 4 40 Z\" fill=\"#1E293B\"/>\n          <text x=\"24\" y=\"40\" fill=\"#FFFFFF\" font-size=\"4.2\" font-weight=\"bold\" font-family=\"sans-serif\" text-anchor=\"middle\">${text}</text>",
    "afterSvg": ""
  },
  "mega-cta": {
    "type": "mega-cta",
    "qrBox": {
      "x": 14,
      "y": 9,
      "size": 20.16,
      "scale": 0.42,
      "color": "#334155"
    },
    "beforeSvg": "<rect x=\"4\" y=\"3\" width=\"40\" height=\"42\" rx=\"5\" fill=\"#FFFFFF\" stroke=\"#CBD5E1\" stroke-width=\"1.2\"/>\n          <path d=\"M 4 33 H 44 V 40 C 44 42.8 41.8 45 39 45 H 9 C 6.2 45 4 42.8 4 40 Z\" fill=\"#1E293B\"/>\n          <text x=\"24\" y=\"40\" fill=\"#FFFFFF\" font-size=\"4.2\" font-weight=\"bold\" font-family=\"sans-serif\" text-anchor=\"middle\">${text}</text>",
    "afterSvg": ""
  },
  "app-download": {
    "type": "app-download",
    "qrBox": {
      "x": 14,
      "y": 9,
      "size": 20.16,
      "scale": 0.42,
      "color": "#334155"
    },
    "beforeSvg": "<rect x=\"4\" y=\"3\" width=\"40\" height=\"42\" rx=\"5\" fill=\"#FFFFFF\" stroke=\"#CBD5E1\" stroke-width=\"1.2\"/>\n          <path d=\"M 4 33 H 44 V 40 C 44 42.8 41.8 45 39 45 H 9 C 6.2 45 4 42.8 4 40 Z\" fill=\"#1E293B\"/>\n          <text x=\"24\" y=\"40\" fill=\"#FFFFFF\" font-size=\"4.2\" font-weight=\"bold\" font-family=\"sans-serif\" text-anchor=\"middle\">${text}</text>",
    "afterSvg": ""
  },
  "banner-top": {
    "type": "banner-top",
    "qrBox": {
      "x": 14,
      "y": 19,
      "size": 20.16,
      "scale": 0.42,
      "color": "#334155"
    },
    "beforeSvg": "<rect x=\"4\" y=\"3\" width=\"40\" height=\"42\" rx=\"5\" fill=\"#FFFFFF\" stroke=\"#CBD5E1\" stroke-width=\"1.2\"/>\n          <path d=\"M 4 8 C 4 5.2 6.2 3 9 3 H 39 C 41.8 3 44 5.2 44 8 V 14 H 4 Z\" fill=\"#1E293B\"/>\n          <text x=\"24\" y=\"10\" fill=\"#FFFFFF\" font-size=\"4.2\" font-weight=\"bold\" font-family=\"sans-serif\" text-anchor=\"middle\">${text}</text>",
    "afterSvg": ""
  },
  "card-rounded": {
    "type": "card-rounded",
    "qrBox": {
      "x": 14,
      "y": 9,
      "size": 20.16,
      "scale": 0.42,
      "color": "#334155"
    },
    "beforeSvg": "<rect x=\"4\" y=\"3\" width=\"40\" height=\"42\" rx=\"8\" fill=\"#FFFFFF\" stroke=\"#CBD5E1\" stroke-width=\"1.5\"/>\n          <rect x=\"12\" y=\"35\" width=\"24\" height=\"6.5\" rx=\"3.25\" fill=\"#1E293B\"/>\n          <text x=\"24\" y=\"39.5\" fill=\"#FFFFFF\" font-size=\"3.5\" font-weight=\"bold\" font-family=\"sans-serif\" text-anchor=\"middle\">${text}</text>",
    "afterSvg": ""
  },
  "floating-soft": {
    "type": "floating-soft",
    "qrBox": {
      "x": 14,
      "y": 9,
      "size": 20.16,
      "scale": 0.42,
      "color": "#334155"
    },
    "beforeSvg": "<rect x=\"4\" y=\"3\" width=\"40\" height=\"42\" rx=\"8\" fill=\"#FFFFFF\" stroke=\"#CBD5E1\" stroke-width=\"1.5\"/>\n          <rect x=\"12\" y=\"35\" width=\"24\" height=\"6.5\" rx=\"3.25\" fill=\"#1E293B\"/>\n          <text x=\"24\" y=\"39.5\" fill=\"#FFFFFF\" font-size=\"3.5\" font-weight=\"bold\" font-family=\"sans-serif\" text-anchor=\"middle\">${text}</text>",
    "afterSvg": ""
  },
  "double-border": {
    "type": "double-border",
    "qrBox": {
      "x": 14,
      "y": 11,
      "size": 19.2,
      "scale": 0.4,
      "color": "#334155"
    },
    "beforeSvg": "<rect x=\"4\" y=\"3\" width=\"40\" height=\"42\" rx=\"5\" fill=\"#FFFFFF\" stroke=\"#1E293B\" stroke-width=\"1.5\"/>\n          <rect x=\"7\" y=\"6\" width=\"34\" height=\"36\" rx=\"3\" fill=\"none\" stroke=\"#1E293B\" stroke-width=\"0.8\"/>\n          <rect x=\"13\" y=\"34.5\" width=\"22\" height=\"5.5\" rx=\"2\" fill=\"#1E293B\"/>\n          <text x=\"24\" y=\"38.5\" fill=\"#FFFFFF\" font-size=\"3.2\" font-weight=\"bold\" font-family=\"sans-serif\" text-anchor=\"middle\">${text}</text>",
    "afterSvg": ""
  },
  "pill-bottom": {
    "type": "pill-bottom",
    "qrBox": {
      "x": 14,
      "y": 9,
      "size": 20.16,
      "scale": 0.42,
      "color": "#334155"
    },
    "beforeSvg": "<rect x=\"4\" y=\"3\" width=\"40\" height=\"36\" rx=\"6\" fill=\"#FFFFFF\" stroke=\"#CBD5E1\" stroke-width=\"1.2\"/>\n          <rect x=\"11\" y=\"35\" width=\"26\" height=\"7\" rx=\"3.5\" fill=\"#1E293B\"/>\n          <text x=\"24\" y=\"39.8\" fill=\"#FFFFFF\" font-size=\"3.6\" font-weight=\"bold\" font-family=\"sans-serif\" text-anchor=\"middle\">${text}</text>",
    "afterSvg": ""
  },
  "floating-tag": {
    "type": "floating-tag",
    "qrBox": {
      "x": 14,
      "y": 9,
      "size": 20.16,
      "scale": 0.42,
      "color": "#334155"
    },
    "beforeSvg": "<rect x=\"4\" y=\"3\" width=\"40\" height=\"36\" rx=\"6\" fill=\"#FFFFFF\" stroke=\"#CBD5E1\" stroke-width=\"1.2\"/>\n          <rect x=\"11\" y=\"35\" width=\"26\" height=\"7\" rx=\"3.5\" fill=\"#1E293B\"/>\n          <text x=\"24\" y=\"39.8\" fill=\"#FFFFFF\" font-size=\"3.6\" font-weight=\"bold\" font-family=\"sans-serif\" text-anchor=\"middle\">${text}</text>",
    "afterSvg": ""
  },
  "pill-top": {
    "type": "pill-top",
    "qrBox": {
      "x": 14,
      "y": 18,
      "size": 20.16,
      "scale": 0.42,
      "color": "#334155"
    },
    "beforeSvg": "<rect x=\"4\" y=\"9\" width=\"40\" height=\"36\" rx=\"6\" fill=\"#FFFFFF\" stroke=\"#CBD5E1\" stroke-width=\"1.2\"/>\n          <rect x=\"11\" y=\"5\" width=\"26\" height=\"7\" rx=\"3.5\" fill=\"#1E293B\"/>\n          <text x=\"24\" y=\"9.8\" fill=\"#FFFFFF\" font-size=\"3.6\" font-weight=\"bold\" font-family=\"sans-serif\" text-anchor=\"middle\">${text}</text>",
    "afterSvg": ""
  },
  "corner-notches": {
    "type": "corner-notches",
    "qrBox": {
      "x": 14,
      "y": 14,
      "size": 20.16,
      "scale": 0.42,
      "color": "#334155"
    },
    "beforeSvg": "<rect x=\"4\" y=\"4\" width=\"40\" height=\"40\" rx=\"4\" fill=\"#FFFFFF\"/>\n          <path d=\"M 6 13 V 6 H 13 M 35 6 H 42 V 13 M 6 35 V 42 H 13 M 35 42 H 42 V 35\" fill=\"none\" stroke=\"#1E293B\" stroke-width=\"2\"/>",
    "afterSvg": ""
  },
  "corner-brackets": {
    "type": "corner-brackets",
    "qrBox": {
      "x": 14,
      "y": 14,
      "size": 20.16,
      "scale": 0.42,
      "color": "#334155"
    },
    "beforeSvg": "<rect x=\"4\" y=\"4\" width=\"40\" height=\"40\" rx=\"4\" fill=\"#FFFFFF\"/>\n          <path d=\"M 6 13 V 6 H 13 M 35 6 H 42 V 13 M 6 35 V 42 H 13 M 35 42 H 42 V 35\" fill=\"none\" stroke=\"#1E293B\" stroke-width=\"2\"/>",
    "afterSvg": ""
  },
  "viewfinder": {
    "type": "viewfinder",
    "qrBox": {
      "x": 14,
      "y": 14,
      "size": 20.16,
      "scale": 0.42,
      "color": "#334155"
    },
    "beforeSvg": "<rect x=\"4\" y=\"4\" width=\"40\" height=\"40\" rx=\"4\" fill=\"#FFFFFF\"/>\n          <path d=\"M 6 12 V 6 H 12 M 36 6 H 42 V 12 M 6 36 V 42 H 12 M 36 42 H 42 V 36\" fill=\"none\" stroke=\"#EF4444\" stroke-width=\"2\"/>\n          <circle cx=\"24\" cy=\"24\" r=\"2\" fill=\"none\" stroke=\"#EF4444\" stroke-width=\"1\"/>",
    "afterSvg": ""
  },
  "ribbon-bottom": {
    "type": "ribbon-bottom",
    "qrBox": {
      "x": 14,
      "y": 8,
      "size": 20.16,
      "scale": 0.42,
      "color": "#334155"
    },
    "beforeSvg": "<rect x=\"4\" y=\"3\" width=\"40\" height=\"37\" rx=\"5\" fill=\"#FFFFFF\" stroke=\"#CBD5E1\" stroke-width=\"1.2\"/>\n          <polygon points=\"6,36 10,33 42,33 38,36 42,39 10,39\" fill=\"#1E293B\"/>\n          <rect x=\"10\" y=\"33\" width=\"28\" height=\"7\" rx=\"1.5\" fill=\"#1E293B\"/>\n          <text x=\"24\" y=\"38\" fill=\"#FFFFFF\" font-size=\"3.5\" font-weight=\"bold\" font-family=\"sans-serif\" text-anchor=\"middle\">${text}</text>",
    "afterSvg": ""
  },
  "ribbon-top": {
    "type": "ribbon-top",
    "qrBox": {
      "x": 14,
      "y": 18,
      "size": 20.16,
      "scale": 0.42,
      "color": "#334155"
    },
    "beforeSvg": "<rect x=\"4\" y=\"8\" width=\"40\" height=\"37\" rx=\"5\" fill=\"#FFFFFF\" stroke=\"#CBD5E1\" stroke-width=\"1.2\"/>\n          <rect x=\"10\" y=\"4\" width=\"28\" height=\"7\" rx=\"1.5\" fill=\"#1E293B\"/>\n          <text x=\"24\" y=\"9\" fill=\"#FFFFFF\" font-size=\"3.5\" font-weight=\"bold\" font-family=\"sans-serif\" text-anchor=\"middle\">${text}</text>",
    "afterSvg": ""
  },
  "ticket-stub": {
    "type": "ticket-stub",
    "qrBox": {
      "x": 14,
      "y": 9,
      "size": 20.16,
      "scale": 0.42,
      "color": "#334155"
    },
    "beforeSvg": "<path d=\"M 4 8 C 4 5.5 6 3.5 8.5 3.5 H 39.5 C 42 3.5 44 5.5 44 8 V 20 A 4 4 0 0 0 44 28 V 40 C 44 42.5 42 44.5 39.5 44.5 H 8.5 C 6 44.5 4 42.5 4 40 V 28 A 4 4 0 0 0 4 20 Z\" fill=\"#FFFFFF\" stroke=\"#CBD5E1\" stroke-width=\"1.2\"/>\n          <line x1=\"8\" y1=\"34\" x2=\"40\" y2=\"34\" stroke=\"#CBD5E1\" stroke-width=\"1\" stroke-dasharray=\"2,2\"/>\n          <text x=\"24\" y=\"40.5\" fill=\"#64748B\" font-size=\"3.5\" font-weight=\"bold\" font-family=\"sans-serif\" text-anchor=\"middle\">${text}</text>",
    "afterSvg": ""
  },
  "event-ticket": {
    "type": "event-ticket",
    "qrBox": {
      "x": 14,
      "y": 9,
      "size": 20.16,
      "scale": 0.42,
      "color": "#334155"
    },
    "beforeSvg": "<path d=\"M 4 8 C 4 5.5 6 3.5 8.5 3.5 H 39.5 C 42 3.5 44 5.5 44 8 V 20 A 4 4 0 0 0 44 28 V 40 C 44 42.5 42 44.5 39.5 44.5 H 8.5 C 6 44.5 4 42.5 4 40 V 28 A 4 4 0 0 0 4 20 Z\" fill=\"#FFFFFF\" stroke=\"#CBD5E1\" stroke-width=\"1.2\"/>\n          <line x1=\"8\" y1=\"34\" x2=\"40\" y2=\"34\" stroke=\"#CBD5E1\" stroke-width=\"1\" stroke-dasharray=\"2,2\"/>\n          <text x=\"24\" y=\"40.5\" fill=\"#64748B\" font-size=\"3.5\" font-weight=\"bold\" font-family=\"sans-serif\" text-anchor=\"middle\">${text}</text>",
    "afterSvg": ""
  },
  "corner-flag": {
    "type": "corner-flag",
    "qrBox": {
      "x": 13,
      "y": 14,
      "size": 19.2,
      "scale": 0.4,
      "color": "#334155"
    },
    "beforeSvg": "<rect x=\"4\" y=\"4\" width=\"40\" height=\"40\" rx=\"5\" fill=\"#FFFFFF\" stroke=\"#CBD5E1\" stroke-width=\"1.2\"/>\n          <polygon points=\"28,4 44,4 44,20\" fill=\"#EF4444\"/>\n          <text x=\"39\" y=\"11\" fill=\"#FFFFFF\" font-size=\"3\" font-weight=\"bold\" font-family=\"sans-serif\" text-anchor=\"middle\" transform=\"rotate(45, 39, 11)\">${text}</text>",
    "afterSvg": ""
  },
  "price-tag": {
    "type": "price-tag",
    "qrBox": {
      "x": 14,
      "y": 12,
      "size": 20.16,
      "scale": 0.42,
      "color": "#334155"
    },
    "beforeSvg": "<polygon points=\"12,3 36,3 44,11 44,45 4,45 4,11\" fill=\"#FFFFFF\" stroke=\"#CBD5E1\" stroke-width=\"1.2\"/>\n          <circle cx=\"24\" cy=\"7\" r=\"2.2\" fill=\"#94A3B8\"/>\n          <rect x=\"12\" y=\"37\" width=\"24\" height=\"5\" rx=\"2.5\" fill=\"#1E293B\"/>\n          <text x=\"24\" y=\"40.8\" fill=\"#FFFFFF\" font-size=\"3\" font-weight=\"bold\" font-family=\"sans-serif\" text-anchor=\"middle\">${text}</text>",
    "afterSvg": ""
  },
  "bookmark-tab": {
    "type": "bookmark-tab",
    "qrBox": {
      "x": 14,
      "y": 14,
      "size": 20.16,
      "scale": 0.42,
      "color": "#334155"
    },
    "beforeSvg": "<rect x=\"5\" y=\"8\" width=\"38\" height=\"37\" rx=\"4\" fill=\"#FFFFFF\" stroke=\"#CBD5E1\" stroke-width=\"1.2\"/>\n          <polygon points=\"10,2 22,2 22,12 16,9 10,12\" fill=\"#2563EB\"/>\n          <text x=\"24\" y=\"40\" fill=\"#1E293B\" font-size=\"3.5\" font-weight=\"bold\" font-family=\"sans-serif\" text-anchor=\"middle\">${text}</text>",
    "afterSvg": ""
  },
  "seal-badge": {
    "type": "seal-badge",
    "qrBox": {
      "x": 14,
      "y": 14,
      "size": 20.16,
      "scale": 0.42,
      "color": "#334155"
    },
    "beforeSvg": "<circle cx=\"24\" cy=\"24\" r=\"21\" fill=\"#FFFFFF\" stroke=\"#1E293B\" stroke-width=\"2\"/>\n          <circle cx=\"24\" cy=\"24\" r=\"18\" fill=\"none\" stroke=\"#D97706\" stroke-width=\"1\" stroke-dasharray=\"2,2\"/>",
    "afterSvg": ""
  },
  "circle-ring": {
    "type": "circle-ring",
    "qrBox": {
      "x": 14,
      "y": 14,
      "size": 20.16,
      "scale": 0.42,
      "color": "#334155"
    },
    "beforeSvg": "<circle cx=\"24\" cy=\"24\" r=\"21\" fill=\"#FFFFFF\" stroke=\"#1E293B\" stroke-width=\"2\"/>\n          <circle cx=\"24\" cy=\"24\" r=\"18\" fill=\"none\" stroke=\"#D97706\" stroke-width=\"1\" stroke-dasharray=\"2,2\"/>",
    "afterSvg": ""
  },
  "phone-mockup": {
    "type": "phone-mockup",
    "qrBox": {
      "x": 14,
      "y": 10,
      "size": 20.16,
      "scale": 0.42,
      "color": "#334155"
    },
    "beforeSvg": "<rect x=\"8\" y=\"2\" width=\"32\" height=\"44\" rx=\"6\" fill=\"#0F172A\"/>\n          <rect x=\"10\" y=\"5\" width=\"28\" height=\"38\" rx=\"4\" fill=\"#FFFFFF\"/>\n          <rect x=\"21\" y=\"3\" width=\"6\" height=\"1.2\" rx=\"0.6\" fill=\"#64748B\"/>\n          <rect x=\"13\" y=\"36.5\" width=\"22\" height=\"4.5\" rx=\"2.25\" fill=\"#2563EB\"/>\n          <text x=\"24\" y=\"39.8\" fill=\"#FFFFFF\" font-size=\"3.2\" font-weight=\"bold\" font-family=\"sans-serif\" text-anchor=\"middle\">${text}</text>",
    "afterSvg": ""
  },
  "tablet-bezel": {
    "type": "tablet-bezel",
    "qrBox": {
      "x": 14,
      "y": 10,
      "size": 20.16,
      "scale": 0.42,
      "color": "#334155"
    },
    "beforeSvg": "<rect x=\"4\" y=\"4\" width=\"40\" height=\"40\" rx=\"6\" fill=\"#0F172A\"/>\n          <rect x=\"6\" y=\"6\" width=\"36\" height=\"36\" rx=\"4\" fill=\"#FFFFFF\"/>\n          <circle cx=\"24\" cy=\"5\" r=\"0.8\" fill=\"#64748B\"/>\n          <rect x=\"13\" y=\"35\" width=\"22\" height=\"5\" rx=\"2.5\" fill=\"#1E293B\"/>\n          <text x=\"24\" y=\"38.8\" fill=\"#FFFFFF\" font-size=\"3.2\" font-weight=\"bold\" font-family=\"sans-serif\" text-anchor=\"middle\">${text}</text>",
    "afterSvg": ""
  },
  "polaroid": {
    "type": "polaroid",
    "qrBox": {
      "x": 14,
      "y": 8,
      "size": 20.16,
      "scale": 0.42,
      "color": "#334155"
    },
    "beforeSvg": "<rect x=\"5\" y=\"3\" width=\"38\" height=\"42\" rx=\"2\" fill=\"#FFFFFF\" stroke=\"#CBD5E1\" stroke-width=\"1.2\"/>\n          <rect x=\"9\" y=\"6\" width=\"30\" height=\"26\" fill=\"#F8FAFC\"/>\n          <text x=\"24\" y=\"39\" fill=\"#334155\" font-size=\"4.2\" font-family=\"serif\" text-anchor=\"middle\">${text}</text>",
    "afterSvg": ""
  },
  "browser-window": {
    "type": "browser-window",
    "qrBox": {
      "x": 14,
      "y": 16,
      "size": 20.16,
      "scale": 0.42,
      "color": "#334155"
    },
    "beforeSvg": "<rect x=\"4\" y=\"4\" width=\"40\" height=\"40\" rx=\"5\" fill=\"#FFFFFF\" stroke=\"#CBD5E1\" stroke-width=\"1.2\"/>\n          <path d=\"M 4 8 C 4 5.2 6.2 4 9 4 H 39 C 41.8 4 44 5.2 44 8 V 12 H 4 Z\" fill=\"#F1F5F9\"/>\n          <circle cx=\"8\" cy=\"8\" r=\"1.2\" fill=\"#EF4444\"/>\n          <circle cx=\"12\" cy=\"8\" r=\"1.2\" fill=\"#F59E0B\"/>\n          <circle cx=\"16\" cy=\"8\" r=\"1.2\" fill=\"#10B981\"/>\n          <rect x=\"20\" y=\"6\" width=\"20\" height=\"4\" rx=\"2\" fill=\"#FFFFFF\" stroke=\"#CBD5E1\" stroke-width=\"0.5\"/>",
    "afterSvg": ""
  },
  "chat-bubble": {
    "type": "chat-bubble",
    "qrBox": {
      "x": 14,
      "y": 9,
      "size": 20.16,
      "scale": 0.42,
      "color": "#334155"
    },
    "beforeSvg": "<path d=\"M 4 8 C 4 5.2 6.2 3 9 3 H 39 C 41.8 3 44 5.2 44 8 V 32 C 44 34.8 41.8 37 39 37 H 20 L 14 43 V 37 H 9 C 6.2 37 4 34.8 4 32 Z\" fill=\"#FFFFFF\" stroke=\"#2563EB\" stroke-width=\"1.5\"/>",
    "afterSvg": ""
  },
  "id-lanyard": {
    "type": "id-lanyard",
    "qrBox": {
      "x": 14,
      "y": 14,
      "size": 20.16,
      "scale": 0.42,
      "color": "#334155"
    },
    "beforeSvg": "<rect x=\"5\" y=\"6\" width=\"38\" height=\"40\" rx=\"4\" fill=\"#FFFFFF\" stroke=\"#CBD5E1\" stroke-width=\"1.2\"/>\n          <rect x=\"18\" y=\"2\" width=\"12\" height=\"3\" rx=\"1.5\" fill=\"#64748B\"/>\n          <rect x=\"5\" y=\"6\" width=\"38\" height=\"5\" fill=\"#2563EB\"/>\n          <text x=\"24\" y=\"40\" fill=\"#1E293B\" font-size=\"3.5\" font-weight=\"bold\" font-family=\"sans-serif\" text-anchor=\"middle\">${text}</text>",
    "afterSvg": ""
  },
  "terminal": {
    "type": "terminal",
    "qrBox": {
      "x": 14,
      "y": 14,
      "size": 20.16,
      "scale": 0.42,
      "color": "#38BDF8"
    },
    "beforeSvg": "<rect x=\"4\" y=\"4\" width=\"40\" height=\"40\" rx=\"4\" fill=\"#090D16\"/>\n          <path d=\"M 4 8 C 4 5.5 6 4 8.5 4 H 39.5 C 42 4 44 5.5 44 8 V 11 H 4 Z\" fill=\"#1E293B\"/>\n          <circle cx=\"8\" cy=\"7.5\" r=\"1.2\" fill=\"#EF4444\"/>\n          <circle cx=\"12\" cy=\"7.5\" r=\"1.2\" fill=\"#F59E0B\"/>\n          <circle cx=\"16\" cy=\"7.5\" r=\"1.2\" fill=\"#10B981\"/>\n          <text x=\"24\" y=\"40\" fill=\"#4ADE80\" font-size=\"3.5\" font-family=\"monospace\" text-anchor=\"middle\">${text}</text>",
    "afterSvg": ""
  },
  "arrow-pointer": {
    "type": "arrow-pointer",
    "qrBox": {
      "x": 14,
      "y": 8,
      "size": 20.16,
      "scale": 0.42,
      "color": "#334155"
    },
    "beforeSvg": "<rect x=\"4\" y=\"3\" width=\"40\" height=\"42\" rx=\"5\" fill=\"#FFFFFF\" stroke=\"#CBD5E1\" stroke-width=\"1.2\"/>\n          <polygon points=\"24,37 20,33 28,33\" fill=\"#EF4444\"/>\n          <text x=\"24\" y=\"41.5\" fill=\"#1E293B\" font-size=\"3.5\" font-weight=\"bold\" font-family=\"sans-serif\" text-anchor=\"middle\">${text}</text>",
    "afterSvg": ""
  },
  "scan-to-pay": {
    "type": "scan-to-pay",
    "qrBox": {
      "x": 14,
      "y": 8,
      "size": 20.16,
      "scale": 0.42,
      "color": "#334155"
    },
    "beforeSvg": "<rect x=\"4\" y=\"3\" width=\"40\" height=\"42\" rx=\"5\" fill=\"#FFFFFF\" stroke=\"#CBD5E1\" stroke-width=\"1.2\"/>\n          <rect x=\"34\" y=\"6\" width=\"6\" height=\"5\" rx=\"1\" fill=\"#F59E0B\"/>\n          <rect x=\"4\" y=\"33\" width=\"40\" height=\"12\" rx=\"4\" fill=\"#059669\"/>\n          <text x=\"24\" y=\"40.5\" fill=\"#FFFFFF\" font-size=\"4\" font-weight=\"bold\" font-family=\"sans-serif\" text-anchor=\"middle\">${text}</text>",
    "afterSvg": ""
  },
  "wifi-connect": {
    "type": "wifi-connect",
    "qrBox": {
      "x": 14,
      "y": 11,
      "size": 19.2,
      "scale": 0.4,
      "color": "#334155"
    },
    "beforeSvg": "<rect x=\"4\" y=\"3\" width=\"40\" height=\"42\" rx=\"5\" fill=\"#FFFFFF\" stroke=\"#CBD5E1\" stroke-width=\"1.2\"/>\n          <path d=\"M 20 8 A 6 6 0 0 1 28 8 M 22 10 A 3 3 0 0 1 26 10 M 24 12 A 0.5 0.5 0 0 1 24 12.5\" fill=\"none\" stroke=\"#2563EB\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>\n          <rect x=\"4\" y=\"33\" width=\"40\" height=\"12\" rx=\"4\" fill=\"#2563EB\"/>\n          <text x=\"24\" y=\"40.5\" fill=\"#FFFFFF\" font-size=\"3.8\" font-weight=\"bold\" font-family=\"sans-serif\" text-anchor=\"middle\">${text}</text>",
    "afterSvg": ""
  },
  "social-follow": {
    "type": "social-follow",
    "qrBox": {
      "x": 14,
      "y": 8,
      "size": 20.16,
      "scale": 0.42,
      "color": "#334155"
    },
    "beforeSvg": "<rect x=\"4\" y=\"3\" width=\"40\" height=\"42\" rx=\"5\" fill=\"#FFFFFF\" stroke=\"#CBD5E1\" stroke-width=\"1.2\"/>\n          <rect x=\"4\" y=\"33\" width=\"40\" height=\"12\" rx=\"4\" fill=\"#E11D48\"/>\n          <text x=\"24\" y=\"40.5\" fill=\"#FFFFFF\" font-size=\"3.8\" font-weight=\"bold\" font-family=\"sans-serif\" text-anchor=\"middle\">${text}</text>",
    "afterSvg": ""
  },
  "menu-dining": {
    "type": "menu-dining",
    "qrBox": {
      "x": 14,
      "y": 8,
      "size": 20.16,
      "scale": 0.42,
      "color": "#334155"
    },
    "beforeSvg": "<rect x=\"4\" y=\"3\" width=\"40\" height=\"42\" rx=\"5\" fill=\"#FFFFFF\" stroke=\"#CBD5E1\" stroke-width=\"1.2\"/>\n          <rect x=\"4\" y=\"33\" width=\"40\" height=\"12\" rx=\"4\" fill=\"#B45309\"/>\n          <text x=\"24\" y=\"40.5\" fill=\"#FFFFFF\" font-size=\"3.8\" font-weight=\"bold\" font-family=\"sans-serif\" text-anchor=\"middle\">${text}</text>",
    "afterSvg": ""
  },
  "feedback-star": {
    "type": "feedback-star",
    "qrBox": {
      "x": 14,
      "y": 8,
      "size": 20.16,
      "scale": 0.42,
      "color": "#334155"
    },
    "beforeSvg": "<rect x=\"4\" y=\"3\" width=\"40\" height=\"42\" rx=\"5\" fill=\"#FFFFFF\" stroke=\"#CBD5E1\" stroke-width=\"1.2\"/>\n          <rect x=\"4\" y=\"33\" width=\"40\" height=\"12\" rx=\"4\" fill=\"#1E293B\"/>\n          <text x=\"24\" y=\"40.5\" fill=\"#F59E0B\" font-size=\"4\" font-family=\"sans-serif\" text-anchor=\"middle\">${text}</text>",
    "afterSvg": ""
  },
  "geometric-hex": {
    "type": "geometric-hex",
    "qrBox": {
      "x": 14,
      "y": 14,
      "size": 20.16,
      "scale": 0.42,
      "color": "#334155"
    },
    "beforeSvg": "<polygon points=\"24,3 43,14 43,34 24,45 5,34 5,14\" fill=\"#FFFFFF\" stroke=\"#1E293B\" stroke-width=\"1.8\"/>",
    "afterSvg": ""
  },
  "arch-portal": {
    "type": "arch-portal",
    "qrBox": {
      "x": 14,
      "y": 16,
      "size": 20.16,
      "scale": 0.42,
      "color": "#334155"
    },
    "beforeSvg": "<path d=\"M 6 44 V 20 A 18 18 0 0 1 42 20 V 44 Z\" fill=\"#FFFFFF\" stroke=\"#1E293B\" stroke-width=\"1.8\"/>",
    "afterSvg": ""
  },
  "wave-card": {
    "type": "wave-card",
    "qrBox": {
      "x": 14,
      "y": 8,
      "size": 20.16,
      "scale": 0.42,
      "color": "#334155"
    },
    "beforeSvg": "<rect x=\"4\" y=\"3\" width=\"40\" height=\"42\" rx=\"5\" fill=\"#FFFFFF\" stroke=\"#CBD5E1\" stroke-width=\"1.2\"/>\n          <path d=\"M 4 34 Q 14 30 24 35 T 44 33 V 40 C 44 42.8 41.8 45 39 45 H 9 C 6.2 45 4 42.8 4 40 Z\" fill=\"#2563EB\"/>",
    "afterSvg": ""
  },
  "postage-stamp": {
    "type": "postage-stamp",
    "qrBox": {
      "x": 14,
      "y": 14,
      "size": 20.16,
      "scale": 0.42,
      "color": "#334155"
    },
    "beforeSvg": "<rect x=\"4\" y=\"4\" width=\"40\" height=\"40\" rx=\"3\" fill=\"#FFFFFF\" stroke=\"#CBD5E1\" stroke-width=\"1.5\" stroke-dasharray=\"3,2\"/>",
    "afterSvg": ""
  },
  "neon-glow": {
    "type": "neon-glow",
    "qrBox": {
      "x": 14,
      "y": 14,
      "size": 20.16,
      "scale": 0.42,
      "color": "#22D3EE"
    },
    "beforeSvg": "<rect x=\"4\" y=\"4\" width=\"40\" height=\"40\" rx=\"6\" fill=\"#090D16\" stroke=\"#06B6D4\" stroke-width=\"2\"/>\n          <rect x=\"7\" y=\"7\" width=\"34\" height=\"34\" rx=\"4\" fill=\"none\" stroke=\"#D946EF\" stroke-width=\"1\"/>",
    "afterSvg": ""
  },
  "vip-pass": {
    "type": "vip-pass",
    "qrBox": {
      "x": 14,
      "y": 14,
      "size": 20.16,
      "scale": 0.42,
      "color": "#FBBF24"
    },
    "beforeSvg": "<rect x=\"4\" y=\"3\" width=\"40\" height=\"42\" rx=\"6\" fill=\"#18181B\" stroke=\"#F59E0B\" stroke-width=\"2\"/>\n          <text x=\"24\" y=\"9\" fill=\"#F59E0B\" font-size=\"3.5\" font-weight=\"900\" font-family=\"sans-serif\" text-anchor=\"middle\">${text}</text>",
    "afterSvg": ""
  },
  "wedding-rsvp": {
    "type": "wedding-rsvp",
    "qrBox": {
      "x": 14,
      "y": 10,
      "size": 19.2,
      "scale": 0.4,
      "color": "#78350F"
    },
    "beforeSvg": "<rect x=\"4\" y=\"4\" width=\"40\" height=\"40\" rx=\"4\" fill=\"#FFFBEB\" stroke=\"#B45309\" stroke-width=\"1.2\"/>\n          <rect x=\"7\" y=\"7\" width=\"34\" height=\"34\" rx=\"2\" fill=\"none\" stroke=\"#D97706\" stroke-width=\"0.8\"/>\n          <text x=\"24\" y=\"39.5\" fill=\"#78350F\" font-size=\"3.5\" font-family=\"serif\" text-anchor=\"middle\">${text}</text>",
    "afterSvg": ""
  },
  "festive-holiday": {
    "type": "festive-holiday",
    "qrBox": {
      "x": 14,
      "y": 10,
      "size": 20.16,
      "scale": 0.42,
      "color": "#991B1B"
    },
    "beforeSvg": "<rect x=\"4\" y=\"4\" width=\"40\" height=\"40\" rx=\"5\" fill=\"#FEF2F2\" stroke=\"#DC2626\" stroke-width=\"1.5\"/>\n          <circle cx=\"24\" cy=\"5\" r=\"2.5\" fill=\"#15803D\"/>\n          <text x=\"24\" y=\"39.5\" fill=\"#DC2626\" font-size=\"3\" font-weight=\"bold\" font-family=\"sans-serif\" text-anchor=\"middle\">${text}</text>",
    "afterSvg": ""
  },
  "conference-badge": {
    "type": "conference-badge",
    "qrBox": {
      "x": 14,
      "y": 14,
      "size": 20.16,
      "scale": 0.42,
      "color": "#334155"
    },
    "beforeSvg": "<rect x=\"4\" y=\"3\" width=\"40\" height=\"42\" rx=\"5\" fill=\"#FFFFFF\" stroke=\"#CBD5E1\" stroke-width=\"1.2\"/>\n          <rect x=\"4\" y=\"3\" width=\"40\" height=\"7\" rx=\"3\" fill=\"#7C3AED\"/>\n          <text x=\"24\" y=\"8\" fill=\"#FFFFFF\" font-size=\"3.2\" font-weight=\"bold\" font-family=\"sans-serif\" text-anchor=\"middle\">${text}</text>",
    "afterSvg": ""
  },
  "boarding-pass": {
    "type": "boarding-pass",
    "qrBox": {
      "x": 14,
      "y": 14,
      "size": 20.16,
      "scale": 0.42,
      "color": "#0369A1"
    },
    "beforeSvg": "<rect x=\"4\" y=\"4\" width=\"40\" height=\"40\" rx=\"4\" fill=\"#FFFFFF\" stroke=\"#0284C7\" stroke-width=\"1.5\"/>\n          <text x=\"10\" y=\"9\" fill=\"#0284C7\" font-size=\"4\">✈</text>\n          <text x=\"24\" y=\"9\" fill=\"#0369A1\" font-size=\"3.2\" font-weight=\"bold\" font-family=\"sans-serif\" text-anchor=\"middle\">${text}</text>",
    "afterSvg": ""
  },
  "wristband": {
    "type": "wristband",
    "qrBox": {
      "x": 14,
      "y": 13,
      "size": 18.24,
      "scale": 0.38,
      "color": "#FFFFFF"
    },
    "beforeSvg": "<rect x=\"4\" y=\"10\" width=\"40\" height=\"28\" rx=\"4\" fill=\"#10B981\" stroke=\"#059669\" stroke-width=\"1.2\"/>\n          <rect x=\"36\" y=\"10\" width=\"8\" height=\"28\" rx=\"2\" fill=\"#047857\"/>",
    "afterSvg": ""
  },
  "brutalist-shadow": {
    "type": "brutalist-shadow",
    "qrBox": {
      "x": 12,
      "y": 7,
      "size": 19.2,
      "scale": 0.4,
      "color": "#334155"
    },
    "beforeSvg": "<rect x=\"8\" y=\"8\" width=\"36\" height=\"36\" rx=\"2\" fill=\"#000000\"/>\n          <rect x=\"4\" y=\"4\" width=\"36\" height=\"36\" rx=\"2\" fill=\"#FFFFFF\" stroke=\"#000000\" stroke-width=\"2\"/>\n          <rect x=\"4\" y=\"29\" width=\"36\" height=\"11\" fill=\"#1E293B\" stroke=\"#000000\" stroke-width=\"1.5\"/>\n          <text x=\"22\" y=\"36.5\" fill=\"#FFFFFF\" font-size=\"4.2\" font-weight=\"900\" font-family=\"sans-serif\" text-anchor=\"middle\">${text}</text>",
    "afterSvg": ""
  },
  "dashed-coupon": {
    "type": "dashed-coupon",
    "qrBox": {
      "x": 14,
      "y": 11,
      "size": 19.2,
      "scale": 0.4,
      "color": "#334155"
    },
    "beforeSvg": "<rect x=\"4\" y=\"4\" width=\"40\" height=\"40\" rx=\"4\" fill=\"#FFFFFF\" stroke=\"#1E293B\" stroke-width=\"1.5\" stroke-dasharray=\"3,2\"/>\n          <text x=\"8\" y=\"9\" fill=\"#1E293B\" font-size=\"3.5\">✂</text>\n          <text x=\"24\" y=\"40\" fill=\"#1E293B\" font-size=\"3.2\" font-weight=\"bold\" font-family=\"sans-serif\" text-anchor=\"middle\">${text}</text>",
    "afterSvg": ""
  },
  "inset-bevel": {
    "type": "inset-bevel",
    "qrBox": {
      "x": 14,
      "y": 14,
      "size": 20.16,
      "scale": 0.42,
      "color": "#334155"
    },
    "beforeSvg": "<rect x=\"4\" y=\"4\" width=\"40\" height=\"40\" rx=\"5\" fill=\"#E2E8F0\" stroke=\"#94A3B8\" stroke-width=\"1.5\"/>\n          <rect x=\"7\" y=\"7\" width=\"34\" height=\"34\" rx=\"3\" fill=\"#FFFFFF\" stroke=\"#CBD5E1\" stroke-width=\"1\"/>",
    "afterSvg": ""
  },
  "architect-pillars": {
    "type": "architect-pillars",
    "qrBox": {
      "x": 14,
      "y": 14,
      "size": 20.16,
      "scale": 0.42,
      "color": "#334155"
    },
    "beforeSvg": "<rect x=\"4\" y=\"4\" width=\"40\" height=\"40\" rx=\"4\" fill=\"#FFFFFF\" stroke=\"#CBD5E1\" stroke-width=\"1\"/>\n          <rect x=\"4\" y=\"4\" width=\"5\" height=\"40\" fill=\"#1E293B\"/>\n          <rect x=\"39\" y=\"4\" width=\"5\" height=\"40\" fill=\"#1E293B\"/>",
    "afterSvg": ""
  },
  "gradient-stroke": {
    "type": "gradient-stroke",
    "qrBox": {
      "x": 14,
      "y": 14,
      "size": 20.16,
      "scale": 0.42,
      "color": "#334155"
    },
    "beforeSvg": "<defs>\n            <linearGradient id=\"grad-thumb-${framePreset.id}\" x1=\"0%\" y1=\"0%\" x2=\"100%\" y2=\"100%\">\n              <stop offset=\"0%\" stop-color=\"#FF5733\" />\n              <stop offset=\"50%\" stop-color=\"#9333EA\" />\n              <stop offset=\"100%\" stop-color=\"#2563EB\" />\n            </linearGradient>\n          </defs>\n          <rect x=\"4\" y=\"4\" width=\"40\" height=\"40\" rx=\"6\" fill=\"#FFFFFF\" stroke=\"url(#grad-thumb-${framePreset.id})\" stroke-width=\"2.5\"/>",
    "afterSvg": ""
  }
};

  // 2. Mini QR Code vector snippet for thumbnail previews
  function miniQr(x, y, s = 0.42, color = '#334155') {
    return `
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
  }

  // 3. Fast SVG Generator for 45 Style Preset Thumbnails (Preserved Exactly)
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

  // Check whether a frame design has CTA text support
  function isFrameCtaSupported(frameType) {
    if (!frameType || frameType === 'none') return false;
    const def = FRAME_TEMPLATES[frameType];
    if (!def) return false;
    const all = (def.beforeSvg || '') + (def.afterSvg || '');
    return all.includes('<text');
  }

  // 4. Fast SVG Generator for 52 Frame Preset Thumbnails
  function generateFrameThumbnailSvg(framePreset) {
    if (!framePreset) return '';
    const def = FRAME_TEMPLATES[framePreset.type] || FRAME_TEMPLATES['none'];
    const text = (framePreset.defaultText || 'SCAN').toUpperCase();

    const before = (def.beforeSvg || '')
      .replace(/\${text(?:\.slice\(0,\s*\d+\))?\}/g, text);

    const after = (def.afterSvg || '')
      .replace(/\${text(?:\.slice\(0,\s*\d+\))?\}/g, text);

    const mini = (def.type === 'none')
      ? miniQr(14, 14, 0.42)
      : miniQr(def.qrBox.x, def.qrBox.y, def.qrBox.scale, def.qrBox.color);

    return `
      <svg viewBox="0 0 48 48" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        ${before}
        ${mini}
        ${after}
      </svg>
    `.trim();
  }

  // Helper: Draw rounded rect
  function drawRoundRect(ctx, x, y, w, h, r) {
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, r);
      return;
    }
    const rad = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.arcTo(x + w, y, x + w, y + rad, rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.arcTo(x + w, y + h, x + w - rad, y + h, rad);
    ctx.lineTo(x + rad, y + h);
    ctx.arcTo(x, y + h, x, y + h - rad, rad);
    ctx.lineTo(x, y + rad);
    ctx.arcTo(x, y, x + rad, y, rad);
  }

  // 5. Deterministic Vector Element Drawing for Canvas
  function drawVectorSnippet(ctx, snippet, textValue, frameColor, bgColor, textColor) {
    if (!snippet) return;

    const effectiveText = (textValue !== undefined && textValue !== null) ? String(textValue) : '';

    const processed = snippet
      .replace(/\${text(?:\.slice\(0,\s*\d+\))?\}/g, effectiveText);

    const tagRegex = /<([a-zA-Z0-9]+)\s+([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/g;
    let tagMatch;

    while ((tagMatch = tagRegex.exec(processed)) !== null) {
      const tag = tagMatch[1];
      const attrsStr = tagMatch[2];
      const textContent = tagMatch[3] ? tagMatch[3].trim() : '';

      if (tag === 'defs' || tag === 'linearGradient' || tag === 'stop') continue;

      const attrs = {};
      const attrRegex = /([a-zA-Z0-9\-]+)="([^"]*)"/g;
      let attrMatch;
      while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
        attrs[attrMatch[1]] = attrMatch[2];
      }

      ctx.save();

      let fill = attrs.fill;
      let stroke = attrs.stroke;
      const strokeWidth = attrs['stroke-width'] ? parseFloat(attrs['stroke-width']) : 1;
      const strokeDash = attrs['stroke-dasharray'] ? attrs['stroke-dasharray'].split(',').map(s => parseFloat(s.trim())) : null;

      if (strokeDash) ctx.setLineDash(strokeDash);

      // Custom color overrides if user explicitly customized colors
      if (frameColor && (fill === '#1E293B' || fill === '#0F172A' || fill === '#18181B')) {
        fill = frameColor;
      }
      if (bgColor && (attrs.x === '4' && attrs.y === '3' && attrs.width === '40') && fill === '#FFFFFF') {
        fill = bgColor;
      }
      if (textColor && tag === 'text') {
        fill = textColor;
      }

      if (tag === 'rect') {
        const x = parseFloat(attrs.x || 0);
        const y = parseFloat(attrs.y || 0);
        const w = parseFloat(attrs.width || 0);
        const h = parseFloat(attrs.height || 0);
        const rx = parseFloat(attrs.rx || 0);

        ctx.beginPath();
        if (rx > 0) {
          drawRoundRect(ctx, x, y, w, h, rx);
        } else {
          ctx.rect(x, y, w, h);
        }
        if (fill && fill !== 'none') {
          ctx.fillStyle = fill;
          ctx.fill();
        }
        if (stroke && stroke !== 'none') {
          if (stroke.startsWith('url(#')) {
            const grad = ctx.createLinearGradient(4, 4, 44, 44);
            grad.addColorStop(0, '#FF5733');
            grad.addColorStop(0.5, '#9333EA');
            grad.addColorStop(1, '#2563EB');
            ctx.strokeStyle = grad;
          } else {
            ctx.strokeStyle = stroke;
          }
          ctx.lineWidth = strokeWidth;
          ctx.stroke();
        }
      } else if (tag === 'path') {
        if (typeof Path2D !== 'undefined') {
          const p = new Path2D(attrs.d);
          if (fill && fill !== 'none') {
            ctx.fillStyle = fill;
            ctx.fill(p);
          }
          if (stroke && stroke !== 'none') {
            ctx.strokeStyle = stroke;
            ctx.lineWidth = strokeWidth;
            if (attrs['stroke-linecap']) ctx.lineCap = attrs['stroke-linecap'];
            ctx.stroke(p);
          }
        }
      } else if (tag === 'circle') {
        const cx = parseFloat(attrs.cx || 0);
        const cy = parseFloat(attrs.cy || 0);
        const r = parseFloat(attrs.r || 0);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        if (fill && fill !== 'none') {
          ctx.fillStyle = fill;
          ctx.fill();
        }
        if (stroke && stroke !== 'none') {
          ctx.strokeStyle = stroke;
          ctx.lineWidth = strokeWidth;
          ctx.stroke();
        }
      } else if (tag === 'polygon') {
        const pts = (attrs.points || '').trim().split(/[\s,]+/).map(Number);
        if (pts.length >= 4) {
          ctx.beginPath();
          ctx.moveTo(pts[0], pts[1]);
          for (let i = 2; i < pts.length; i += 2) {
            ctx.lineTo(pts[i], pts[i + 1]);
          }
          ctx.closePath();
          if (fill && fill !== 'none') {
            ctx.fillStyle = fill;
            ctx.fill();
          }
          if (stroke && stroke !== 'none') {
            ctx.strokeStyle = stroke;
            ctx.lineWidth = strokeWidth;
            ctx.stroke();
          }
        }
      } else if (tag === 'line') {
        const x1 = parseFloat(attrs.x1 || 0);
        const y1 = parseFloat(attrs.y1 || 0);
        const x2 = parseFloat(attrs.x2 || 0);
        const y2 = parseFloat(attrs.y2 || 0);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        if (stroke && stroke !== 'none') {
          ctx.strokeStyle = stroke;
          ctx.lineWidth = strokeWidth;
          ctx.stroke();
        }
      } else if (tag === 'text') {
        if (!textContent || !textContent.trim()) {
          ctx.restore();
          continue;
        }

        const x = parseFloat(attrs.x || 0);
        const y = parseFloat(attrs.y || 0);
        let fontSize = attrs['font-size'] ? parseFloat(attrs['font-size']) : 4;
        const fontWeight = attrs['font-weight'] || 'bold';
        const fontFamily = attrs['font-family'] || 'Inter, sans-serif';
        const anchor = attrs['text-anchor'] || 'start';

        // Auto-scale font size if text is longer so it never clips or overflows
        const maxExpectedChars = 8;
        if (textContent.length > maxExpectedChars) {
          const scaleDown = maxExpectedChars / textContent.length;
          fontSize = Math.max(2.2, fontSize * Math.max(0.65, scaleDown));
        }

        ctx.fillStyle = fill || '#FFFFFF';
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        ctx.textAlign = (anchor === 'middle' ? 'center' : (anchor === 'end' ? 'right' : 'left'));
        ctx.textBaseline = 'alphabetic';

        if (attrs.transform) {
          const rotMatch = attrs.transform.match(/rotate\(([^,]+),\s*([^,]+),\s*([^)]+)\)/);
          if (rotMatch) {
            const deg = parseFloat(rotMatch[1]) * Math.PI / 180;
            const cx = parseFloat(rotMatch[2]);
            const cy = parseFloat(rotMatch[3]);
            ctx.translate(cx, cy);
            ctx.rotate(deg);
            ctx.translate(-cx, -cy);
          }
        }

        ctx.fillText(textContent, x, y);
      }

      ctx.restore();
    }
  }

  // 6. Draw Label Text Customization
  function drawLabelText(ctx, labelConfig, canvasW, canvasH, pos, fontSize, pad) {
    if (!labelConfig || !labelConfig.text || !labelConfig.text.trim()) return;

    ctx.save();
    const text = String(labelConfig.text).trim();
    const fontFamily = labelConfig.fontFamily || 'Inter, sans-serif';
    const fontWeight = labelConfig.fontWeight || '600';
    const textColor = labelConfig.textColor || '#121214';
    const bgColor = labelConfig.bgColor || 'transparent';
    const align = labelConfig.align || 'center';

    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'middle';

    let drawX = canvasW / 2;
    let drawY = canvasH - pad;
    let boxX = 0;
    let boxY = 0;
    let boxW = canvasW;
    let boxH = fontSize * 1.5 + pad * 2;

    if (pos === 'top') {
      boxX = 0;
      boxY = 0;
      boxW = canvasW;
      boxH = fontSize * 1.5 + pad * 2;
      drawY = boxH / 2;
    } else if (pos === 'bottom') {
      boxX = 0;
      boxY = canvasH - (fontSize * 1.5 + pad * 2);
      boxW = canvasW;
      boxH = fontSize * 1.5 + pad * 2;
      drawY = boxY + boxH / 2;
    } else if (pos === 'left') {
      boxX = 0;
      boxY = 0;
      boxW = fontSize * 1.5 + pad * 2;
      boxH = canvasH;
      drawX = boxW / 2;
      drawY = canvasH / 2;
    } else if (pos === 'right') {
      boxW = fontSize * 1.5 + pad * 2;
      boxX = canvasW - boxW;
      boxY = 0;
      boxH = canvasH;
      drawX = boxX + boxW / 2;
      drawY = canvasH / 2;
    }

    if (bgColor && bgColor !== 'transparent' && bgColor !== 'rgba(0,0,0,0)') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(boxX, boxY, boxW, boxH);
    }

    if (pos === 'left' || pos === 'right') {
      ctx.save();
      ctx.translate(drawX, drawY);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.fillText(text, 0, 0);
      ctx.restore();
    } else {
      if (align === 'left') drawX = pad + 16;
      else if (align === 'right') drawX = canvasW - pad - 16;
      ctx.textAlign = align;
      ctx.fillStyle = textColor;
      ctx.fillText(text, drawX, drawY);
    }

    ctx.restore();
  }

  // 7. Main Preview & Export Composite Canvas Renderer
  function renderComposite(baseQRCanvas, framePreset, frameOptions, labelConfig) {
    if (!baseQRCanvas) return null;

    const qrW = baseQRCanvas.width || 320;
    const qrH = baseQRCanvas.height || 320;
    const preset = framePreset || { id: 'frame-none', type: 'none', defaultText: '' };
    const opts = Object.assign({
      color: null,
      textColor: null,
      bgColor: null,
      text: (frameOptions && frameOptions.text !== undefined) ? frameOptions.text : (preset.defaultText || 'SCAN ME')
    }, frameOptions || {});

    const hasLabel = Boolean(labelConfig && labelConfig.text && labelConfig.text.trim().length > 0);
    const labelPos = (labelConfig && labelConfig.position) || 'bottom';
    const labelPad = (labelConfig && typeof labelConfig.padding === 'number') ? labelConfig.padding : 12;
    const labelFontSize = (labelConfig && labelConfig.fontSize) ? parseInt(labelConfig.fontSize, 10) : 16;
    const labelExtraH = hasLabel && (labelPos === 'top' || labelPos === 'bottom') ? Math.round(labelFontSize * 1.5 + labelPad * 2) : 0;
    const labelExtraW = hasLabel && (labelPos === 'left' || labelPos === 'right') ? Math.round(labelFontSize * 1.5 + labelPad * 2) : 0;

    const baseDim = Math.max(480, qrW);
    const frameSize = baseDim;
    const totalW = frameSize + labelExtraW;
    const totalH = frameSize + labelExtraH;

    const outCanvas = (typeof document !== 'undefined' && document.createElement)
      ? document.createElement('canvas')
      : { width: totalW, height: totalH, getContext: () => null };

    outCanvas.width = totalW;
    outCanvas.height = totalH;
    const ctx = outCanvas.getContext ? outCanvas.getContext('2d') : null;
    if (!ctx) return baseQRCanvas;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const frameOffsetX = (hasLabel && labelPos === 'left') ? labelExtraW : 0;
    const frameOffsetY = (hasLabel && labelPos === 'top') ? labelExtraH : 0;

    if (preset.type === 'none') {
      const centerScale = Math.min((frameSize * 0.88) / qrW, (frameSize * 0.88) / qrH);
      const drawW = qrW * centerScale;
      const drawH = qrH * centerScale;
      const qrDrawX = frameOffsetX + (frameSize - drawW) / 2;
      const qrDrawY = frameOffsetY + (frameSize - drawH) / 2;

      ctx.drawImage(baseQRCanvas, qrDrawX, qrDrawY, drawW, drawH);
    } else {
      const def = FRAME_TEMPLATES[preset.type] || FRAME_TEMPLATES['banner-bottom'];
      const S = frameSize / 48;

      ctx.save();
      ctx.translate(frameOffsetX, frameOffsetY);
      ctx.scale(S, S);

      // 1. Draw frame elements behind the QR
      drawVectorSnippet(ctx, def.beforeSvg, opts.text, opts.color, opts.bgColor, opts.textColor);

      // 2. Draw base QR code at exact normalized coordinates
      const box = def.qrBox;
      ctx.drawImage(baseQRCanvas, box.x, box.y, box.size, box.size);

      // 3. Draw frame elements in front of the QR
      drawVectorSnippet(ctx, def.afterSvg, opts.text, opts.color, opts.bgColor, opts.textColor);

      ctx.restore();
    }

    // 4. Draw label text if active
    if (hasLabel) {
      drawLabelText(ctx, labelConfig, totalW, totalH, labelPos, labelFontSize, labelPad);
    }

    return outCanvas;
  }

  // 8. Vector SVG Export Generator
  function getCompositeSvg(baseQRCanvas, framePreset, frameOptions, labelConfig) {
    const preset = framePreset || { id: 'frame-none', type: 'none', defaultText: '' };
    const opts = Object.assign({
      color: null,
      textColor: null,
      bgColor: null,
      text: (frameOptions && frameOptions.text !== undefined) ? frameOptions.text : (preset.defaultText || 'SCAN ME')
    }, frameOptions || {});

    const qrDataUrl = (baseQRCanvas && baseQRCanvas.toDataURL)
      ? baseQRCanvas.toDataURL('image/png')
      : '';

    if (preset.type === 'none') {
      return `<?xml version="1.0" encoding="utf-8"?>
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 48 48" width="480" height="480">
  <image x="4" y="4" width="40" height="40" xlink:href="${qrDataUrl}"/>
</svg>`;
    }

    const def = FRAME_TEMPLATES[preset.type] || FRAME_TEMPLATES['banner-bottom'];
    const effectiveText = (opts.text !== undefined && opts.text !== null) ? String(opts.text) : '';

    const before = (def.beforeSvg || '')
      .replace(/\${text(?:\.slice\(0,\s*\d+\))?\}/g, effectiveText);

    const after = (def.afterSvg || '')
      .replace(/\${text(?:\.slice\(0,\s*\d+\))?\}/g, effectiveText);

    const box = def.qrBox;
    const qrImage = `<image x="${box.x}" y="${box.y}" width="${box.size}" height="${box.size}" xlink:href="${qrDataUrl}"/>`;

    return `<?xml version="1.0" encoding="utf-8"?>
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 48 48" width="480" height="480">
  ${before}
  ${qrImage}
  ${after}
</svg>`.trim();
  }

  // 9. Exported Module Interface
  const QRFrameRenderer = {
    FRAME_TEMPLATES: FRAME_TEMPLATES,
    renderComposite: renderComposite,
    generateStyleThumbnailSvg: generateStyleThumbnailSvg,
    generateFrameThumbnailSvg: generateFrameThumbnailSvg,
    getCompositeSvg: getCompositeSvg,
    isFrameCtaSupported: isFrameCtaSupported,
    drawLabelText: drawLabelText
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = QRFrameRenderer;
  }
  if (typeof window !== 'undefined') {
    window.QRFrameRenderer = QRFrameRenderer;
  }
})(typeof window !== 'undefined' ? window : globalThis);
