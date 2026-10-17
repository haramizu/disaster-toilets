# 全国の自治体 災害時・公衆トイレ オープンデータ＆アプリ基盤

全国の地方自治体（東京都・23区・多摩地域、大阪府、福岡県、熊本県、沖縄県、その他全国各地）が「自治体標準オープンデータセット」として公開している公衆トイレ・災害時利用可能トイレのオープンデータを収集・正規化し、アプリ開発で即座に利用できるデータセットおよび閲覧プロトタイプを作成しました。

---

## 1. 収集データの概要

- **総収集レコード数**: 4,067件（重複排除後）
- **正確な座標（緯度経度）付き**: 3,636件
- **車椅子・バリアフリー対応**: 1,462件 (35.9%)
- **オストメイト対応設備あり**: 661件 (16.3%)
- **乳幼児用設備（おむつ替え等）あり**: 750件 (18.4%)

### 主なデータ提供自治体（一部抜粋）
- **東京都**: 江戸川区、葛飾区、杉並区、板橋区、江東区、町田市、練馬区、品川区、中野区、墨田区、中央区、荒川区、千代田区、台東区、国立市、東大和市、小平市、調布市、東久留米市、目黒区 など
- **全国地方自治体（BODIK・自治体カタログ経由）**: 大阪府、鹿児島県姶良市、栃木県真岡市、福岡県飯塚市・春日市、長崎県島原市・対馬市、熊本県上天草市・阿蘇市・氷川町、沖縄県沖縄市・南風原町・竹富町・那覇市、愛媛県砥部町、秋田県鹿角市、三重県四日市市、長野県茅野市、北海道上砂川町 など

---

## 2. 成果物一覧

| ファイルパス | 形式 | 説明 |
| :--- | :--- | :--- |
| `data/municipalities_source_list.md` | Markdown | **都道府県別**の自治体データ提供ソース一覧表（全64自治体・CSV直リンク付き） |
| `data/municipalities_source_list.csv` | CSV | 都道府県・自治体名・提供元ポータル・件数のメタデータ一覧 |
| `data/municipalities_source_list.json` | JSON | 自治体データソースのメタデータJSON |
| `data/disaster_toilets_japan.json` | JSON (2.8MB) | 全4,067件の完全統合データセット（**都道府県名正規化済**・全メタデータ含む） |
| `data/disaster_toilets_japan.geojson` | GeoJSON (2.2MB) | 地図ライブラリ（Leaflet / MapLibre / Mapbox）で即座に描画可能なFeatureCollection |
| `data/disaster_toilets_japan.csv` | CSV (1.4MB) | Excel、スプレッドシート、Pandasで即座に扱えるUTF-8-BOM形式CSV |
| `data/toilets_lite.json` | JSON (932KB) | モバイルアプリやWebフロントエンド向けに最適化した軽量JSON（都道府県キー `p` 追加済） |
| `schema/toilet.ts` | TypeScript | アプリ開発用の型定義ファイル（デジタル庁標準仕様準拠・prefectureプロパティ） |
| `scripts/fetch_toilet_data.py` | Python 3 | 全国の自治体オープンデータ（CKAN API等）から自動再収集・更新するスクリプト |
| `index.html` / `style.css` / `app.js` | Web App | **都道府県＆自治体の連動絞り込み**と地図自動ズームを備えたビューアアプリ |

---

## 3. アプリ開発のためのデータ仕様 (スキーマ)

デジタル庁「自治体標準オープンデータセット（公衆トイレ一覧）」に基づき、以下の共通フィールドに正規化されています。

```typescript
export interface DisasterToilet {
  name: string;                  // トイレ・施設名
  name_kana?: string;            // カナ
  lg_name: string;               // 自治体名（例: 新宿区、飯塚市）
  prefecture?: string;           // 都道府県
  city?: string;                 // 市区町村
  address: string;               // 住所・設置場所
  latitude: number | null;       // 緯度 (WGS84)
  longitude: number | null;      // 経度 (WGS84)
  has_coordinates: boolean;      // 有効な座標があるか
  wheelchair_accessible: boolean;// 車椅子使用者用トイレの有無
  ostomate_accessible: boolean;  // オストメイト対応設備の有無
  baby_facilities: boolean;      // おむつ交換台・乳幼児設備の有無
  open_hours: string;            // 利用可能時間
  remarks?: string;              // 備考（マンホールトイレ、井戸併設等）
  tags: string[];                // ["公衆トイレ", "車椅子対応", "指定避難施設" 等]
  source_org: string;            // データ提供自治体
  source_url: string;            // 原典オープンデータCSVのURL
}
```

---

## 4. データの再収集・更新手順

新しい自治体データの追加や定期更新は、TypeScriptで実装されたクローラーを1コマンドで実行できます：

```bash
# 全国の自治体カタログから最新データを再収集（TypeScript版）
npm run fetch
```

---

## 5. React Webアプリの起動方法

React (TypeScript + Vite) で構築されたWebアプリが付属しています。

```bash
# 依存パッケージのインストール（初回のみ）
npm install

# 開発サーバー起動 (ポート 3000)
npm run dev

# プロダクションビルド
npm run build
```
ブラウザで `http://localhost:3000` を開くと動作します。
