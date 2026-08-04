import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface CoordinatePickerProps {
  coordinates?: [number, number] | null;
  onChange: (coordinates: [number, number]) => void;
}

export const CoordinatePicker: React.FC<CoordinatePickerProps> = ({ coordinates, onChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const initial: [number, number] = coordinates?.length === 2
      ? [coordinates[1], coordinates[0]]
      : [16.047, 108.206];
    const map = L.map(containerRef.current, { center: initial, zoom: coordinates ? 15 : 5, zoomControl: true });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: '&copy; OpenStreetMap &copy; CARTO',
    }).addTo(map);
    const marker = L.marker(initial, { draggable: true }).addTo(map);
    marker.on('dragend', () => {
      const position = marker.getLatLng();
      onChangeRef.current([position.lng, position.lat]);
    });
    map.on('click', (event) => {
      marker.setLatLng(event.latlng);
      onChangeRef.current([event.latlng.lng, event.latlng.lat]);
    });
    mapRef.current = map;
    markerRef.current = marker;
    window.setTimeout(() => map.invalidateSize(), 0);
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !coordinates || coordinates.length !== 2) return;
    const position: [number, number] = [coordinates[1], coordinates[0]];
    markerRef.current.setLatLng(position);
    mapRef.current.setView(position, Math.max(mapRef.current.getZoom(), 12));
  }, [coordinates]);

  return <div ref={containerRef} className="w-full h-48 rounded-2xl overflow-hidden border border-sky-200" />;
};
