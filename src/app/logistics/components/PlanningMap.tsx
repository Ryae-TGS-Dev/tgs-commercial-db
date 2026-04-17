'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (map && center) {
      try {
        map.setView(center, map.getZoom(), { animate: true });
      } catch (e) {
        console.warn('Map recenter failed - engine not ready', e);
      }
    }
  }, [center, map]);
  return null;
}

interface PlanningMapProps {
  communities: any[];
  tasks: any[];
  onTaskSelect?: (task: any) => void;
  highlightedId?: string | null;
  center?: [number, number];
}

export default function PlanningMap({ communities, tasks, onTaskSelect, highlightedId, center: propCenter }: PlanningMapProps) {
  const [mounted, setMounted] = useState(false);
  
  const defaultCenter: [number, number] = [28.2101, -82.3556];
  const activeCenter = useMemo(() => propCenter || defaultCenter, [propCenter]);

  useEffect(() => {
    setMounted(true);
    // Fix leaflet marker icons
    try {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      });
    } catch (e) {
      console.warn('Leaflet icon fix failed', e);
    }
  }, []);

  // Memoize markers to prevent rapid re-renders
  const markers = useMemo(() => {
    if (!mounted) return null;
    return communities.filter(c => c.latitude && c.longitude).map((c) => {
      const isScheduled = tasks.some(t => String(t.community_id) === String(c.id));
      const isHighlighted = String(highlightedId) === String(c.id);
      
      const iconToUse = L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div class="relative flex items-center justify-center">
            ${isHighlighted ? '<div style="position: absolute; width: 48px; height: 48px; background: rgba(16, 185, 129, 0.3); border-radius: 50%; animation: pulse 1.5s infinite;"></div>' : ''}
            <div class="${isHighlighted ? 'bg-emerald-600' : isScheduled ? 'bg-emerald-500' : 'bg-zinc-800'}" style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid white; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); display: flex; items-center; justify-center; color: white; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); transform: ${isHighlighted ? 'scale(1.25)' : 'scale(1)'}; z-index: ${isHighlighted ? '50' : '10'};">
               ${isScheduled ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : '<span style="font-size: 10px; font-weight: 900;">' + (c.name?.charAt(0) || 'T') + '</span>'}
            </div>
            <div style="position: absolute; bottom: -28px; left: 50%; transform: translateX(-50%); background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(4px); padding: 2px 8px; border-radius: 4px; border: 1px solid #e5e7eb; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); white-space: nowrap; z-index: 40;">
               <span style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #111827;">${c.name}</span>
            </div>
            <style>
              @keyframes pulse {
                0% { transform: scale(0.8); opacity: 0.8; }
                100% { transform: scale(2.4); opacity: 0; }
              }
            </style>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      return (
        <Marker 
          key={`${c.id}-${isHighlighted}`} 
          position={[c.latitude, c.longitude]} 
          icon={iconToUse}
          zIndexOffset={isHighlighted ? 1000 : 0}
          eventHandlers={{
            click: () => {
              console.log('Marker clicked:', c.name, c.id);
              onTaskSelect?.({ community: c, community_id: c.id, status: 'Scheduled', service_method: 'Both' });
            }
          }}
        >
          <Popup className="custom-popup shadow-2xl">
            <div className="p-3">
              <h3 className="font-black text-sm text-zinc-900 leading-tight">{c.name}</h3>
              <p className="text-[10px] text-zinc-400 mt-1 uppercase font-black tracking-tighter">{c.company}</p>
              <div className="mt-3 pt-3 border-t border-zinc-100 flex gap-2">
                 <button 
                  onClick={() => {
                    console.log('Popup button clicked:', c.name);
                    onTaskSelect?.({ community: c, community_id: c.id, status: 'Scheduled', service_method: 'Both' });
                  }}
                  className="px-4 py-1.5 bg-zinc-900 text-white text-[10px] font-black rounded-lg uppercase tracking-widest hover:bg-zinc-700 transition"
                 >
                    Visit Form
                 </button>
              </div>
            </div>
          </Popup>
        </Marker>
      );
    });
  }, [mounted, communities, tasks, onTaskSelect, highlightedId]);

  if (!mounted) return <div className="w-full h-full bg-zinc-50 flex items-center justify-center text-zinc-300 font-bold uppercase text-xs">Readying Engine...</div>;

  return (
    <div className="w-full h-full relative overflow-hidden" id="map-parent-container">
      <MapContainer 
        key="tgs-logistics-core-map"
        center={activeCenter} 
        zoom={activeCenter === defaultCenter ? 11 : 16} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="bottomright" />
        <MapRecenter center={activeCenter} />
        {markers}
      </MapContainer>
    </div>
  );
}
