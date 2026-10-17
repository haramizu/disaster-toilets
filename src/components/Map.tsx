import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import { ToiletLite, UserLocation } from '../types';

interface MapProps {
  toilets: ToiletLite[];
  selectedToilet: ToiletLite | null;
  userLocation: UserLocation | null;
  onSelectToilet: (toilet: ToiletLite) => void;
  triggerZoom: boolean;
}

export const Map: React.FC<MapProps> = ({
  toilets,
  selectedToilet,
  userLocation,
  onSelectToilet,
  triggerZoom,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
    }).setView([35.681236, 139.767125], 11);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
    }).addTo(map);

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
          html: `<div style="background: rgba(16, 185, 129, 0.9); color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; box-shadow: 0 0 12px rgba(16, 185, 129, 0.5); border: 2px solid #fff;"><span>${count}</span></div>`,
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
  }, []);

  // Update Markers when toilets change
  useEffect(() => {
    if (!mapRef.current || !clusterGroupRef.current) return;

    const clusterGroup = clusterGroupRef.current;
    clusterGroup.clearLayers();

    const toiletIcon = L.divIcon({
      className: 'custom-toilet-icon',
      html: `
        <div style="background: #10b981; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; box-shadow: 0 2px 8px rgba(0,0,0,0.4); border: 2px solid #ffffff;">
          🚻
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    const markers: L.Marker[] = [];
    toilets.forEach((t) => {
      const marker = L.marker([t.lat, t.lng], { icon: toiletIcon });
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

  // Center on Selected Toilet
  useEffect(() => {
    if (!mapRef.current || !selectedToilet) return;
    mapRef.current.setView([selectedToilet.lat, selectedToilet.lng], 16, { animate: true });
  }, [selectedToilet]);

  // Update User Location Marker
  useEffect(() => {
    if (!mapRef.current || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }

    const marker = L.circleMarker([userLocation.lat, userLocation.lng], {
      radius: 8,
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

  return <div id="map" ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />;
};
