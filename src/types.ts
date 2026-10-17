export interface ToiletLite {
  n: string;   // 名称
  p: string;   // 都道府県
  l: string;   // 自治体名
  a: string;   // 住所
  lat: number; // 緯度
  lng: number; // 経度
  w: number;   // 車椅子対応 (1 or 0)
  o: number;   // オストメイト (1 or 0)
  b: number;   // 乳幼児設備 (1 or 0)
  h: string;   // 利用可能時間
  r: string;   // 備考
  t: string[]; // タグ
  s: string;   // 提供元
  dist?: number; // 現在地からの距離 (km)
}

export interface FilterState {
  keyword: string;
  prefecture: string;
  municipality: string;
  wheelchair: boolean;
  ostomate: boolean;
  baby: boolean;
  park: boolean;
  station: boolean;
}

export interface UserLocation {
  lat: number;
  lng: number;
}
