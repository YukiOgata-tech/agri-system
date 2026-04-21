# 開発セットアップ・DB操作ガイド

## 前提条件

```bash
npm install -g firebase-tools # 更新もかねて
firebase login  # Googleアカウントでログイン
```

---

## 初回セットアップ（一度だけ）

### 1. エミュレーター起動

```bash
cd C:/projects/agri-system
firebase emulators:start --only dataconnect
```

起動確認: http://localhost:4000 (Emulator UI)

### 2. TypeScript SDK 生成

エミュレーター起動中に別ターミナルで実行：

```bash
firebase dataconnect:sdk:generate
```

生成先: `lib/dataconnect-generated/`

### 3. 生成ファイルを git commit

```bash
git add lib/dataconnect-generated/
git commit -m "Add Data Connect generated SDK"
```

> **以降はSDKを再生成しない限り、エミュレーターなしでもビルド・型チェックは通る**

---

## 通常の開発フロー

```bash
# ターミナル1: エミュレーター起動
firebase emulators:start --only dataconnect

# ターミナル2: Next.js 開発サーバー
npm run dev
```

アプリは自動的にエミュレーター（localhost:9399）に接続します。

---

## スキーマを変更したとき

`dataconnect/schema/schema.gql` を編集した場合：

```bash
# 1. エミュレーター再起動（変更を反映）
# Ctrl+C で停止後
firebase emulators:start --only dataconnect

# 2. SDK 再生成
firebase dataconnect:sdk:generate

# 3. commit
git add lib/dataconnect-generated/
git commit -m "Update Data Connect schema and SDK"
```

---

## エミュレーターのデータについて

| 状況 | データ |
|------|--------|
| エミュレーター再起動 | **残る**（`dataconnect/.dataconnect/pgliteData/` に保存） |
| pgliteData フォルダ削除 | **消える** |
| 本番環境 | **別管理**（エミュレーターデータは本番に行かない） |

データをリセットしたい場合：

```bash
rm -rf dataconnect/.dataconnect/pgliteData
```

---

## 本番へのデプロイ

### スキーマ・Operations を本番 Cloud SQL に反映

```bash
firebase deploy --only dataconnect
```

> データは反映されない。スキーマ（テーブル定義）とクエリ定義のみ。

### アプリのデプロイ（Vercel等）

本番環境では `NODE_ENV=production` のため、自動的に本番の Firebase Data Connect エンドポイントに接続する。

---

## トラブルシューティング

### エミュレーターのポートが使用中

```bash
# 使用中のプロセスを確認
netstat -ano | findstr :9399
# または firebase.json でポート変更
```

### SDK 生成エラー

```bash
# firebase CLI のバージョン確認
firebase --version  # 13.x 以上推奨

# プロジェクト確認
firebase use
# → agri-ai-saas になっていること
```

### 型エラー（TS）

SDK 再生成後に Next.js の dev サーバーを再起動する。

---

## ファイル構成（DB関連）

```
dataconnect/
  schema/schema.gql          # テーブル定義（編集対象）
  example/
    connector.yaml            # SDK生成設定
    operations.gql            # Query / Mutation 定義（編集対象）

lib/
  dataconnect-generated/      # 自動生成SDK（git管理・編集しない）
  dataconnect.ts              # クライアント初期化
  firebase.ts                 # Firebase app 初期化
```
