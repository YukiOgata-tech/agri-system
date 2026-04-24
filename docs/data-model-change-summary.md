# データ構造変更サマリー

このメモは、v1 相当の設計から v2 方針へ切り替えた時の変更点を短くまとめたものです。

## 変更の主旨

- DBの主軸は `場所` に置いたままにする
- 画面体験は `作物` ごとに切り替えられるようにする
- 単位系は `作付` の設定として持つ
- トレーサビリティは `作業/収穫/出荷` で追えるようにする

## 大きな変更

### 1. `greenhouses` から `production_units` へ一般化

これまで:

- greenhouse を現場管理の中心にしていた

これから:

- `production_units` を現場管理の中心にする
- `unit_type` でハウス、露地、圃場、区画、ベッドなどを表現する
- `parent_unit_id` で親子構造を持てるようにする

### 2. `作物を親階層にする` のではなく `cultivation_cycles` を強化

これまで:

- 場所と作物の結びつきが弱かった

これから:

- `cultivation_cycles` に `production_unit_id + crop_type_id + 期間` を持たせる
- ここで記録単位、出荷単位、定植母数も持たせる

### 3. 作物別のUI/分析/課金設定を追加

新規:

- `organization_crop_settings`

これでできること:

- 作物タブ切り替え
- 作物別AI分析の有効化
- 作物別価格帯の設定
- 作物別入力モードの切り替え

### 4. 収穫・出荷の単位系を汎用化

これまで:

- `kg` と `count` 前提が強かった

これから:

- `quantity_value`
- `quantity_unit`
- `normalized_weight_kg`
- `package_count`
- `package_unit`

を持たせる

これで:

- kg
- 個
- 束
- 箱
- ケース

などを扱いやすくする

### 5. 資材ロットと使用履歴を持たせる

新規:

- `input_materials`
- `material_lots`
- `work_material_usages`
- `inventory_transactions`

これで:

- どの資材を
- どのロットで
- どの作業で
- どの場所に
- どれだけ使ったか

を追跡できる

### 6. 証跡を持てるようにする

新規:

- `observation_attachments`

これで:

- 病害虫写真
- 作業記録写真
- 環境異常の証跡
- 収穫ロットの画像

を関連記録にひもづけられる

## UIで変わる画面

### 生産単位管理

旧:

- ハウス管理

新:

- 生産単位管理
- タイプ、親単位、面積などを設定

### 作付設定

新規追加:

- 生産単位に対して、どの作物をどの単位で管理するか設定する画面

### ダッシュボード

新:

- 作物切り替えタブを追加
- `全体 / いちご / トマト ...` のように切り替える

### 作業記録

新:

- 資材ロットを選んで記録できる

### 収穫・出荷

新:

- 収穫ロットを作る
- 出荷時に収穫ロットを参照する

## 既存UIへの影響

既存の `greenhouses / harvest / work-logs / environment / diseases` 画面は、名前や入出力の前提が v1 のままです。

次の順で改修するのが自然です。

1. `greenhouses` を `production-units` 相当に拡張
2. `cultivation-cycles` の登録UIを追加
3. 収穫画面を単位系対応に変更
4. 作業記録に資材ロット利用を追加
5. ダッシュボードに作物切り替えを追加

## 変更対象ファイル

- [agri_db_design_full.md](/C:/projects/agri-system/docs/agri_db_design_full.md)
- [schema.gql](/C:/projects/agri-system/dataconnect/schema/schema.gql)
- [operations.gql](/C:/projects/agri-system/dataconnect/example/operations.gql)
