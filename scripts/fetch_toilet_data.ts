#!/usr/bin/env node
/**
 * Fetch and aggregate public and disaster toilet open data from Japanese local governments.
 * Implemented in TypeScript (Node.js 18+).
 *
 * Sources:
 * 1. Tokyo Open Data Catalog (catalog.data.metro.tokyo.lg.jp)
 * 2. BODIK Open Data Catalog for Nationwide Local Governments (data.bodik.jp)
 */

import fs from 'fs';
import path from 'path';

const USER_AGENT = 'DisasterToiletAggregator/1.0 (Japan Open Data Collector; pair-programming-agent)';

export const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
];

export const PREF_CODE_MAP: Record<string, string> = {
  '01': '北海道', '02': '青森県', '03': '岩手県', '04': '宮城県', '05': '秋田県',
  '06': '山形県', '07': '福島県', '08': '茨城県', '09': '栃木県', '10': '群馬県',
  '11': '埼玉県', '12': '千葉県', '13': '東京都', '14': '神奈川県', '15': '新潟県',
  '16': '富山県', '17': '石川県', '18': '福井県', '19': '山梨県', '20': '長野県',
  '21': '岐阜県', '22': '静岡県', '23': '愛知県', '24': '三重県', '25': '滋賀県',
  '26': '京都府', '27': '大阪府', '28': '兵庫県', '29': '奈良県', '30': '和歌山県',
  '31': '鳥取県', '32': '島根県', '33': '岡山県', '34': '広島県', '35': '山口県',
  '36': '徳島県', '37': '香川県', '38': '愛媛県', '39': '高知県', '40': '福岡県',
  '41': '佐賀県', '42': '長崎県', '43': '熊本県', '44': '大分県', '45': '宮崎県',
  '46': '鹿児島県', '47': '沖縄県'
};

export const MUNICIPALITY_PREF_MAP: Record<string, string> = {
  '上砂川町': '北海道',
  '鹿角市': '秋田県',
  '真岡市': '栃木県',
  'あきる野市': '東京都', '中央区': '東京都', '中野区': '東京都', '千代田区': '東京都',
  '台東区': '東京都', '品川区': '東京都', '国分寺市': '東京都', '国立市': '東京都',
  '墨田区': '東京都', '小平市': '東京都', '小金井市': '東京都', '杉並区': '東京都',
  '東久留米市': '東京都', '東大和市': '東京都', '板橋区': '東京都', '武蔵野市': '東京都',
  '江戸川区': '東京都', '江東区': '東京都', '狛江市': '東京都', '町田市': '東京都',
  '目黒区': '東京都', '練馬区': '東京都', '荒川区': '東京都', '葛飾区': '東京都',
  '調布市': '東京都', '豊島区': '東京都',
  '茅野市': '長野県',
  '日進市': '愛知県',
  '四日市市': '三重県',
  '彦根市': '滋賀県',
  '宇治市': '京都府',
  '大阪府': '大阪府', '富田林市': '大阪府', '寝屋川市': '大阪府', '東大阪市': '大阪府',
  '熊取町': '大阪府', '箕面市': '大阪府', '貝塚市': '大阪府', '門真市': '大阪府', '阪南市': '大阪府',
  '丹波市': '兵庫県',
  '三郷町': '奈良県',
  '砥部町': '愛媛県',
  '春日市': '福岡県', '飯塚市': '福岡県',
  '対馬市': '長崎県', '島原市': '長崎県',
  '上天草市': '熊本県', '氷川町': '熊本県', '南阿蘇村': '熊本県', '阿蘇市': '熊本県',
  '奄美市': '鹿児島県', '姶良市': '鹿児島県', '南種子町': '鹿児島県',
  '北中城村': '沖縄県', '南大東村': '沖縄県', '南風原町': '沖縄県', '沖縄市': '沖縄県',
  '竹富町': '沖縄県', '那覇市': '沖縄県'
};

export interface NormalizedToilet {
  name: string;
  name_kana: string;
  lg_name: string;
  prefecture: string;
  city: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  has_coordinates: boolean;
  wheelchair_accessible: boolean;
  ostomate_accessible: boolean;
  baby_facilities: boolean;
  open_hours: string;
  remarks: string;
  tags: string[];
  source_org: string;
  source_url: string;
}

export interface SourceDatasetInfo {
  prefecture: string;
  municipality: string;
  catalog: string;
  dataset_title: string;
  record_count: number;
  csv_url: string;
  license: string;
  last_modified: string;
  status: string;
}

export function cleanStr(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim().replace(/\r\n/g, ' ').replace(/[\n\r]/g, ' ');
}

export function parseFloatSafe(val: any): number | null {
  if (!val) return null;
  const s = String(val).trim();
  const m = s.match(/[-+]?[0-9]*\.?[0-9]+/);
  if (m) {
    const num = parseFloat(m[0]);
    return isNaN(num) ? null : num;
  }
  return null;
}

export function parseBool(val: any): boolean {
  if (!val) return false;
  const s = String(val).trim().toLowerCase();
  return ['有', 'あり', '1', 'true', 'yes', '可', '○', '〇', '1.0'].includes(s);
}

export function resolvePrefecture(prefRaw: string, addr: string, muni: string, url: string): string {
  const p = cleanStr(prefRaw);
  if (PREFECTURES.includes(p)) return p;

  for (const [mName, targetPref] of Object.entries(MUNICIPALITY_PREF_MAP)) {
    if (muni.includes(mName) || addr.includes(mName)) {
      return targetPref;
    }
  }

  for (const targetPref of PREFECTURES) {
    if (addr.includes(targetPref)) {
      return targetPref;
    }
  }

  if (p && p.length >= 2 && PREF_CODE_MAP[p.slice(0, 2)]) {
    return PREF_CODE_MAP[p.slice(0, 2)];
  }

  const m = url.match(/\/(\d{2})\d{4}_/);
  if (m && PREF_CODE_MAP[m[1]]) {
    return PREF_CODE_MAP[m[1]];
  }

  if (url.includes('metro.tokyo.lg.jp') || url.includes('wagmap.jp')) {
    return '東京都';
  }

  return 'その他';
}

/** RFC 4180-compliant CSV parser */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  // Remove BOM if present
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  while (i < text.length) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          field += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        field += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === ',') {
        row.push(field);
        field = '';
        i++;
        continue;
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++;
        }
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
        i++;
        continue;
      } else if (char === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
        i++;
        continue;
      } else {
        field += char;
        i++;
      }
    }
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

export const COLUMN_MAP: Record<string, string[]> = {
  lg_code: ['全国地方公共団体コード', '団体コード', '地方公共団体コード', 'code'],
  lg_name: ['地方公共団体名', '自治体名', '市区町村名', '団体名'],
  name: ['名称', '施設名', 'トイレ名', '名称_カナ', 'name'],
  name_kana: ['名称_カナ', 'カナ'],
  address: ['所在地_連結表記', '所在地_連結標記', '所在地', '住所', '設置場所', '所在地_住所'],
  prefecture: ['所在地_都道府県', '都道府県'],
  city: ['所在地_市区町村', '市区町村'],
  lat: ['緯度', 'lat', 'latitude', 'Y', 'y'],
  lng: ['経度', 'lon', 'lng', 'longitude', 'X', 'x'],
  wheelchair: ['車椅子使用者用トイレ有無', '車椅子対応', '車いす使用者用トイレ有無', 'バリアフリートイレ数'],
  ostomate: ['オストメイト設置トイレ有無', 'オストメイト対応', 'オストメイト対応トイレ有無'],
  baby: ['乳幼児用設備設置トイレ有無', '乳幼児用設備', 'ベビーチェア有無', 'おむつ替えシート有無'],
  open_hours: ['利用可能時間特記事項', '利用可能時間', '開館時間', '営業時間'],
  start_time: ['利用開始時間'],
  end_time: ['利用終了時間'],
  remarks: ['備考', '特記事項', '施設概要'],
};

export function findColumnIndex(headers: string[], candidates: string[]): number | null {
  const normHeaders = headers.map((h) => h.trim().replace(/\ufeff/g, ''));
  for (const candidate of candidates) {
    for (let i = 0; i < normHeaders.length; i++) {
      if (normHeaders[i] === candidate || normHeaders[i].includes(candidate)) {
        return i;
      }
    }
  }
  return null;
}

export async function fetchJson(url: string, timeoutMs: number = 15000): Promise<any> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });
    clearTimeout(id);
    if (!res.ok) return null;
    return await res.json();
  } catch (e: any) {
    console.warn(`[WARN] Failed to fetch JSON from ${url}: ${e.message}`);
    return null;
  }
}

export async function fetchCsv(url: string, timeoutMs: number = 15000): Promise<string | null> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });
    clearTimeout(id);
    if (!res.ok) return null;

    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Try decoding UTF-8 then Shift-JIS
    for (const encoding of ['utf-8', 'shift_jis']) {
      try {
        const decoder = new TextDecoder(encoding, { fatal: true });
        return decoder.decode(bytes);
      } catch {
        // Continue to next encoding
      }
    }
    // Fallback permissive utf-8
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  } catch (e: any) {
    console.warn(`[WARN] Failed to fetch CSV from ${url}: ${e.message}`);
    return null;
  }
}

export function normalizeRecord(
  row: string[],
  indices: Record<string, number | null>,
  sourceOrg: string,
  sourceUrl: string
): NormalizedToilet | null {
  const getVal = (key: string): string => {
    const idx = indices[key];
    if (idx !== null && idx !== undefined && idx < row.length) {
      return cleanStr(row[idx]);
    }
    return '';
  };

  const name = getVal('name');
  if (!name || name === '名称') return null;

  const latVal = parseFloatSafe(getVal('lat'));
  const lngVal = parseFloatSafe(getVal('lng'));

  let hasValidCoords = false;
  if (latVal && lngVal) {
    if (latVal >= 20.0 && latVal <= 46.0 && lngVal >= 120.0 && lngVal <= 154.0) {
      hasValidCoords = true;
    }
  }

  const rawPref = getVal('prefecture');
  const city = getVal('city');
  const lgName = getVal('lg_name') || sourceOrg || city;
  let address = getVal('address');

  const pref = resolvePrefecture(rawPref, address, lgName, sourceUrl);

  if (!address) {
    const parts = [pref, city, name].filter(Boolean);
    address = parts.join(' ');
  }

  let openHours = getVal('open_hours');
  const st = getVal('start_time');
  const et = getVal('end_time');
  if ((st || et) && !openHours) {
    openHours = `${st} - ${et}`.trim().replace(/^-\s*|\s*-$/g, '');
  }

  const wheelchair = parseBool(getVal('wheelchair'));
  const ostomate = parseBool(getVal('ostomate'));
  const baby = parseBool(getVal('baby'));
  const remarks = getVal('remarks');

  const tags = ['公衆トイレ'];
  if (name.includes('避難') || remarks.includes('避難')) tags.push('指定避難施設');
  if (name.includes('公園') || name.includes('緑地')) tags.push('公園トイレ');
  if (name.includes('駅')) tags.push('駅周辺');
  if (wheelchair) tags.push('車椅子対応');
  if (ostomate) tags.push('オストメイト対応');
  if (baby) tags.push('乳幼児設備');

  return {
    name,
    name_kana: getVal('name_kana'),
    lg_name: lgName,
    prefecture: pref,
    city,
    address,
    latitude: hasValidCoords ? latVal : null,
    longitude: hasValidCoords ? lngVal : null,
    has_coordinates: hasValidCoords,
    wheelchair_accessible: wheelchair,
    ostomate_accessible: ostomate,
    baby_facilities: baby,
    open_hours: openHours || '24時間または施設開館時間中',
    remarks,
    tags,
    source_org: sourceOrg,
    source_url: sourceUrl,
  };
}

export function processCsvContent(
  csvText: string,
  sourceOrg: string,
  sourceUrl: string
): NormalizedToilet[] {
  let rows: string[][];
  try {
    rows = parseCsv(csvText);
  } catch (e: any) {
    console.warn(`[WARN] CSV parse error: ${e.message}`);
    return [];
  }

  if (!rows || rows.length < 2) return [];

  const headers = rows[0];
  const indices: Record<string, number | null> = {};
  for (const [key, candidates] of Object.entries(COLUMN_MAP)) {
    indices[key] = findColumnIndex(headers, candidates);
  }

  const results: NormalizedToilet[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row.some((cell) => cell.trim().length > 0)) continue;
    const rec = normalizeRecord(row, indices, sourceOrg, sourceUrl);
    if (rec) results.push(rec);
  }
  return results;
}

export async function crawlCkanCatalog(
  catalogName: string,
  baseUrl: string,
  searchQuery: string = '公衆トイレ',
  maxPackages: number = 40
): Promise<{ toilets: NormalizedToilet[]; sources: SourceDatasetInfo[] }> {
  console.log(`\n=== Crawling ${catalogName} (${baseUrl}) query='${searchQuery}' ===`);
  const apiUrl = `${baseUrl}/api/3/action/package_search?q=${encodeURIComponent(searchQuery)}&rows=${maxPackages}`;
  const data = await fetchJson(apiUrl);
  if (!data || !data.success) {
    console.error(`[ERROR] Failed to search ${catalogName}`);
    return { toilets: [], sources: [] };
  }

  const packages = data.result?.results || [];
  console.log(`Found ${packages.length} package datasets in ${catalogName}`);

  const toilets: NormalizedToilet[] = [];
  const sources: SourceDatasetInfo[] = [];

  for (const pkg of packages) {
    const title = pkg.title || '';
    const orgTitle = pkg.organization?.title || '';
    const resources = pkg.resources || [];
    const licenseTitle = pkg.license_title || 'オープンデータ (CC-BY等)';
    const modified = pkg.metadata_modified || '';

    const csvRes = resources.find((r: any) => {
      const fmt = (r.format || '').toUpperCase();
      const u = (r.url || '').toLowerCase();
      return fmt === 'CSV' || u.endsWith('.csv');
    });

    if (csvRes && csvRes.url) {
      const csvUrl = csvRes.url;
      const muniName = orgTitle || title;
      const pref = resolvePrefecture('', '', muniName, csvUrl);
      console.log(`  -> Fetching CSV: ${title} (${muniName}) [${pref}]`);

      const csvText = await fetchCsv(csvUrl);
      let recCount = 0;
      let status = 'OK';

      if (csvText) {
        const records = processCsvContent(csvText, muniName, csvUrl);
        recCount = records.length;
        console.log(`     Parsed ${recCount} records`);
        toilets.push(...records);
      } else {
        status = 'Fetch Failed (404 / Network)';
      }

      sources.push({
        prefecture: pref,
        municipality: muniName,
        catalog: catalogName,
        dataset_title: title,
        record_count: recCount,
        csv_url: csvUrl,
        license: licenseTitle,
        last_modified: modified,
        status,
      });

      // Brief delay to be polite
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return { toilets, sources };
}

export function saveSourceCatalogList(sources: SourceDatasetInfo[]) {
  const sorted = [...sources].sort((a, b) => {
    const idxA = PREFECTURES.indexOf(a.prefecture);
    const idxB = PREFECTURES.indexOf(b.prefecture);
    const orderA = idxA === -1 ? 999 : idxA;
    const orderB = idxB === -1 ? 999 : idxB;
    if (orderA !== orderB) return orderA - orderB;
    return a.municipality.localeCompare(b.municipality);
  });

  // 1. JSON
  const jsonPath = 'data/municipalities_source_list.json';
  fs.writeFileSync(jsonPath, JSON.stringify(sorted, null, 2), 'utf-8');
  console.log(`Saved source catalog JSON to ${jsonPath}`);

  // 2. CSV
  const csvPath = 'data/municipalities_source_list.csv';
  const csvHeader = 'prefecture,municipality,catalog,dataset_title,record_count,csv_url,license,last_modified,status\n';
  const csvRows = sorted.map((s) =>
    [
      `"${s.prefecture}"`,
      `"${s.municipality}"`,
      `"${s.catalog}"`,
      `"${s.dataset_title.replace(/"/g, '""')}"`,
      s.record_count,
      `"${s.csv_url}"`,
      `"${s.license}"`,
      `"${s.last_modified}"`,
      `"${s.status}"`,
    ].join(',')
  );
  fs.writeFileSync(csvPath, '\ufeff' + csvHeader + csvRows.join('\n'), 'utf-8');
  console.log(`Saved source catalog CSV to ${csvPath}`);

  // 3. Markdown
  const mdPath = 'data/municipalities_source_list.md';
  let mdContent = '# 自治体が提供している災害時・公衆トイレ オープンデータ一覧\n\n';
  mdContent += `提供自治体・データソース数: **${sorted.length}ソース**\n\n`;
  mdContent += '| 都道府県 | 自治体・組織名 | 提供ポータル | 収録件数 | データセット名 | CSVダウンロードURL |\n';
  mdContent += '| :--- | :--- | :--- | :---: | :--- | :--- |\n';
  for (const item of sorted) {
    const cnt = item.status === 'OK' ? `${item.record_count}件` : '取得不可';
    mdContent += `| **${item.prefecture}** | ${item.municipality} | ${item.catalog} | ${cnt} | ${item.dataset_title} | [CSV直リンク](${item.csv_url}) |\n`;
  }
  fs.writeFileSync(mdPath, mdContent, 'utf-8');
  console.log(`Saved source catalog Markdown to ${mdPath}`);
}

async function main() {
  fs.mkdirSync('data', { recursive: true });
  fs.mkdirSync('public/data', { recursive: true });

  const allToilets: NormalizedToilet[] = [];
  const allSources: SourceDatasetInfo[] = [];

  // 1. Tokyo Open Data Catalog
  const tokyo = await crawlCkanCatalog(
    '東京都オープンデータカタログ',
    'https://catalog.data.metro.tokyo.lg.jp',
    '公衆トイレ',
    40
  );
  allToilets.push(...tokyo.toilets);
  allSources.push(...tokyo.sources);

  // 2. BODIK Nationwide Local Governments Catalog
  const bodik = await crawlCkanCatalog(
    'BODIK (全国自治体オープンデータ)',
    'https://data.bodik.jp',
    '公衆トイレ',
    40
  );
  allToilets.push(...bodik.toilets);
  allSources.push(...bodik.sources);

  // Save Municipality Sources List
  saveSourceCatalogList(allSources);

  // 3. Deduplicate
  const seen = new Set<string>();
  const uniqueToilets: NormalizedToilet[] = [];
  for (const t of allToilets) {
    const key = `${t.name}|${t.address}|${(t.latitude || 0).toFixed(4)}|${(t.longitude || 0).toFixed(4)}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueToilets.push(t);
    }
  }

  console.log(`\n[DONE] Total collected: ${allToilets.length}, Unique: ${uniqueToilets.length}`);

  // Save Full JSON
  const jsonPath = 'data/disaster_toilets_japan.json';
  fs.writeFileSync(jsonPath, JSON.stringify(uniqueToilets, null, 2), 'utf-8');
  fs.copyFileSync(jsonPath, 'public/data/disaster_toilets_japan.json');
  console.log(`Saved JSON to ${jsonPath}`);

  // Save GeoJSON
  const geoFeatures = uniqueToilets
    .filter((t) => t.has_coordinates && t.latitude !== null && t.longitude !== null)
    .map((t) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [t.longitude, t.latitude],
      },
      properties: {
        name: t.name,
        prefecture: t.prefecture,
        lg_name: t.lg_name,
        address: t.address,
        wheelchair: t.wheelchair_accessible,
        ostomate: t.ostomate_accessible,
        baby: t.baby_facilities,
        open_hours: t.open_hours,
        remarks: t.remarks,
        tags: t.tags,
        source_org: t.source_org,
      },
    }));

  const geojsonPath = 'data/disaster_toilets_japan.geojson';
  const geojsonContent = JSON.stringify({ type: 'FeatureCollection', features: geoFeatures }, null, 2);
  fs.writeFileSync(geojsonPath, geojsonContent, 'utf-8');
  fs.copyFileSync(geojsonPath, 'public/data/disaster_toilets_japan.geojson');
  console.log(`Saved GeoJSON (${geoFeatures.length} features) to ${geojsonPath}`);

  // Save CSV
  const csvPath = 'data/disaster_toilets_japan.csv';
  const csvHeader =
    'name,name_kana,prefecture,lg_name,city,address,latitude,longitude,wheelchair_accessible,ostomate_accessible,baby_facilities,open_hours,remarks,tags,source_org,source_url\n';
  const csvRows = uniqueToilets.map((t) => {
    return [
      `"${t.name.replace(/"/g, '""')}"`,
      `"${t.name_kana.replace(/"/g, '""')}"`,
      `"${t.prefecture}"`,
      `"${t.lg_name.replace(/"/g, '""')}"`,
      `"${t.city.replace(/"/g, '""')}"`,
      `"${t.address.replace(/"/g, '""')}"`,
      t.latitude ?? '',
      t.longitude ?? '',
      t.wheelchair_accessible ? 1 : 0,
      t.ostomate_accessible ? 1 : 0,
      t.baby_facilities ? 1 : 0,
      `"${t.open_hours.replace(/"/g, '""')}"`,
      `"${t.remarks.replace(/"/g, '""')}"`,
      `"${t.tags.join(', ')}"`,
      `"${t.source_org.replace(/"/g, '""')}"`,
      `"${t.source_url}"`,
    ].join(',');
  });
  fs.writeFileSync(csvPath, '\ufeff' + csvHeader + csvRows.join('\n'), 'utf-8');
  fs.copyFileSync(csvPath, 'public/data/disaster_toilets_japan.csv');
  console.log(`Saved CSV to ${csvPath}`);

  // Save Lite JSON for Web App
  const lite = uniqueToilets
    .filter((t) => t.has_coordinates && t.latitude !== null && t.longitude !== null)
    .map((t) => ({
      n: t.name,
      p: t.prefecture,
      l: t.lg_name,
      a: t.address,
      lat: Math.round(t.latitude! * 100000) / 100000,
      lng: Math.round(t.longitude! * 100000) / 100000,
      w: t.wheelchair_accessible ? 1 : 0,
      o: t.ostomate_accessible ? 1 : 0,
      b: t.baby_facilities ? 1 : 0,
      h: t.open_hours,
      r: t.remarks.slice(0, 100),
      t: t.tags,
      s: t.source_org,
    }));

  const litePath = 'data/toilets_lite.json';
  fs.writeFileSync(litePath, JSON.stringify(lite), 'utf-8');
  fs.copyFileSync(litePath, 'public/data/toilets_lite.json');
  console.log(`Saved Lite JSON (${lite.length} records) to ${litePath} & public/data/`);
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
