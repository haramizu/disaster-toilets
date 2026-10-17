import React, { useState } from 'react';
import { Navigation, X, Globe, Edit3, Copy, Check, ExternalLink } from 'lucide-react';
import { ToiletLite } from '../types';

interface DetailDrawerProps {
  toilet: ToiletLite | null;
  onClose: () => void;
}

export const DetailDrawer: React.FC<DetailDrawerProps> = ({ toilet, onClose }) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!toilet) return null;

  const isOsm = toilet.src === 'osm';
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${toilet.lat},${toilet.lng}`;
  const osmViewUrl = `https://www.openstreetmap.org/?mlat=${toilet.lat}&mlon=${toilet.lng}#map=18/${toilet.lat}/${toilet.lng}`;
  const osmEditUrl = `https://www.openstreetmap.org/edit?editor=id#map=19/${toilet.lat}/${toilet.lng}`;
  const osmElementUrl = toilet.osmId ? `https://www.openstreetmap.org/${toilet.osmId}` : null;

  // Generate OSM tags for easy mapping copy
  const generateOsmTags = () => {
    const tags: string[] = [
      'amenity=toilets',
      `name=${toilet.n}`,
      `wheelchair=${toilet.w ? 'yes' : 'no'}`,
      `toilets:wheelchair=${toilet.w ? 'yes' : 'no'}`,
      `changing_table=${toilet.b ? 'yes' : 'no'}`,
    ];
    if (toilet.o) {
      tags.push('toilets:ostomy=yes');
    }
    if (toilet.l) {
      tags.push(`operator=${toilet.l}`);
    }
    if (toilet.h && toilet.h !== '24時間または施設開館時間中') {
      tags.push(`opening_hours=${toilet.h}`);
    }
    if (toilet.s) {
      tags.push(`source=自治体オープンデータ (${toilet.s})`);
    }
    return tags.join('\n');
  };

  const handleCopyTags = async () => {
    try {
      await navigator.clipboard.writeText(generateOsmTags());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy OSM tags:', err);
    }
  };

  return (
    <div id="detail-drawer" className="detail-drawer">
      <button id="close-drawer-btn" className="close-drawer-btn" onClick={onClose} aria-label="閉じる">
        <X size={20} />
      </button>

      <div className="drawer-title-row">
        <span style={{ fontSize: '1.6rem' }}>{isOsm ? '🗺️' : '🚻'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 className="drawer-title">{toilet.n}</h2>
          <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
            {toilet.p && (
              <span className="card-org" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd' }}>
                {toilet.p}
              </span>
            )}
            <span className="card-org">{toilet.l}</span>
            {isOsm ? (
              <span className="card-org" style={{ background: 'rgba(2, 132, 199, 0.2)', color: '#38bdf8' }}>
                OpenStreetMapデータ
              </span>
            ) : (
              <span className="card-org" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7' }}>
                自治体公式データ
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="drawer-address">📍 {toilet.a || '住所情報なし'}</div>

      <div className="drawer-grid">
        <div>
          <div className="drawer-info-label">利用可能時間</div>
          <div className="drawer-info-val">{toilet.h || '24時間利用可能'}</div>
        </div>
        <div>
          <div className="drawer-info-label">設備対応</div>
          <div className="drawer-info-val">
            {toilet.w ? '♿ 車椅子 ' : ''}
            {toilet.o ? '🩺 オストメイト ' : ''}
            {toilet.b ? '🍼 乳幼児' : ''}
            {!toilet.w && !toilet.o && !toilet.b ? '一般便器のみ' : ''}
          </div>
        </div>
        <div>
          <div className="drawer-info-label">情報提供元</div>
          <div className="drawer-info-val">
            {toilet.s || toilet.l}
            {osmElementUrl && (
              <a
                href={osmElementUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginLeft: '6px', color: '#38bdf8', fontSize: '11px', textDecoration: 'underline' }}
              >
                OSMで開く <ExternalLink size={10} style={{ display: 'inline', verticalAlign: 'middle' }} />
              </a>
            )}
          </div>
        </div>
        <div>
          <div className="drawer-info-label">備考・特記事項</div>
          <div className="drawer-info-val">{toilet.r || '特記なし'}</div>
        </div>
      </div>

      {/* OSM Integration Section */}
      <div className="drawer-osm-box">
        <div className="drawer-osm-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Globe size={15} className="text-osm" />
            <span className="drawer-osm-title">OpenStreetMap 連携機能</span>
          </div>
          <button
            className={`btn-osm-copy ${copied ? 'copied' : ''}`}
            onClick={handleCopyTags}
            title="OSMマッピング用のタグ（キー=値）をクリップボードにコピー"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied ? 'タグをコピーしました' : 'OSMタグをコピー'}</span>
          </button>
        </div>
        <p className="drawer-osm-desc">
          この施設をOpenStreetMapで閲覧、またはOSMにマッピング（現地確認・属性編集）できます。
        </p>

        <div className="drawer-osm-buttons">
          <a
            href={osmViewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-osm-action btn-osm-view"
            title="OpenStreetMap公式マップでこの地点を開く"
          >
            <Globe size={15} />
            <span>OSMで表示</span>
          </a>
          <a
            href={osmEditUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-osm-action btn-osm-edit"
            title="iDエディタを開いてOpenStreetMapを編集・更新"
          >
            <Edit3 size={15} />
            <span>OSMで編集 (iD)</span>
          </a>
        </div>
      </div>

      <div className="drawer-actions">
        <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="btn-route">
          <Navigation size={18} />
          ここへ行く（Googleマップ経路案内）
        </a>
      </div>
    </div>
  );
};

