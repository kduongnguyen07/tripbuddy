import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Sun, Moon, MapPin } from 'lucide-react';
import { Destination } from '../../types';
import archipelagosData from '../../data/archipelagosData.json';
import { useData } from '../../context/DataContext';

interface MapProps {
  selectedDestination: Destination;
  allDestinations: Destination[];
  onSelectDestination: (dest: Destination) => void;
}

export const MapboxMap: React.FC<MapProps> = ({
  selectedDestination,
  allDestinations = [],
  onSelectDestination,
}) => {
  const { theme: globalTheme } = useData();

  const currentDest = selectedDestination || (allDestinations && allDestinations.length > 0 ? allDestinations[0] : null) || {
    id: 'HAN',
    name: 'Hà Nội',
    region: 'Miền Bắc',
    coordinates: [105.8542, 21.0285]
  };

  // Map mode state: defaults to globalTheme ('dark' or 'light')
  const [mapTheme, setMapTheme] = useState<'dark' | 'light'>(
    globalTheme === 'light' ? 'light' : 'dark'
  );

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  // Toggle map dark/light tile layer
  const toggleMapTheme = () => {
    setMapTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Sync with global theme change
  useEffect(() => {
    setMapTheme(globalTheme === 'light' ? 'light' : 'dark');
  }, [globalTheme]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialCoords: [number, number] = (currentDest.coordinates && currentDest.coordinates.length === 2)
      ? [currentDest.coordinates[1], currentDest.coordinates[0]]
      : [16.0, 108.0];

    // Initialize Leaflet Map
    const map = L.map(mapContainerRef.current, {
      center: initialCoords,
      zoom: 5.5,
      zoomControl: false,
      attributionControl: false,
    });

    const tileUrl =
      mapTheme === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapRef.current = map;

    // 1. Add Archipelago Markers (Single uniform neutral gray style)
    archipelagosData.forEach((arch) => {
      if (!arch.coordinates || arch.coordinates.length !== 2) return;
      const icon = L.divIcon({
        className: 'custom-arch-marker',
        html: `
          <div style="
            background: ${mapTheme === 'dark' ? 'rgba(30, 41, 59, 0.9)' : 'rgba(241, 245, 249, 0.9)'};
            border: 1px solid ${mapTheme === 'dark' ? '#475569' : '#cbd5e1'};
            color: ${mapTheme === 'dark' ? '#94a3b8' : '#475569'};
            padding: 3px 8px;
            border-radius: 16px;
            font-size: 10px;
            font-weight: 600;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 4px;
          ">
            <span>🇻🇳</span> ${arch.name}
          </div>
        `,
        iconSize: [140, 26],
        iconAnchor: [70, 13],
      });

      L.marker([arch.coordinates[1], arch.coordinates[0]], { icon })
        .bindPopup(`
          <div style="color: #0f172a; padding: 4px; font-family: sans-serif;">
            <h4 style="font-weight: bold; margin-bottom: 2px; font-size: 12px;">${arch.name}</h4>
            <p style="font-size: 10px; color: #475569;">${arch.description}</p>
          </div>
        `)
        .addTo(map);
    });

    // 2. Add Destination Markers (ONLY Selected is GOLD/YELLOW, ALL others are UNIFORM NEUTRAL GRAY)
    (allDestinations || []).forEach((dest) => {
      if (!dest || !dest.coordinates || dest.coordinates.length !== 2) return;
      const isSelected = currentDest && dest.id === currentDest.id;

      const icon = L.divIcon({
        className: 'custom-dest-marker',
        html: `
          <div style="
            background: ${
              isSelected
                ? '#d4af37'
                : mapTheme === 'dark'
                ? '#1e293b'
                : '#ffffff'
            };
            color: ${
              isSelected
                ? '#0C0805'
                : mapTheme === 'dark'
                ? '#cbd5e1'
                : '#334155'
            };
            border: ${
              isSelected
                ? '2px solid #fbbf24'
                : mapTheme === 'dark'
                ? '1px solid #475569'
                : '1px solid #cbd5e1'
            };
            padding: 4px 10px;
            border-radius: 14px;
            font-size: 11px;
            font-weight: ${isSelected ? '900' : '600'};
            box-shadow: ${
              isSelected
                ? '0 0 20px rgba(212, 175, 55, 0.95), 0 4px 12px rgba(0,0,0,0.5)'
                : '0 2px 6px rgba(0,0,0,0.15)'
            };
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 4px;
            cursor: pointer;
            transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
            transition: all 0.3s ease;
          ">
            <span style="color: ${isSelected ? '#0C0805' : '#64748b'}">📍</span>
            <span>${(dest.name || '').split('-')[0].trim()}</span>
          </div>
        `,
        iconSize: [130, 26],
        iconAnchor: [65, 13],
      });

      const marker = L.marker([dest.coordinates[1], dest.coordinates[0]], { icon })
        .addTo(map)
        .on('click', () => {
          onSelectDestination(dest);
        });

      markersRef.current.push(marker);
    });

    return () => {
      map.remove();
    };
  }, [allDestinations, currentDest, mapTheme]);

  // Fly to selected destination on change
  useEffect(() => {
    if (mapRef.current && currentDest && currentDest.coordinates && currentDest.coordinates.length === 2) {
      mapRef.current.flyTo(
        [currentDest.coordinates[1], currentDest.coordinates[0]],
        8.5,
        {
          duration: 1.5,
        }
      );
    }
  }, [currentDest]);

  return (
    <div className="relative w-full h-[420px] rounded-3xl overflow-hidden border border-amber-950/60 shadow-2xl">
      {/* Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full bg-[#0C0805]" />

      {/* Selected Destination Badge Overlay (Top Left) */}
      <div className="absolute top-4 left-4 z-[400] bg-[#0C0805]/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-[#d4af37]/40 flex items-center gap-2 shadow-xl">
        <span className="text-[#d4af37] font-bold">📍</span>
        <span className="text-xs font-extrabold text-white">
          Đang chọn: {currentDest?.name || 'Hà Nội'}
        </span>
      </div>

      {/* Map Dark / Light Mode Toggle Button Overlay (Top Right) */}
      <button
        onClick={toggleMapTheme}
        className="absolute top-4 right-4 z-[400] px-3.5 py-2 rounded-2xl bg-[#0C0805]/90 hover:bg-[#d4af37] hover:text-[#0C0805] text-white backdrop-blur-md border border-amber-950/60 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-extrabold shadow-xl"
        title="Chuyển chế độ Dark / Light Mode cho Bản Đồ"
      >
        {mapTheme === 'dark' ? (
          <>
            <Sun className="w-4 h-4 text-amber-400" />
            <span>Giao Diện Sáng</span>
          </>
        ) : (
          <>
            <Moon className="w-4 h-4 text-[#d4af37]" />
            <span>Giao Diện Tối</span>
          </>
        )}
      </button>
    </div>
  );
};
