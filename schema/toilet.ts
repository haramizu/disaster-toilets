/**
 * 災害時利用可能トイレ・公衆トイレ 共通データスキーマ
 * デジタル庁「自治体標準オープンデータセット（公衆トイレ一覧）」準拠
 */

export interface DisasterToilet {
  /** 施設・トイレ名称（例: 新宿中央公園北トイレ、市民会館1Fだれでもトイレ） */
  name: string;
  /** 名称カナ */
  name_kana?: string;
  /** 自治体名（例: 新宿区、飯塚市、神戸市） */
  lg_name: string;
  /** 都道府県（例: 東京都、福岡県） */
  prefecture?: string;
  /** 市区町村（例: 新宿区、飯塚市） */
  city?: string;
  /** 所在地住所 */
  address: string;
  /** 緯度（WGS84） */
  latitude: number | null;
  /** 経度（WGS84） */
  longitude: number | null;
  /** 座標データが有効かどうか */
  has_coordinates: boolean;
  /** 車椅子・バリアフリートイレの有無 */
  wheelchair_accessible: boolean;
  /** オストメイト対応設備の有無 */
  ostomate_accessible: boolean;
  /** 乳幼児用設備（おむつ交換台・ベビーキープ等）の有無 */
  baby_facilities: boolean;
  /** 利用可能時間（例: 24時間、08:30-17:00 等） */
  open_hours: string;
  /** 備考・特記事項（マンホールトイレ、井戸併設、断水時利用方針など） */
  remarks?: string;
  /** カテゴリ・タグ（例: ["公衆トイレ", "車椅子対応", "指定避難施設", "オストメイト対応"]） */
  tags: string[];
  /** データ提供元自治体・組織 */
  source_org: string;
  /** 原典オープンデータCSVのURL */
  source_url: string;
}

/** GeoJSON形式（Leaflet / MapLibre / Mapbox等の地図ライブラリ用） */
export interface ToiletGeoJSONFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number]; // [経度, 緯度]
  };
  properties: {
    name: string;
    prefecture: string;
    lg_name: string;
    address: string;
    wheelchair: boolean;
    ostomate: boolean;
    baby: boolean;
    open_hours: string;
    remarks: string;
    tags: string[];
    source_org: string;
  };
}

export interface ToiletGeoJSON {
  type: "FeatureCollection";
  features: ToiletGeoJSONFeature[];
}
