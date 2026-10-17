import React from 'react';
import { ShieldAlert, Download } from 'lucide-react';

interface HeaderProps {
  totalCount: number;
}

export const Header: React.FC<HeaderProps> = ({ totalCount }) => {
  return (
    <header id="app-header">
      <div className="header-left">
        <div className="logo-badge">
          <ShieldAlert size={22} color="#ffffff" />
        </div>
        <div>
          <h1 id="main-title">全国 災害時・公衆トイレ オープンデータ</h1>
          <p className="subtitle">自治体オープンデータ × OpenStreetMap 統合基盤</p>
        </div>
      </div>
      <div className="header-right">
        <div className="stat-pill">
          <span className="stat-label">全国収録数</span>
          <span className="stat-value" id="stat-total-count">{totalCount.toLocaleString()}</span>
          <span className="stat-unit">箇所</span>
        </div>
        <div className="header-actions">
          <a
            href="/data/disaster_toilets_japan.geojson"
            download="disaster_toilets_japan.geojson"
            className="btn-download"
            id="download-geojson-btn"
            title="GeoJSONをダウンロード"
          >
            <Download size={15} />
            GeoJSON
          </a>
          <a
            href="/data/disaster_toilets_japan.csv"
            download="disaster_toilets_japan.csv"
            className="btn-download"
            id="download-csv-btn"
            title="CSVをダウンロード"
          >
            <Download size={15} />
            CSV
          </a>
        </div>
      </div>
    </header>
  );
};
