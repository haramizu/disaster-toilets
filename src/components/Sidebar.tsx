import React from 'react';
import { Search, Crosshair, X } from 'lucide-react';
import { ToiletLite, FilterState } from '../types';
import { formatDistance, PREFECTURE_ORDER } from '../utils';

interface SidebarProps {
  toilets: ToiletLite[];
  filteredToilets: ToiletLite[];
  filterState: FilterState;
  onFilterChange: (updater: (prev: FilterState) => FilterState, shouldZoom?: boolean) => void;
  selectedToilet: ToiletLite | null;
  onSelectToilet: (toilet: ToiletLite) => void;
  onRequestLocation: () => void;
  isLocating: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  toilets,
  filteredToilets,
  filterState,
  onFilterChange,
  selectedToilet,
  onSelectToilet,
  onRequestLocation,
  isLocating,
}) => {
  // Base toilets according to sourceFilter
  const baseToiletsBySource = React.useMemo(() => {
    if (filterState.sourceFilter === 'muni') {
      return toilets.filter((t) => t.src !== 'osm');
    }
    if (filterState.sourceFilter === 'osm') {
      return toilets.filter((t) => t.src === 'osm');
    }
    return toilets;
  }, [toilets, filterState.sourceFilter]);

  // Collect prefecture counts
  const prefCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    baseToiletsBySource.forEach((t) => {
      const p = t.p || 'その他';
      counts[p] = (counts[p] || 0) + 1;
    });
    return counts;
  }, [baseToiletsBySource]);

  // Sort prefectures in official order
  const sortedPrefectures = React.useMemo(() => {
    return Object.keys(prefCounts).sort((a, b) => {
      const idxA = PREFECTURE_ORDER.indexOf(a);
      const idxB = PREFECTURE_ORDER.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [prefCounts]);

  // Collect municipality counts based on selected prefecture
  const muniCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    const relevant = filterState.prefecture === 'ALL'
      ? baseToiletsBySource
      : baseToiletsBySource.filter((t) => t.p === filterState.prefecture);

    relevant.forEach((t) => {
      const m = t.l || 'その他';
      counts[m] = (counts[m] || 0) + 1;
    });
    return counts;
  }, [baseToiletsBySource, filterState.prefecture]);

  const sortedMunis = React.useMemo(() => {
    return Object.keys(muniCounts).sort((a, b) => muniCounts[b] - muniCounts[a]);
  }, [muniCounts]);


  const toggleChip = (key: keyof Pick<FilterState, 'wheelchair' | 'ostomate' | 'baby' | 'park' | 'station'>) => {
    onFilterChange((prev) => ({ ...prev, [key]: !prev[key] }), false);
  };

  const displayList = filteredToilets.slice(0, 60);

  return (
    <aside id="sidebar">
      {/* Search & GPS */}
      <div className="search-box-section">
        <div className="search-input-wrapper">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            id="search-input"
            placeholder="施設名・自治体・住所で検索..."
            value={filterState.keyword}
            onChange={(e) =>
              onFilterChange((prev) => ({ ...prev, keyword: e.target.value }), false)
            }
          />
          {filterState.keyword && (
            <button
              id="clear-search-btn"
              className="clear-btn"
              onClick={() => onFilterChange((prev) => ({ ...prev, keyword: '' }), false)}
              aria-label="検索クリア"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <button
          id="btn-gps-locate"
          className="btn-gps"
          onClick={onRequestLocation}
          title="現在地周辺を検索"
        >
          <Crosshair size={18} />
          {isLocating ? '取得中...' : '現在地周辺'}
        </button>
      </div>

      {/* Data Source Segmented Control (All / Municipality / OpenStreetMap) */}
      <div className="source-filter-container">
        <button
          className={`source-tab-btn ${filterState.sourceFilter === 'ALL' ? 'active' : ''}`}
          onClick={() => onFilterChange((prev) => ({ ...prev, sourceFilter: 'ALL' }), false)}
        >
          全データ ({toilets.length.toLocaleString()})
        </button>
        <button
          className={`source-tab-btn ${filterState.sourceFilter === 'muni' ? 'active' : ''}`}
          onClick={() => onFilterChange((prev) => ({ ...prev, sourceFilter: 'muni' }), false)}
        >
          🏛️ 自治体 ({toilets.filter((t) => t.src !== 'osm').length.toLocaleString()})
        </button>
        <button
          className={`source-tab-btn ${filterState.sourceFilter === 'osm' ? 'active' : ''}`}
          onClick={() => onFilterChange((prev) => ({ ...prev, sourceFilter: 'osm' }), false)}
        >
          🗺️ OSM ({toilets.filter((t) => t.src === 'osm').length.toLocaleString()})
        </button>
      </div>

      {/* Filter Chips */}
      <div className="filter-section">
        <div className="filter-title">設備・条件で絞り込み</div>
        <div className="chip-group">
          <button
            className={`filter-chip ${filterState.wheelchair ? 'active' : ''}`}
            data-filter="wheelchair"
            id="filter-wheelchair"
            onClick={() => toggleChip('wheelchair')}
          >
            <span className="chip-icon">♿</span> 車椅子対応
          </button>
          <button
            className={`filter-chip ${filterState.ostomate ? 'active' : ''}`}
            data-filter="ostomate"
            id="filter-ostomate"
            onClick={() => toggleChip('ostomate')}
          >
            <span className="chip-icon">🩺</span> オストメイト
          </button>
          <button
            className={`filter-chip ${filterState.baby ? 'active' : ''}`}
            data-filter="baby"
            id="filter-baby"
            onClick={() => toggleChip('baby')}
          >
            <span className="chip-icon">🍼</span> おむつ替え/乳幼児
          </button>
          <button
            className={`filter-chip ${filterState.park ? 'active' : ''}`}
            data-filter="park"
            id="filter-park"
            onClick={() => toggleChip('park')}
          >
            <span className="chip-icon">🌳</span> 公園内
          </button>
          <button
            className={`filter-chip ${filterState.station ? 'active' : ''}`}
            data-filter="station"
            id="filter-station"
            onClick={() => toggleChip('station')}
          >
            <span className="chip-icon">🚉</span> 駅周辺
          </button>
        </div>
      </div>

      {/* Regional Filters (Prefecture & Municipality) */}
      <div className="filter-section">
        <div className="filter-title-row">
          <span className="filter-title">地域・自治体で絞り込み</span>
          <span id="filtered-count" className="count-badge">
            {filteredToilets.length.toLocaleString()}件
          </span>
        </div>
        <div className="select-group">
          <label htmlFor="pref-select" className="dropdown-label">都道府県</label>
          <select
            id="pref-select"
            className="filter-dropdown"
            value={filterState.prefecture}
            onChange={(e) => {
              const newPref = e.target.value;
              onFilterChange(
                (prev) => ({
                  ...prev,
                  prefecture: newPref,
                  municipality: 'ALL',
                }),
                true
              );
            }}
          >
            <option value="ALL">全国すべての都道府県 (全件)</option>
            {sortedPrefectures.map((p) => (
              <option key={p} value={p}>
                {p} ({prefCounts[p]?.toLocaleString()}件)
              </option>
            ))}
          </select>
        </div>

        <div className="select-group" style={{ marginTop: '8px' }}>
          <label htmlFor="muni-select" className="dropdown-label">市区町村・自治体</label>
          <select
            id="muni-select"
            className="filter-dropdown"
            value={filterState.municipality}
            onChange={(e) => {
              const newMuni = e.target.value;
              onFilterChange((prev) => ({ ...prev, municipality: newMuni }), true);
            }}
          >
            <option value="ALL">
              {filterState.prefecture === 'ALL'
                ? 'すべての市区町村 (全国)'
                : `${filterState.prefecture}のすべての市区町村`}
            </option>
            {sortedMunis.map((m) => (
              <option key={m} value={m}>
                {m} ({muniCounts[m]?.toLocaleString()}件)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Result List */}
      <div id="toilet-list-container">
        {displayList.length === 0 ? (
          <div id="empty-state" className="empty-state">
            <p>条件に一致するトイレが見つかりませんでした。</p>
          </div>
        ) : (
          <div id="toilet-list" className="toilet-list">
            {displayList.map((t) => {
              const isSelected = selectedToilet?.n === t.n && selectedToilet?.lat === t.lat;
              return (
                <div
                  key={`${t.n}-${t.lat}-${t.lng}`}
                  className={`toilet-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => onSelectToilet(t)}
                >
                  <div className="card-header">
                    <div className="card-title">{t.n}</div>
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0, alignItems: 'center' }}>
                      {t.src === 'osm' ? (
                        <span className="card-org card-org-osm">🗺️ OSM</span>
                      ) : (
                        <span className="card-org card-org-muni">🏛️ 自治体</span>
                      )}
                      {t.p && (
                        <span
                          className="card-org"
                          style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd' }}
                        >
                          {t.p}
                        </span>
                      )}
                      <span className="card-org">{t.l}</span>
                    </div>
                  </div>
                  <div className="card-address">{t.a || '住所情報なし'}</div>
                  <div className="card-badges">
                    {t.dist !== undefined && (
                      <span className="badge badge-distance">📍 {formatDistance(t.dist)}</span>
                    )}
                    {t.w === 1 && <span className="badge badge-wheelchair">♿ 車椅子</span>}
                    {t.o === 1 && <span className="badge badge-ostomate">オストメイト</span>}
                    {t.b === 1 && <span className="badge badge-baby">おむつ替</span>}
                    {t.h && t.h !== '24時間または施設開館時間中' && (
                      <span className="badge badge-hours">🕒 {t.h}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};
