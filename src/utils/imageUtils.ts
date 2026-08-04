// Verified high-quality image URLs for Vietnamese landmarks

export const VIETNAM_LANDMARK_IMAGES = {
  hero_background: "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=2000&q=90",
  hero_pagoda: "https://images.unsplash.com/photo-1509030450996-93f2e3d84074?auto=format&fit=crop&w=1600&q=85",
  statue_arch: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=85",
  wheel_mandala: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1000&q=85",
  ha_noi: "https://images.unsplash.com/photo-1543355890-20bc0a26fda1?auto=format&fit=crop&w=1200&q=85",
  ha_long: "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=85",
  da_nang: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=85",
  hoi_an: "https://images.unsplash.com/photo-1728012046416-a04bcd94b832?auto=format&fit=crop&w=1200&q=85",
  sapa: "https://images.unsplash.com/photo-1694152363060-cc26bde73872?auto=format&fit=crop&w=1200&q=85",
  ninh_binh: "https://images.unsplash.com/photo-1581931002350-cef5e6a37e82?auto=format&fit=crop&w=1200&q=85",
  phu_quoc: "https://images.unsplash.com/photo-1730714103959-5d5a30acf547?auto=format&fit=crop&w=1200&q=85",
  sangwa_camp: "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1400&q=85",
  festival_night: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=85"
};

// Generates a rich SVG Data URI for any destination
export function getFallbackSvg(title: string = "Việt Nam"): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#14100c"/>
        <stop offset="50%" stop-color="#241b12"/>
        <stop offset="100%" stop-color="#0C0805"/>
      </linearGradient>
      <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#d4af37"/>
        <stop offset="100%" stop-color="#f59e0b"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <circle cx="400" cy="220" r="140" fill="none" stroke="#d4af37" stroke-width="1.5" opacity="0.3" stroke-dasharray="6 4"/>
    <path d="M 150 420 Q 300 280 400 420 T 650 420" fill="none" stroke="url(#gold)" stroke-width="2" opacity="0.5"/>
    <polygon points="400,140 330,280 470,280" fill="url(#gold)" opacity="0.8"/>
    <polygon points="400,110 350,170 450,170" fill="url(#gold)"/>
    <path d="M 0 380 Q 200 300 400 380 T 800 380 L 800 500 L 0 500 Z" fill="#0C0805"/>
    <text x="400" y="440" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#ffffff" text-anchor="middle">${title}</text>
    <text x="400" y="470" font-family="Arial, sans-serif" font-size="12" letter-spacing="3" fill="#d4af37" text-anchor="middle">DU LỊCH CAO CẤP VIỆT NAM</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>, title: string = "Việt Nam") {
  const target = e.currentTarget;
  target.onerror = null; // Prevent infinite loop
  target.src = getFallbackSvg(title);
}
