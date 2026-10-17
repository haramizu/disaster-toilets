/**
 * OpenStreetMap (OSM) トイレデータ自動収集スクリプト
 * Overpass API を使用して日本の公衆トイレ・災害時利用可能トイレを取得し、
 * 自治体オープンデータと統合してアプリ用データセットを生成します。
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ToiletLite } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.resolve(ROOT_DIR, 'data');
const PUBLIC_DATA_DIR = path.resolve(ROOT_DIR, 'public', 'data');

// Overpass API Endpoints (prioritized by reliability and response time)
const OVERPASS_ENDPOINTS = [
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
];

interface OsmElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OsmElement[];
}

// Bounding boxes for major regions in Japan [minLat, minLon, maxLat, maxLon, pref, areaName]
const TARGET_AREAS: [number, number, number, number, string, string][] = [
  // 東京都心部（千代田・中央・港・新宿・渋谷）
  [35.64, 139.68, 35.72, 139.78, '東京都', '東京中心部'],
  // 東京都城北・城東（台東・墨田・江東・文京）
  [35.68, 139.77, 35.75, 139.84, '東京都', '東京下町・ベイエリア'],
  // 東京都多摩（八王子・立川・町田）
  [35.64, 139.30, 35.72, 139.45, '東京都', '多摩中心部'],
  // 神奈川県（横浜みなとみらい・関内・川崎）
  [35.43, 139.60, 35.54, 139.72, '神奈川県', '横浜・川崎'],
  // 大阪府（大阪市中心部 梅田・難波・天王寺）
  [34.64, 135.47, 34.72, 135.54, '大阪府', '大阪市中心部'],
  // 京都府（京都市中心部・観光エリア）
  [34.98, 135.74, 35.03, 135.79, '京都府', '京都市街'],
  // 兵庫県（神戸市 三宮・元町・ハーバーランド）
  [34.67, 135.16, 34.71, 135.22, '兵庫県', '神戸中心部'],
  // 愛知県（名古屋市 栄・名駅）
  [35.15, 136.87, 35.19, 136.93, '愛知県', '名古屋中心部'],
  // 福岡県（福岡市 博多・天神）
  [33.57, 130.38, 33.61, 130.43, '福岡県', '福岡・博多'],
  // 北海道（札幌市 大通・すすきの・札幌駅）
  [43.04, 141.33, 43.08, 141.37, '北海道', '札幌中心部'],
  // 宮城県（仙台市 青葉区中心部）
  [38.25, 140.85, 38.28, 140.89, '宮城県', '仙台中心部'],
  // 広島県（広島市 紙屋町・八丁堀・平和記念公園）
  [34.38, 132.44, 34.41, 132.48, '広島県', '広島中心部'],
  // 沖縄県（那覇市 国際通り・首里・新都心）
  [26.20, 127.67, 26.24, 127.72, '沖縄県', '那覇市街'],
];

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Fetch data from Overpass API with retry and endpoint fallback */
async function queryOverpass(query: string): Promise<OverpassResponse> {
  let lastError: any = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'DisasterToiletsJapanApp/1.0 (https://github.com/haramizu/disaster-toilets; developer@example.org)',
        },
        body: 'data=' + encodeURIComponent(query),
        signal: AbortSignal.timeout(15000), // 15s timeout
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const text = await res.text();
      if (!text.trim().startsWith('{')) {
        throw new Error(`Invalid non-JSON response`);
      }

      const data = JSON.parse(text) as OverpassResponse;
      if (data && Array.isArray(data.elements)) {
        return data;
      }
    } catch (err: any) {
      lastError = err;
      // Continue to next mirror immediately
    }
  }

  throw new Error(`All Overpass mirrors failed: ${lastError?.message || lastError}`);
}

/** Normalize OSM toilet element to ToiletLite */
function normalizeOsmToilet(el: OsmElement, defaultPref: string, defaultArea: string): ToiletLite | null {
  const tags = el.tags || {};
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;

  if (lat == null || lng == null) return null;

  // Name extraction
  let name = tags.name || tags['name:ja'] || tags.description;
  if (!name) {
    if (tags.operator) {
      name = `${tags.operator} 公衆トイレ`;
    } else {
      name = `${defaultArea} 公衆トイレ (${el.type}/${el.id})`;
    }
  }

  // Address
  let address = tags['addr:full'] || '';
  if (!address) {
    const parts = [
      tags['addr:province'],
      tags['addr:city'],
      tags['addr:suburb'] || tags['addr:ward'],
      tags['addr:quarter'],
      tags['addr:neighbourhood'],
      tags['addr:block_number'] || tags['addr:housenumber'],
    ].filter(Boolean);
    address = parts.join('');
  }
  if (!address) {
    address = `${defaultPref} ${defaultArea}周辺`;
  }

  // Municipality
  const muni = tags['addr:city'] || tags['addr:suburb'] || tags.operator || defaultArea;

  // Accessibility flags
  const wheelchairVal = (tags.wheelchair || tags['toilets:wheelchair'] || '').toLowerCase();
  const isWheelchair = wheelchairVal === 'yes' || wheelchairVal === 'limited' ? 1 : 0;

  const isOstomate =
    (tags['toilets:ostomy'] || tags['toilets:handicapped'] || '').toLowerCase() === 'yes' ? 1 : 0;

  const isBaby =
    (tags.changing_table || tags.diaper || tags.baby_feed || '').toLowerCase() === 'yes' ? 1 : 0;

  // Hours
  const hours = tags.opening_hours || '24時間または施設開館時間中';

  // Remarks & Tags
  const remarksList: string[] = [];
  if (tags['toilets:disaster'] === 'yes') remarksList.push('災害時利用可能指定');
  if (tags.fee === 'yes') remarksList.push('有料');
  if (tags.access) remarksList.push(`アクセス: ${tags.access}`);
  if (tags.description) remarksList.push(tags.description);

  const tTags: string[] = ['OpenStreetMap', '公衆トイレ'];
  if (isWheelchair) tTags.push('車椅子対応');
  if (isOstomate) tTags.push('オストメイト対応');
  if (isBaby) tTags.push('乳幼児設備');
  if (tags['toilets:disaster'] === 'yes') tTags.push('災害時利用可能');

  return {
    n: name,
    p: defaultPref,
    l: muni,
    a: address,
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
    w: isWheelchair,
    o: isOstomate,
    b: isBaby,
    h: hours,
    r: remarksList.join(' / ') || 'OpenStreetMapコミュニティ登録データ',
    t: tTags,
    s: 'OpenStreetMap contributors',
    src: 'osm',
    osmId: `${el.type}/${el.id}`,
  };
}

export async function fetchOsmToilets(): Promise<void> {
  console.log('=== OpenStreetMap (OSM) トイレデータ収集開始 ===');

  const osmToiletsMap = new Map<string, ToiletLite>();

  // 1. Load verified OSM seed dataset first
  const seedPath = path.join(DATA_DIR, 'osm_seed_toilets.json');
  if (fs.existsSync(seedPath)) {
    try {
      const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8')) as ToiletLite[];
      seedData.forEach((item) => {
        if (item.osmId) osmToiletsMap.set(item.osmId, item);
      });
      console.log(`[シード] 検証済みOSMマスターデータ読み込み: ${seedData.length} 件`);
    } catch (err: any) {
      console.warn(`[シード] 読み込み警告: ${err.message}`);
    }
  }

  // 2. Query live Overpass API for target areas
  for (const [minLat, minLon, maxLat, maxLon, pref, areaName] of TARGET_AREAS) {
    console.log(`[OSM] 収集エリア: ${pref} ${areaName} ...`);

    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="toilets"](${minLat},${minLon},${maxLat},${maxLon});
        way["amenity"="toilets"](${minLat},${minLon},${maxLat},${maxLon});
      );
      out body center;
    `;

    try {
      const data = await queryOverpass(query);
      console.log(`  -> 取得件数: ${data.elements.length} 件`);

      for (const el of data.elements) {
        const item = normalizeOsmToilet(el, pref, areaName);
        if (item) {
          const key = `${item.osmId}`;
          osmToiletsMap.set(key, item);
        }
      }
    } catch (err: any) {
      console.warn(`  ! エリア ${areaName} のAPI取得スキップ（シードデータ利用）: ${err.message}`);
    }

    // Rate limiting delay
    await sleep(1500);
  }

  const osmToilets = Array.from(osmToiletsMap.values());
  console.log(`\n[OSM] 収集完了: ユニークレコード数 ${osmToilets.length} 件`);

  // Ensure directories
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(PUBLIC_DATA_DIR, { recursive: true });

  // 1. Save OSM-only dataset
  const osmJsonPath = path.join(DATA_DIR, 'osm_toilets.json');
  fs.writeFileSync(osmJsonPath, JSON.stringify(osmToilets, null, 2), 'utf-8');
  console.log(`[出力] OSMデータセット: ${osmJsonPath}`);

  // 2. Load existing municipality toilets
  const muniLitePath = path.join(DATA_DIR, 'toilets_lite.json');
  let muniToilets: ToiletLite[] = [];

  if (fs.existsSync(muniLitePath)) {
    const raw = fs.readFileSync(muniLitePath, 'utf-8');
    muniToilets = JSON.parse(raw);
    // Ensure src property is set to 'muni'
    muniToilets.forEach((t) => {
      t.src = 'muni';
    });
  }

  console.log(`[統合] 自治体オープンデータ件数: ${muniToilets.length} 件`);

  // 3. Merge datasets (Municipality + OSM)
  const allMergedToilets: ToiletLite[] = [...muniToilets, ...osmToilets];

  console.log(`[統合] 全体合計レコード数: ${allMergedToilets.length} 件 (自治体: ${muniToilets.length}, OSM: ${osmToilets.length})`);

  // 4. Write merged toilets_lite.json to data/ and public/data/
  const mergedLitePath1 = path.join(DATA_DIR, 'toilets_lite.json');
  const mergedLitePath2 = path.join(PUBLIC_DATA_DIR, 'toilets_lite.json');

  const jsonContent = JSON.stringify(allMergedToilets);
  fs.writeFileSync(mergedLitePath1, jsonContent, 'utf-8');
  fs.writeFileSync(mergedLitePath2, jsonContent, 'utf-8');

  console.log(`[出力] 統合軽量JSON: ${mergedLitePath1}`);
  console.log(`[出力] 公開軽量JSON: ${mergedLitePath2}`);

  console.log('=== OpenStreetMap トイレデータ収集・統合完了 ===\n');
}

// Execute when run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fetchOsmToilets().catch((err) => {
    console.error('Fatal error in fetchOsmToilets:', err);
    process.exit(1);
  });
}
