import React from 'react';
import { Navigation, X } from 'lucide-react';
import { ToiletLite } from '../types';

interface DetailDrawerProps {
  toilet: ToiletLite | null;
  onClose: () => void;
}

export const DetailDrawer: React.FC<DetailDrawerProps> = ({ toilet, onClose }) => {
  if (!toilet) return null;

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${toilet.lat},${toilet.lng}`;

  return (
    <div id="detail-drawer" className="detail-drawer">
      <button id="close-drawer-btn" className="close-drawer-btn" onClick={onClose} aria-label="閉じる">
        <X size={20} />
      </button>

      <div className="drawer-title-row">
        <span style={{ fontSize: '1.6rem' }}>🚻</span>
        <div>
          <h2 className="drawer-title">{toilet.n}</h2>
          <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
            {toilet.p && (
              <span className="card-org" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd' }}>
                {toilet.p}
              </span>
            )}
            <span className="card-org">{toilet.l}</span>
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
          <div className="drawer-info-label">自治体・情報提供</div>
          <div className="drawer-info-val">{toilet.s || toilet.l}</div>
        </div>
        <div>
          <div className="drawer-info-label">備考・特記事項</div>
          <div className="drawer-info-val">{toilet.r || '特記なし'}</div>
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
