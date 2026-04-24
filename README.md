# agri-system

農業記録を基盤に、分析・予測・AI支援へつなげるための初期フェーズの Web アプリです。

現時点では「いちご向け」を意識した画面モックが一部ありますが、設計方針としては特定作物に閉じず、どの農作物でも利用できる共通基盤を先に整える前提です。いちご固有の項目は、必要に応じて拡張テーブルや画面差分で吸収します。

## サービスの考え方

- 無料: 記録、保存、インポート
- 有料: AI 分析、予測、レポート、相談
- 管理単位: `組織 -> 農場 -> ハウス/圃場 -> 作付サイクル -> 各種記録`
- 目的: 記録を蓄積するだけでなく、将来的にダッシュボード分析、リスク検知、助言生成、外部連携へつなげる

詳細な構想は [docs/agri_service_overview.docx](docs/agri_service_overview.docx) と [docs/agri_db_design_full.md](docs/agri_db_design_full.md) を参照してください。

## 現在の実装状況

このレポジトリは開発初期です。実装はまだ骨格中心です。

- Next.js App Router ベースの画面構成あり
- Firebase Authentication のクライアント実装あり
- Firebase Data Connect 用のスキーマと operations の雛形あり
- ダッシュボード、ハウス管理、収穫、作業、環境、病害虫、出荷、設定の画面あり
- 多くの画面はまだモックデータ駆動で、Data Connect への接続はこれから

要するに、UI のたたき台とデータモデルの先行設計は進んでいますが、実データ連携と運用ロジックはこれからです。

## 技術スタック

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Firebase Authentication
- Firebase Data Connect
- TanStack Query
- React Hook Form / Zod

## ディレクトリ概要

```text
app/                    画面ルーティング
components/             UI とレイアウト
dataconnect/
  schema/schema.gql     Data Connect スキーマ
  example/operations.gql Query / Mutation 定義
lib/
  firebase.ts           Firebase 初期化
  auth.ts               認証ラッパー
  dataconnect.ts        Data Connect クライアント初期化
docs/                   サービス概要、DB 設計、開発メモ
```

## データモデル方針

ベースは汎用作物向けです。

- 共通コア: 組織、農場、ハウス、作物種別、品種、作付サイクル、収穫、作業、環境、病害虫
- 分析系: 将来的に分析実行、出力、通知、予測を追加
- 作物別拡張: まずは共通項目を優先し、足りない項目だけ作物別に拡張

現状の `dataconnect/schema/schema.gql` には、共通コアに加えて `StrawberryGrowthLog` が入っています。これは「最初の拡張例」として扱い、今後の実装では共通基盤を優先して進める想定です。

## セットアップ

### 1. 依存関係

```bash
npm install
```

### 2. Firebase 関連の準備

必要に応じて Firebase CLI を入れます。

```bash
npm install -g firebase-tools
firebase login
```

### 3. 開発サーバー

```bash
npm run dev
```

## Data Connect 開発フロー

[docs/dev-setup.md](docs/dev-setup.md) に詳細があります。要点だけ書くと以下です。

### エミュレーター起動

```bash
firebase emulators:start --only dataconnect
```

### SDK 生成

```bash
firebase dataconnect:sdk:generate
```

生成先:

```text
lib/dataconnect-generated/
```

スキーマ変更後は、エミュレーター再起動と SDK 再生成が必要です。

## 今の優先課題

- モック画面を Data Connect 経由の実データに置き換える
- 組織、農場、ハウス、作付サイクルの初期登録導線を作る
- 収穫、作業、環境、病害虫の CRUD を実装する
- 画面文言や入力項目を「いちご前提」から「汎用作物ベース」へ整理する
- 必要な作物別拡張だけを後から差し込める構造にする

## 参照資料

- [docs/agri_service_overview.docx](docs/agri_service_overview.docx)
- [docs/agri_db_design_full.md](docs/agri_db_design_full.md)
- [docs/dev-setup.md](docs/dev-setup.md)
