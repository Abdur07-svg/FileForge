/**
 * FileForge QR Designer - Presets Data
 * Exactly 45 Style Presets across 9 Themes
 * Exactly 52 Frame Presets across 7 Themes
 */
const QR_PRESETS_DATA = (() => {

  const STYLE_THEMES = [
    { id: 'classic', name: 'Classic & Minimal' },
    { id: 'tech', name: 'Corporate & Tech' },
    { id: 'luxury', name: 'Luxury & Elegance' },
    { id: 'nature', name: 'Nature & Eco' },
    { id: 'sunset', name: 'Sunset & Warmth' },
    { id: 'neon', name: 'Neon & Vibrant' },
    { id: 'dark', name: 'Dark Mode' },
    { id: 'pastel', name: 'Pastel & Soft' },
    { id: 'geometric', name: 'Geometric & Bold' }
  ];

  const STYLE_PRESETS = [
    // 1. Classic & Minimal (5)
    { id: 'classic-pure', name: 'Noir Classic', theme: 'classic', pattern: 'square', cornerSq: 'square', cornerDot: 'square', fgColor: '#121214', bgColor: '#FFFFFF', eyeColor: '#121214' },
    { id: 'classic-slate', name: 'Slate Clean', theme: 'classic', pattern: 'rounded', cornerSq: 'extra-rounded', cornerDot: 'dot', fgColor: '#1E293B', bgColor: '#FFFFFF', eyeColor: '#0F172A' },
    { id: 'classic-minimal', name: 'Modern Dots', theme: 'classic', pattern: 'dots', cornerSq: 'dot', cornerDot: 'dot', fgColor: '#111827', bgColor: '#F9FAFB', eyeColor: '#111827' },
    { id: 'classic-charcoal', name: 'Carbon Chic', theme: 'classic', pattern: 'classy', cornerSq: 'square', cornerDot: 'square', fgColor: '#27272A', bgColor: '#FAFAFA', eyeColor: '#18181B' },
    { id: 'classic-ink', name: 'Ink Velvet', theme: 'classic', pattern: 'extra-rounded', cornerSq: 'extra-rounded', cornerDot: 'dot', fgColor: '#09090B', bgColor: '#FFFFFF', eyeColor: '#000000' },

    // 2. Corporate & Tech (5)
    { id: 'tech-cobalt', name: 'Cobalt Blue', theme: 'tech', pattern: 'rounded', cornerSq: 'extra-rounded', cornerDot: 'square', fgColor: '#1D4ED8', bgColor: '#EFF6FF', eyeColor: '#1E40AF' },
    { id: 'tech-navy', name: 'Enterprise Navy', theme: 'tech', pattern: 'classy', cornerSq: 'square', cornerDot: 'square', fgColor: '#1E3A8A', bgColor: '#FFFFFF', eyeColor: '#172554' },
    { id: 'tech-cyan', name: 'Cyber Cyan', theme: 'tech', pattern: 'dots', cornerSq: 'dot', cornerDot: 'dot', fgColor: '#0284C7', bgColor: '#F0F9FF', eyeColor: '#0369A1' },
    { id: 'tech-indigo', name: 'Deep Indigo', theme: 'tech', pattern: 'classy-rounded', cornerSq: 'extra-rounded', cornerDot: 'dot', fgColor: '#4338CA', bgColor: '#EEF2FF', eyeColor: '#3730A3' },
    { id: 'tech-steel', name: 'Steel Precision', theme: 'tech', pattern: 'extra-rounded', cornerSq: 'square', cornerDot: 'dot', fgColor: '#2563EB', bgColor: '#F8FAFC', eyeColor: '#1D4ED8' },

    // 3. Luxury & Elegance (5)
    { id: 'luxury-violet', name: 'Royal Violet', theme: 'luxury', pattern: 'classy', cornerSq: 'extra-rounded', cornerDot: 'dot', fgColor: '#6D28D9', bgColor: '#FAF5FF', eyeColor: '#5B21B6' },
    { id: 'luxury-ruby', name: 'Imperial Ruby', theme: 'luxury', pattern: 'classy-rounded', cornerSq: 'square', cornerDot: 'square', fgColor: '#9F1239', bgColor: '#FFF1F2', eyeColor: '#881337' },
    { id: 'luxury-gold', name: 'Prestige Amber', theme: 'luxury', pattern: 'rounded', cornerSq: 'extra-rounded', cornerDot: 'square', fgColor: '#B45309', bgColor: '#FFFBEB', eyeColor: '#92400E' },
    { id: 'luxury-rose', name: 'Velvet Rose', theme: 'luxury', pattern: 'extra-rounded', cornerSq: 'dot', cornerDot: 'dot', fgColor: '#BE123C', bgColor: '#FDF2F8', eyeColor: '#9F1239' },
    { id: 'luxury-orchid', name: 'Midnight Orchid', theme: 'luxury', pattern: 'dots', cornerSq: 'extra-rounded', cornerDot: 'dot', fgColor: '#4C1D95', bgColor: '#FAF5FF', eyeColor: '#3B0764' },

    // 4. Nature & Eco (5)
    { id: 'nature-forest', name: 'Forest Emerald', theme: 'nature', pattern: 'dots', cornerSq: 'dot', cornerDot: 'dot', fgColor: '#047857', bgColor: '#ECFDF5', eyeColor: '#065F46' },
    { id: 'nature-mint', name: 'Mint Fresh', theme: 'nature', pattern: 'rounded', cornerSq: 'extra-rounded', cornerDot: 'dot', fgColor: '#059669', bgColor: '#F0FDF4', eyeColor: '#047857' },
    { id: 'nature-sage', name: 'Sage Organic', theme: 'nature', pattern: 'classy-rounded', cornerSq: 'square', cornerDot: 'dot', fgColor: '#15803D', bgColor: '#FFFFFF', eyeColor: '#166534' },
    { id: 'nature-jungle', name: 'Jungle Canopy', theme: 'nature', pattern: 'extra-rounded', cornerSq: 'extra-rounded', cornerDot: 'square', fgColor: '#065F46', bgColor: '#E6F4EA', eyeColor: '#064E3B' },
    { id: 'nature-olive', name: 'Sunlit Olive', theme: 'nature', pattern: 'square', cornerSq: 'square', cornerDot: 'square', fgColor: '#3F6212', bgColor: '#F7FEE7', eyeColor: '#365314' },

    // 5. Sunset & Warmth (5)
    { id: 'warm-coral', name: 'FileForge Coral', theme: 'sunset', pattern: 'rounded', cornerSq: 'extra-rounded', cornerDot: 'dot', fgColor: '#FF5733', bgColor: '#FFF7ED', eyeColor: '#E03E1A' },
    { id: 'warm-amber', name: 'Sunset Amber', theme: 'sunset', pattern: 'classy', cornerSq: 'square', cornerDot: 'square', fgColor: '#D97706', bgColor: '#FFFBEB', eyeColor: '#B45309' },
    { id: 'warm-crimson', name: 'Fiery Crimson', theme: 'sunset', pattern: 'square', cornerSq: 'square', cornerDot: 'dot', fgColor: '#DC2626', bgColor: '#FEF2F2', eyeColor: '#B91C1C' },
    { id: 'warm-tangerine', name: 'Golden Sun', theme: 'sunset', pattern: 'dots', cornerSq: 'dot', cornerDot: 'dot', fgColor: '#EA580C', bgColor: '#FFF7ED', eyeColor: '#C2410C' },
    { id: 'warm-terracotta', name: 'Terracotta Rust', theme: 'sunset', pattern: 'classy-rounded', cornerSq: 'extra-rounded', cornerDot: 'square', fgColor: '#C2410C', bgColor: '#FFF8F1', eyeColor: '#9A3412' },

    // 6. Neon & Vibrant (5)
    { id: 'neon-fuchsia', name: 'Electric Fuchsia', theme: 'neon', pattern: 'dots', cornerSq: 'dot', cornerDot: 'dot', fgColor: '#C026D3', bgColor: '#FDF4FF', eyeColor: '#A21CAF' },
    { id: 'neon-teal', name: 'Vivid Teal', theme: 'neon', pattern: 'extra-rounded', cornerSq: 'extra-rounded', cornerDot: 'dot', fgColor: '#0D9488', bgColor: '#F0FDFA', eyeColor: '#0F766E' },
    { id: 'neon-blaze', name: 'Neon Blaze', theme: 'neon', pattern: 'rounded', cornerSq: 'square', cornerDot: 'dot', fgColor: '#F97316', bgColor: '#FFF7ED', eyeColor: '#EA580C' },
    { id: 'neon-lime', name: 'Cyber Lime', theme: 'neon', pattern: 'classy', cornerSq: 'square', cornerDot: 'square', fgColor: '#65A30D', bgColor: '#F7FEE7', eyeColor: '#4D7C0F' },
    { id: 'neon-magenta', name: 'Hyper Magenta', theme: 'neon', pattern: 'classy-rounded', cornerSq: 'dot', cornerDot: 'dot', fgColor: '#DB2777', bgColor: '#FDF2F8', eyeColor: '#BE185D' },

    // 7. Dark Mode (5)
    { id: 'dark-pitch', name: 'Pitch Night', theme: 'dark', pattern: 'square', cornerSq: 'square', cornerDot: 'square', fgColor: '#FFFFFF', bgColor: '#111216', eyeColor: '#FFFFFF' },
    { id: 'dark-charcoal', name: 'Obsidian Gray', theme: 'dark', pattern: 'rounded', cornerSq: 'extra-rounded', cornerDot: 'dot', fgColor: '#F8FAFC', bgColor: '#181920', eyeColor: '#94A3B8' },
    { id: 'dark-blue', name: 'Midnight Blue', theme: 'dark', pattern: 'dots', cornerSq: 'dot', cornerDot: 'dot', fgColor: '#60A5FA', bgColor: '#0F172A', eyeColor: '#93C5FD' },
    { id: 'dark-emerald', name: 'Emerald Glow', theme: 'dark', pattern: 'classy', cornerSq: 'extra-rounded', cornerDot: 'dot', fgColor: '#34D399', bgColor: '#064E3B', eyeColor: '#6EE7B7' },
    { id: 'dark-amber', name: 'Cyber Amber', theme: 'dark', pattern: 'extra-rounded', cornerSq: 'square', cornerDot: 'dot', fgColor: '#FBBF24', bgColor: '#1C1917', eyeColor: '#FCD34D' },

    // 8. Pastel & Soft (5)
    { id: 'pastel-lavender', name: 'Soft Lavender', theme: 'pastel', pattern: 'rounded', cornerSq: 'extra-rounded', cornerDot: 'dot', fgColor: '#7C3AED', bgColor: '#F5F3FF', eyeColor: '#6D28D9' },
    { id: 'pastel-sky', name: 'Powder Sky', theme: 'pastel', pattern: 'dots', cornerSq: 'dot', cornerDot: 'dot', fgColor: '#0284C7', bgColor: '#F0F9FF', eyeColor: '#0369A1' },
    { id: 'pastel-blush', name: 'Blush Bloom', theme: 'pastel', pattern: 'extra-rounded', cornerSq: 'dot', cornerDot: 'dot', fgColor: '#E11D48', bgColor: '#FFF1F2', eyeColor: '#BE123C' },
    { id: 'pastel-matcha', name: 'Matcha Foam', theme: 'pastel', pattern: 'classy-rounded', cornerSq: 'extra-rounded', cornerDot: 'dot', fgColor: '#16A34A', bgColor: '#F0FDF4', eyeColor: '#15803D' },
    { id: 'pastel-sand', name: 'Warm Cashmere', theme: 'pastel', pattern: 'classy', cornerSq: 'square', cornerDot: 'square', fgColor: '#78350F', bgColor: '#FEF3C7', eyeColor: '#92400E' },

    // 9. Geometric & Bold (5)
    { id: 'geo-diamond', name: 'Diamond Edge', theme: 'geometric', pattern: 'classy', cornerSq: 'square', cornerDot: 'square', fgColor: '#18181B', bgColor: '#FFFFFF', eyeColor: '#FF5733' },
    { id: 'geo-matrix', name: 'Matrix Pulse', theme: 'geometric', pattern: 'extra-rounded', cornerSq: 'dot', cornerDot: 'dot', fgColor: '#27272A', bgColor: '#FAFAFA', eyeColor: '#2563EB' },
    { id: 'geo-edge', name: 'Sharp Contrast', theme: 'geometric', pattern: 'square', cornerSq: 'dot', cornerDot: 'square', fgColor: '#000000', bgColor: '#FFFFFF', eyeColor: '#DC2626' },
    { id: 'geo-flow', name: 'Dynamic Flow', theme: 'geometric', pattern: 'classy-rounded', cornerSq: 'extra-rounded', cornerDot: 'dot', fgColor: '#312E81', bgColor: '#EEF2FF', eyeColor: '#4338CA' },
    { id: 'geo-duo', name: 'Duo Accent', theme: 'geometric', pattern: 'dots', cornerSq: 'extra-rounded', cornerDot: 'square', fgColor: '#0F172A', bgColor: '#FFFFFF', eyeColor: '#0D9488' }
  ];

  const FRAME_THEMES = [
    { id: 'standard', name: 'Standard & Clean' },
    { id: 'badges', name: 'Badges & Tags' },
    { id: 'devices', name: 'Devices & Tech' },
    { id: 'marketing', name: 'Action & Marketing' },
    { id: 'artistic', name: 'Artistic & Shapes' },
    { id: 'events', name: 'Events & Passes' },
    { id: 'borders', name: 'Borders & Cards' }
  ];

  const FRAME_PRESETS = [
    // 1. Standard & Clean (8)
    { id: 'frame-none', name: 'No Frame', theme: 'standard', type: 'none', defaultText: '' },
    { id: 'frame-bottom-bar', name: 'Bottom Bar', theme: 'standard', type: 'banner-bottom', defaultText: 'SCAN ME' },
    { id: 'frame-top-bar', name: 'Top Bar', theme: 'standard', type: 'banner-top', defaultText: 'SCAN ME' },
    { id: 'frame-rounded-card', name: 'Rounded Card', theme: 'standard', type: 'card-rounded', defaultText: 'SCAN HERE' },
    { id: 'frame-double-border', name: 'Double Outline', theme: 'standard', type: 'double-border', defaultText: 'SCAN CODE' },
    { id: 'frame-pill-bottom', name: 'Bottom Pill Tag', theme: 'standard', type: 'pill-bottom', defaultText: 'SCAN ME' },
    { id: 'frame-pill-top', name: 'Top Pill Tag', theme: 'standard', type: 'pill-top', defaultText: 'SCAN ME' },
    { id: 'frame-corner-notches', name: 'Corner Notches', theme: 'standard', type: 'corner-notches', defaultText: 'SCAN' },

    // 2. Badges & Tags (8)
    { id: 'frame-ribbon-bottom', name: 'Ribbon Banner', theme: 'badges', type: 'ribbon-bottom', defaultText: 'SCAN ME' },
    { id: 'frame-ribbon-top', name: 'Top Ribbon', theme: 'badges', type: 'ribbon-top', defaultText: 'SPECIAL OFFER' },
    { id: 'frame-ticket-stub', name: 'Ticket Stub', theme: 'badges', type: 'ticket-stub', defaultText: 'ADMIT ONE' },
    { id: 'frame-discount-flag', name: 'Corner Flag', theme: 'badges', type: 'corner-flag', defaultText: 'DISCOUNT' },
    { id: 'frame-price-tag', name: 'Price Tag', theme: 'badges', type: 'price-tag', defaultText: 'OFFER' },
    { id: 'frame-bookmark', name: 'Bookmark Tab', theme: 'badges', type: 'bookmark-tab', defaultText: 'SAVE LINK' },
    { id: 'frame-circular-badge', name: 'Seal Emblem', theme: 'badges', type: 'seal-badge', defaultText: 'OFFICIAL' },
    { id: 'frame-floating-tag', name: 'Floating Tag', theme: 'badges', type: 'floating-tag', defaultText: 'SCAN' },

    // 3. Devices & Tech (7)
    { id: 'frame-phone-mockup', name: 'Smartphone', theme: 'devices', type: 'phone-mockup', defaultText: 'SCAN WITH PHONE' },
    { id: 'frame-tablet-card', name: 'Tablet Bezel', theme: 'devices', type: 'tablet-bezel', defaultText: 'TAP OR SCAN' },
    { id: 'frame-polaroid', name: 'Polaroid Card', theme: 'devices', type: 'polaroid', defaultText: 'Scan to View' },
    { id: 'frame-browser-window', name: 'Web Browser', theme: 'devices', type: 'browser-window', defaultText: 'VISIT WEBSITE' },
    { id: 'frame-chat-bubble', name: 'Chat Bubble', theme: 'devices', type: 'chat-bubble', defaultText: 'CHAT WITH US' },
    { id: 'frame-id-badge', name: 'ID Lanyard', theme: 'devices', type: 'id-lanyard', defaultText: 'STAFF BADGE' },
    { id: 'frame-terminal', name: 'Dev Terminal', theme: 'devices', type: 'terminal', defaultText: '> scan_qr.sh' },

    // 4. Action & Marketing (8)
    { id: 'frame-mega-cta', name: 'Mega Action Bar', theme: 'marketing', type: 'mega-cta', defaultText: 'SCAN WITH CAMERA' },
    { id: 'frame-arrow-pointer', name: 'Arrow Pointer', theme: 'marketing', type: 'arrow-pointer', defaultText: 'SCAN HERE ↓' },
    { id: 'frame-scan-to-pay', name: 'Scan To Pay', theme: 'marketing', type: 'scan-to-pay', defaultText: 'PAY HERE' },
    { id: 'frame-wifi-connect', name: 'WiFi Access', theme: 'marketing', type: 'wifi-connect', defaultText: 'CONNECT WIFI' },
    { id: 'frame-social-follow', name: 'Follow Us', theme: 'marketing', type: 'social-follow', defaultText: 'FOLLOW US' },
    { id: 'frame-menu-dining', name: 'Table Menu', theme: 'marketing', type: 'menu-dining', defaultText: 'VIEW MENU' },
    { id: 'frame-feedback-star', name: 'Review & Rate', theme: 'marketing', type: 'feedback-star', defaultText: 'RATE US ★★★★★' },
    { id: 'frame-app-download', name: 'Get The App', theme: 'marketing', type: 'app-download', defaultText: 'DOWNLOAD APP' },

    // 5. Artistic & Shapes (7)
    { id: 'frame-corner-brackets', name: 'Artisan Brackets', theme: 'artistic', type: 'corner-brackets', defaultText: 'SCAN QR' },
    { id: 'frame-geometric-hex', name: 'Hexagon Frame', theme: 'artistic', type: 'geometric-hex', defaultText: 'VERIFIED' },
    { id: 'frame-circle-ring', name: 'Circular Ring', theme: 'artistic', type: 'circle-ring', defaultText: 'SCAN' },
    { id: 'frame-arch-portal', name: 'Arch Portal', theme: 'artistic', type: 'arch-portal', defaultText: 'ENTER HERE' },
    { id: 'frame-wave-card', name: 'Wave Card', theme: 'artistic', type: 'wave-card', defaultText: 'DISCOVER MORE' },
    { id: 'frame-postage-stamp', name: 'Postage Stamp', theme: 'artistic', type: 'postage-stamp', defaultText: 'AIR MAIL' },
    { id: 'frame-neon-glow', name: 'Neon Glow', theme: 'artistic', type: 'neon-glow', defaultText: 'CYBER SCAN' },

    // 6. Events & Passes (7)
    { id: 'frame-event-ticket', name: 'Event Ticket', theme: 'events', type: 'event-ticket', defaultText: 'ADMIT ONE' },
    { id: 'frame-vip-pass', name: 'VIP Gold Pass', theme: 'events', type: 'vip-pass', defaultText: 'VIP ACCESS' },
    { id: 'frame-wedding-rsvp', name: 'Wedding RSVP', theme: 'events', type: 'wedding-rsvp', defaultText: 'PLEASE RSVP' },
    { id: 'frame-festive-garland', name: 'Festive Holiday', theme: 'events', type: 'festive-holiday', defaultText: 'HAPPY HOLIDAYS' },
    { id: 'frame-conference-badge', name: 'Attendee Pass', theme: 'events', type: 'conference-badge', defaultText: 'CONFERENCE PASS' },
    { id: 'frame-boarding-pass', name: 'Boarding Pass', theme: 'events', type: 'boarding-pass', defaultText: 'GATE ACCESS' },
    { id: 'frame-wristband', name: 'Festival Band', theme: 'events', type: 'wristband', defaultText: 'ALL ACCESS' },

    // 7. Borders & Cards (7)
    { id: 'frame-brutalist-shadow', name: 'Brutalist Drop', theme: 'borders', type: 'brutalist-shadow', defaultText: 'SCAN CODE' },
    { id: 'frame-dashed-coupon', name: 'Coupon Cutout', theme: 'borders', type: 'dashed-coupon', defaultText: 'CUT HERE ✂' },
    { id: 'frame-floating-soft', name: 'Soft Elevation', theme: 'borders', type: 'floating-soft', defaultText: 'SCAN ME' },
    { id: 'frame-inset-bevel', name: 'Beveled Frame', theme: 'borders', type: 'inset-bevel', defaultText: 'SCAN' },
    { id: 'frame-architect-pillars', name: 'Dual Pillars', theme: 'borders', type: 'architect-pillars', defaultText: 'SCAN FOR INFO' },
    { id: 'frame-viewfinder', name: 'Camera Focus', theme: 'borders', type: 'viewfinder', defaultText: 'AIM CAMERA' },
    { id: 'frame-gradient-stroke', name: 'Gradient Border', theme: 'borders', type: 'gradient-stroke', defaultText: 'EXPLORE' }
  ];

  return {
    STYLE_THEMES,
    STYLE_PRESETS,
    FRAME_THEMES,
    FRAME_PRESETS
  };
})();

if (typeof window !== 'undefined') {
  window.QR_PRESETS_DATA = QR_PRESETS_DATA;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = QR_PRESETS_DATA;
}

