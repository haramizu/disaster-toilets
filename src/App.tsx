import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ToiletLite, FilterState, UserLocation } from './types';
import { calculateDistanceKm } from './utils';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Map } from './components/Map';
import { DetailDrawer } from './components/DetailDrawer';
import './App.css';

export const App: React.FC = () => {
  const [allToilets, setAllToilets] = useState<ToiletLite[]>([]);
  const [selectedToilet, setSelectedToilet] = useState<ToiletLite | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [triggerZoom, setTriggerZoom] = useState<boolean>(false);

  const [filterState, setFilterState] = useState<FilterState>({
    keyword: '',
    prefecture: 'ALL',
    municipality: 'ALL',
    wheelchair: false,
    ostomate: false,
    baby: false,
    park: false,
    station: false,
  });

  // Fetch initial data
  useEffect(() => {
    fetch('/data/toilets_lite.json')
      .then((res) => res.json())
      .then((data: ToiletLite[]) => {
        setAllToilets(data);
      })
      .catch((err) => {
        console.error('Failed to load toilets dataset:', err);
      });
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback(
    (updater: (prev: FilterState) => FilterState, shouldZoom: boolean = false) => {
      setFilterState(updater);
      setTriggerZoom(shouldZoom);
    },
    []
  );

  // Compute filtered toilets
  const filteredToilets = useMemo(() => {
    const q = filterState.keyword.toLowerCase().trim();

    const list = allToilets.filter((t) => {
      // Prefecture
      if (filterState.prefecture !== 'ALL' && t.p !== filterState.prefecture) {
        return false;
      }
      // Municipality
      if (filterState.municipality !== 'ALL' && t.l !== filterState.municipality) {
        return false;
      }
      // Keyword
      if (q) {
        const match =
          (t.n && t.n.toLowerCase().includes(q)) ||
          (t.a && t.a.toLowerCase().includes(q)) ||
          (t.l && t.l.toLowerCase().includes(q)) ||
          (t.p && t.p.toLowerCase().includes(q));
        if (!match) return false;
      }
      // Facility chips
      if (filterState.wheelchair && !t.w) return false;
      if (filterState.ostomate && !t.o) return false;
      if (filterState.baby && !t.b) return false;
      if (filterState.park && !t.n.includes('公園') && !t.a.includes('公園')) return false;
      if (filterState.station && !t.n.includes('駅') && !t.a.includes('駅')) return false;

      return true;
    });

    // Distance calculation if user location is available
    if (userLocation) {
      list.forEach((t) => {
        t.dist = calculateDistanceKm(userLocation.lat, userLocation.lng, t.lat, t.lng);
      });
      list.sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0));
    }

    return list;
  }, [allToilets, filterState, userLocation]);

  // Handle GPS location request
  const handleRequestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('お使いのブラウザは位置情報取得に対応していません。');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setTriggerZoom(true);
      },
      (err) => {
        setIsLocating(false);
        alert('現在地を取得できませんでした: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Compute stats
  const wheelchairCount = useMemo(() => {
    return filteredToilets.filter((t) => t.w === 1).length;
  }, [filteredToilets]);

  const ostomateCount = useMemo(() => {
    return filteredToilets.filter((t) => t.o === 1).length;
  }, [filteredToilets]);

  return (
    <div id="app-container">
      <Header totalCount={allToilets.length} />

      <div id="main-content">
        <Sidebar
          toilets={allToilets}
          filteredToilets={filteredToilets}
          filterState={filterState}
          onFilterChange={handleFilterChange}
          selectedToilet={selectedToilet}
          onSelectToilet={setSelectedToilet}
          onRequestLocation={handleRequestLocation}
          isLocating={isLocating}
        />

        <main id="map-section">
          <Map
            toilets={filteredToilets}
            selectedToilet={selectedToilet}
            userLocation={userLocation}
            onSelectToilet={setSelectedToilet}
            triggerZoom={triggerZoom}
          />

          {/* Floating Stats */}
          <div className="map-overlay-card" id="map-stats-card">
            <div className="stats-item">
              <span className="stats-num" id="visible-count">
                {filteredToilets.length.toLocaleString()}
              </span>
              <span className="stats-desc">地図上の表示件数</span>
            </div>
            <div className="stats-divider" />
            <div className="stats-item">
              <span className="stats-num text-emerald" id="wheelchair-count">
                {wheelchairCount.toLocaleString()}
              </span>
              <span className="stats-desc">車椅子対応</span>
            </div>
            <div className="stats-divider" />
            <div className="stats-item">
              <span className="stats-num text-blue" id="ostomate-count">
                {ostomateCount.toLocaleString()}
              </span>
              <span className="stats-desc">オストメイト</span>
            </div>
          </div>

          <DetailDrawer
            toilet={selectedToilet}
            onClose={() => setSelectedToilet(null)}
          />
        </main>
      </div>
    </div>
  );
};

export default App;
