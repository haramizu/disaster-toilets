import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import { Layers, Map as MapIcon, Globe, Image } from 'lucide-react';
import { ToiletLite, UserLocation } from '../types';

interface MapProps {
  toilets: ToiletLite[];
  selectedToilet: ToiletLite | null;
  userLocation: UserLocation | null;
  onSelectToilet: (toilet: ToiletLite) => void;
  triggerZoom: boolean;
}

type BaseMapId = 'osm' | 'carto' | 'gsi_std' | 'gsi_photo';

interface BaseMapConfig {
  id: BaseMapId;
  name: string;
  sub: string;
  url: string;
  maxZoom: number;
  attribution: string;
  icon: typeof MapIcon;
}

const BASE_MAPS: BaseMapConfig[] = [
  {
    id: 'osm',
    name: 'OpenStreetMap (公式標準)',
    sub: '世界中の有志が更新する公式標準スタイル',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    icon: Globe,
  },
  {
    id: 'carto',
    name: 'CARTO Voyager',
    sub: 'OSMベースの見やすく洗練された案内地図',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    icon: MapIcon,
  },
  {
    id: 'gsi_std',
    name: '国土地理院 標準地図',
    sub: '日本の公式基本図・避難所・自治体施設網羅',
    url: 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png',
    maxZoom: 18,
    attribution:
      '&copy; <a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">国土地理院</a>',
    icon: MapIcon,
  },
  {
    id: 'gsi_photo',
    name: '国土地理院 空中写真',
    sub: '航空写真・現地のリアルな状況を確認',
    url: 'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg',
    maxZoom: 18,
    attribution:
      '&copy; <a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">国土地理院</a>',
    icon: Image,
  },
];

export const Map: React.FC<MapProps> = ({
  toilets,
  selectedToilet,
  userLocation,
  onSelectToilet,
  triggerZoom,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const currentTileLayerRef = useRef<L.TileLayer | null>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const selectedMarkerRef = useRef<L.CircleMarker | null>(null);

  const [activeBaseMap, setActiveBaseMap] = useState<BaseMapId>('osm');
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState<boolean>(false);

  // Switch Tile Layer
  const setTileLayer = useCallback((map: L.Map, baseMapId: BaseMapId) => {
    const config = BASE_MAPS.find((m) => m.id === baseMapId) || BASE_MAPS[0];

    if (currentTileLayerRef.current) {
      map.removeLayer(currentTileLayerRef.current);
    }

    const newLayer = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxZoom: config.maxZoom,
    });

    newLayer.addTo(map);
    currentTileLayerRef.current = newLayer;
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
    }).setView([35.681236, 139.767125], 11);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Initial tile layer (OpenStreetMap)
    setTileLayer(map, 'osm');

    const clusterGroup = (L as any).markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      showCoverageOnHover: false,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount();
        let size = 'small';
        if (count > 50) size = 'medium';
        if (count > 200) size = 'large';
        return L.divIcon({
          html: `<div style="background: rgba(16, 185, 129, 0.92); color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; box-shadow: 0 0 14px rgba(16, 185, 129, 0.6); border: 2px solid #fff;"><span>${count}</span></div>`,
          className: `custom-cluster custom-cluster-${size}`,
          iconSize: L.point(36, 36),
        });
      },
    });

    map.addLayer(clusterGroup);
    mapRef.current = map;
    clusterGroupRef.current = clusterGroup;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [setTileLayer]);

  // Handle Base Map Selection
  const handleSelectBaseMap = (id: BaseMapId) => {
    setActiveBaseMap(id);
    setIsLayerMenuOpen(false);
    if (mapRef.current) {
      setTileLayer(mapRef.current, id);
    }
  };

  // Update Markers when toilets change
  useEffect(() => {
    if (!mapRef.current || !clusterGroupRef.current) return;

    const clusterGroup = clusterGroupRef.current;
    clusterGroup.clearLayers();

    const muniIcon = L.divIcon({
      className: 'custom-toilet-icon muni-icon',
      html: `
        <div style="background: #10b981; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; box-shadow: 0 2px 8px rgba(0,0,0,0.4); border: 2px solid #ffffff;">
          🚻
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    const osmIcon = L.divIcon({
      className: 'custom-toilet-icon osm-icon',
      html: `
        <div style="background: #0284c7; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; box-shadow: 0 2px 8px rgba(2,132,199,0.5); border: 2px solid #ffffff;">
          🗺️
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    const markers: L.Marker[] = [];
    toilets.forEach((t) => {
      const isOsm = t.src === 'osm';
      const marker = L.marker([t.lat, t.lng], {
        icon: isOsm ? osmIcon : muniIcon,
      });

      marker.bindTooltip(
        `<strong>${t.n}</strong><br/><span style="font-size:11px;color:#94a3b8;">${t.p || ''} ${t.l} ${isOsm ? '(OSMデータ)' : '(自治体公開)'}</span>`,
        { direction: 'top', offset: [0, -14], opacity: 0.95 }
      );

      marker.on('click', () => {
        onSelectToilet(t);
      });
      markers.push(marker);
    });

    clusterGroup.addLayers(markers);

    if (markers.length > 0 && triggerZoom) {
      const group = L.featureGroup(markers);
      mapRef.current.fitBounds(group.getBounds().pad(0.1), { maxZoom: 15, animate: true });
    }
  }, [toilets, triggerZoom, onSelectToilet]);

  // Highlight and Center on Selected Toilet
  useEffect(() => {
    if (!mapRef.current) return;

    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.remove();
      selectedMarkerRef.current = null;
    }

    if (!selectedToilet) return;

    mapRef.current.setView([selectedToilet.lat, selectedToilet.lng], 16, { animate: true });

    // Pulsing highlight circle
    const highlight = L.circleMarker([selectedToilet.lat, selectedToilet.lng], {
      radius: 18,
      fillColor: '#f59e0b',
      color: '#ffffff',
      weight: 3,
      opacity: 0.9,
      fillOpacity: 0.35,
    }).addTo(mapRef.current);

    selectedMarkerRef.current = highlight;
  }, [selectedToilet]);

  // Update User Location Marker
  useEffect(() => {
    if (!mapRef.current || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }

    const marker = L.circleMarker([userLocation.lat, userLocation.lng], {
      radius: 9,
      fillColor: '#3b82f6',
      color: '#ffffff',
      weight: 3,
      opacity: 1,
      fillOpacity: 0.9,
    })
      .addTo(mapRef.current)
      .bindPopup('あなたの現在地')
      .openPopup();

    userMarkerRef.current = marker;
    mapRef.current.setView([userLocation.lat, userLocation.lng], 14, { animate: true });
  }, [userLocation]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div id="map" ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Base Map Switcher Floating Control */}
      <div className="basemap-control-container">
        <button
          className={`basemap-toggle-btn ${isLayerMenuOpen ? 'active' : ''}`}
          onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
          title="地図レイヤー（OpenStreetMap / 国土地理院）を切り替え"
          aria-label="地図レイヤー切り替え"
        >
          <Layers size={20} />
          <span className="basemap-toggle-label">地図切替</span>
        </button>

        {isLayerMenuOpen && (
          <div className="basemap-dropdown-menu">
            <div className="basemap-menu-header">
              <span>ベースマップ選択</span>
              <span className="basemap-menu-badge">OSM連携</span>
            </div>
            <div className="basemap-options-list">
              {BASE_MAPS.map((bm) => {
                const IconComponent = bm.icon;
                const isSelected = activeBaseMap === bm.id;
                return (
                  <button
                    key={bm.id}
                    className={`basemap-option-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectBaseMap(bm.id)}
                  >
                    <div className="basemap-item-icon">
                      <IconComponent size={18} />
                    </div>
                    <div className="basemap-item-content">
                      <div className="basemap-item-name">{bm.name}</div>
                      <div className="basemap-item-sub">{bm.sub}</div>
                    </div>
                    {isSelected && <div className="basemap-check-indicator" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

