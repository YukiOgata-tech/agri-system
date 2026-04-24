# Agri System DB設計方針 v2

この版では、次の前提で設計を組み直しています。

- DBのコアは `ユーザー/組織 -> 農場 -> 生産単位` を維持する
- UI、分析、課金は `作物` 文脈で切り替えられるようにする
- いちごで始めても、構造は汎用作物ベースにする
- 単位系とトレーサビリティを最初から設計に入れる

---

## 1. この設計の結論

`ユーザー -> 作物種 -> ハウス/畑` をDBの主階層にはしません。

代わりに、DBは次の構造をコアにします。

- organizations
- farms
- production_units
- crop_types
- crop_varieties
- cultivation_cycles

ここで重要なのは `cultivation_cycles` です。

`生産単位 + 作物 + 栽培期間` を 1 レコードとして持つことで、次を両立します。

- 場所ごとの履歴管理
- 作物ごとの画面切り替え
- 作物ごとのAI分析
- 作物ごとの課金や機能制御

---

## 2. UIの考え方

DBは場所中心ですが、UIは作物中心で切り替えます。

例:

- 全体
- いちご
- トマト
- 小松菜

この切り替えで、画面上は次の対象を絞り込みます。

- ダッシュボード
- 収穫記録
- 作業記録
- 病害虫
- AI分析
- 通知

つまり、データ構造は場所中心、利用体験は作物中心です。

---

## 3. コアERの考え方

### organizations

契約主体。農家、農業法人、団体。

### farms

農場や拠点。

### production_units

現場管理の中心。ハウス、露地、圃場、区画、ベッドなどを統一的に扱う単位。

### crop_types

作物種別マスタ。

### crop_varieties

品種マスタ。

### cultivation_cycles

どの生産単位で、どの作物を、いつからいつまで、どの単位で管理するかを持つ。

このテーブルが、場所と作物を結ぶ要です。

---

## 4. 主要テーブル

### 4-1. 認証・組織

#### users

- id
- auth_provider
- auth_uid
- email
- display_name
- phone
- avatar_url
- status
- last_login_at
- created_at
- updated_at

#### organizations

- id
- name
- organization_type
- owner_user_id
- postal_code
- prefecture
- city
- address_line
- timezone
- status
- created_at
- updated_at

#### organization_members

- id
- organization_id
- user_id
- role
- invitation_status
- joined_at
- created_at
- updated_at

#### user_preferences

- id
- user_id
- language
- date_format
- notification_email_enabled
- notification_push_enabled
- daily_report_delivery_time
- weekly_report_delivery_day
- created_at
- updated_at

---

### 4-2. 作物切り替え・作物別契約

#### organization_crop_settings

組織ごとに、どの作物を使うか、どこまで機能を有効にするかを管理する。

- id
- organization_id
- crop_type_id
- is_enabled
- ai_analysis_enabled
- default_dashboard
- pricing_tier
- record_mode
- created_at
- updated_at

用途:

- 作物タブの表示制御
- 作物別AI分析の ON/OFF
- 作物別課金
- 作物別入力設定の切り替え

---

### 4-3. 農場・生産単位

#### farms

- id
- organization_id
- name
- postal_code
- prefecture
- city
- address_line
- latitude
- longitude
- elevation_m
- notes
- created_at
- updated_at

#### production_units

`greenhouses` を一般化したテーブル。

- id
- farm_id
- parent_unit_id
- unit_type
- code
- name
- area_m2
- length_m
- width_m
- height_m
- orientation
- covering_material
- irrigation_system_type
- bed_count
- row_count
- planting_line_count
- is_active
- notes
- created_at
- updated_at

### unit_type 例

- greenhouse
- open_field
- plot
- bed
- orchard_block
- nursery_area

この構造で、次のように親子表現できます。

- A棟
- A棟-北ベッド
- 第2圃場
- 第2圃場-西区画

---

### 4-4. 作物マスタ

#### crop_types

- id
- code
- name_ja
- name_en
- cultivation_category
- default_yield_unit
- default_shipment_unit
- created_at
- updated_at

#### crop_varieties

- id
- crop_type_id
- name
- producer
- characteristics
- created_at
- updated_at

---

### 4-5. 作付サイクル

#### cultivation_cycles

この設計で最も重要なテーブル。

- id
- production_unit_id
- crop_type_id
- crop_variety_id
- cycle_name
- start_date
- end_date
- planting_date
- expected_harvest_start_date
- expected_harvest_end_date
- status
- primary_record_unit
- secondary_record_unit
- shipment_unit
- planted_area_m2
- planted_count
- row_count
- ridge_count
- plant_spacing_cm
- line_spacing_cm
- source_batch_code
- notes
- created_at
- updated_at

ここで決める内容:

- 何を育てるか
- どの単位で日々記録するか
- 出荷で何単位を使うか
- 比較の母数になる定植情報

### crop_stage_events

- id
- cultivation_cycle_id
- stage_type
- occurred_on
- recorded_by_user_id
- notes
- created_at
- updated_at

---

### 4-6. 収穫・出荷

#### harvest_records

収穫時点の記録。トレーサビリティ起点にもなる。

- id
- production_unit_id
- cultivation_cycle_id
- lot_code
- harvest_date
- quantity_value
- quantity_unit
- normalized_weight_kg
- package_count
- package_unit
- quality_grade
- waste_weight_kg
- recorded_by_user_id
- source_type
- notes
- created_at
- updated_at

### source_type 例

- manual
- imported
- external_api
- inferred

#### shipment_records

出荷記録。収穫記録または収穫ロットを参照できるようにする。

- id
- production_unit_id
- cultivation_cycle_id
- harvest_record_id
- shipment_date
- shipment_lot_code
- quantity_value
- quantity_unit
- normalized_weight_kg
- package_count
- package_unit
- average_unit_price
- revenue_amount
- destination_name
- recorded_by_user_id
- notes
- created_at
- updated_at

この形にしておくと、

- どの収穫ロットが
- どこへ
- どの荷姿で
- いくらで出たか

が追えます。

---

### 4-7. 作業記録

#### work_logs

- id
- production_unit_id
- cultivation_cycle_id
- work_date
- work_type
- started_at
- ended_at
- duration_minutes
- worker_count
- operator_user_id
- status
- source_type
- note
- copied_from_work_log_id
- created_at
- updated_at

#### work_log_targets

- id
- work_log_id
- production_unit_id
- applied_status
- created_at

#### irrigation_logs

- id
- work_log_id
- water_volume_l
- duration_minutes
- method
- timing_type
- source_type
- notes
- created_at
- updated_at

#### work_material_usages

施肥、防除、培土、資材投入などを共通で表現する。

- id
- work_log_id
- material_lot_id
- usage_quantity_value
- usage_quantity_unit
- normalized_usage_kg
- normalized_usage_l
- target_pest_or_disease
- dilution_ratio
- preharvest_interval_days
- notes
- created_at
- updated_at

この構造にすると、施肥と防除を個別テーブルで増やし続けなくて済みます。

---

### 4-8. 資材・ロット・在庫

#### input_materials

- id
- organization_id
- material_type
- name
- manufacturer
- active_ingredient
- default_unit
- notes
- created_at
- updated_at

### material_type 例

- fertilizer
- pesticide
- seed
- seedling
- substrate
- packaging
- other

#### material_lots

- id
- organization_id
- material_id
- lot_code
- supplier_name
- purchased_on
- expires_on
- received_quantity_value
- received_quantity_unit
- remaining_quantity_value
- remaining_quantity_unit
- status
- notes
- created_at
- updated_at

#### inventory_transactions

- id
- organization_id
- material_lot_id
- transaction_type
- quantity_value
- quantity_unit
- related_work_log_id
- transaction_on
- notes
- created_at

### transaction_type 例

- purchase
- usage
- adjustment
- disposal

これで「どのロットをどこで使ったか」が追跡できます。

---

### 4-9. 環境・観察・病害虫

#### weather_locations

- id
- farm_id
- name
- latitude
- longitude
- source
- created_at
- updated_at

#### weather_daily

- id
- weather_location_id
- target_date
- temp_min_c
- temp_max_c
- temp_avg_c
- humidity_avg_pct
- precipitation_mm
- solar_radiation
- wind_speed_avg
- weather_code
- source_name
- raw_json
- created_at
- updated_at

#### weather_forecasts

- id
- weather_location_id
- forecast_generated_at
- target_date
- temp_min_c
- temp_max_c
- precipitation_mm
- humidity_avg_pct
- weather_code
- source_name
- raw_json
- created_at
- updated_at

#### production_unit_environment_logs

- id
- production_unit_id
- observed_at
- temperature_c
- humidity_pct
- co2_ppm
- soil_temperature_c
- soil_moisture_pct
- ec_ds_m
- ph
- light_lux
- source_type
- recorded_by_user_id
- notes
- created_at
- updated_at

#### growth_observations

- id
- production_unit_id
- cultivation_cycle_id
- observed_on
- vigor_score
- leaf_color_score
- flowering_score
- fruiting_score
- abnormal_flag
- comment
- recorded_by_user_id
- created_at
- updated_at

#### disease_pest_incidents

- id
- production_unit_id
- cultivation_cycle_id
- occurred_on
- category
- name
- severity_level
- affected_area_ratio
- action_taken
- resolved_on
- source_type
- note
- created_at
- updated_at

---

### 4-10. 添付・証跡

#### observation_attachments

- id
- organization_id
- production_unit_id
- cultivation_cycle_id
- work_log_id
- harvest_record_id
- disease_pest_incident_id
- environment_log_id
- file_path
- file_type
- caption
- captured_at
- uploaded_by_user_id
- created_at

写真、PDF、点検メモ画像などの証跡をまとめて管理する。

---

### 4-11. 分析・AI

#### analysis_runs

- id
- organization_id
- farm_id
- production_unit_id
- cultivation_cycle_id
- crop_type_id
- analysis_type
- target_date
- target_period_start
- target_period_end
- trigger_type
- status
- input_snapshot_version
- llm_model
- started_at
- completed_at
- created_at
- updated_at

#### analysis_inputs

- id
- analysis_run_id
- payload_json
- created_at

#### analysis_outputs

- id
- analysis_run_id
- summary_text
- advice_text
- evaluation_text
- risk_level
- confidence_score
- action_items_json
- key_metrics_json
- created_at
- updated_at

---

### 4-12. 通知・課金・監査

ここは設計思想を継続する。

- notifications
- notification_preferences
- plans
- subscriptions
- feature_usage_logs
- import_files
- import_rows
- audit_logs

このとき、作物別契約やAI課金は `organization_crop_settings` と組み合わせて扱う。

---

## 5. この設計でできること

### 5-1. UIで作物を切り替える

組織が有効化している作物だけをヘッダーで選択できる。

### 5-2. 同じ場所の履歴を維持する

ハウスAで、春はいちご、秋はトマトでも履歴を壊さない。

### 5-3. 露地や果樹にも拡張できる

`production_units` の `unit_type` で吸収できる。

### 5-4. 単位系を作物ごとに切り替えられる

作付サイクルで `kg / 個 / 束 / 箱` などの既定単位を定義できる。

### 5-5. 資材ロットを追跡できる

どのロットをどの作業でどこに使ったか追える。

### 5-6. AI分析を作物別に提供できる

いちごだけ AI 分析を有効、トマトは記録だけ、のような制御ができる。

---

## 6. MVP優先順位

### 必須

- users
- organizations
- organization_members
- farms
- production_units
- crop_types
- crop_varieties
- organization_crop_settings
- cultivation_cycles
- crop_stage_events
- harvest_records
- shipment_records
- work_logs
- work_log_targets
- irrigation_logs
- input_materials
- material_lots
- work_material_usages
- production_unit_environment_logs
- disease_pest_incidents
- weather_daily
- analysis_runs
- analysis_outputs

### あると強い

- inventory_transactions
- growth_observations
- observation_attachments
- notifications
- import_files
- import_rows
- audit_logs

---

## 7. UI変更の要点

### 7-1. ハウス管理

`ハウス管理` を `生産単位管理` に拡張する。

作成時の入力:

- 生産単位タイプ
- 親単位
- 名前
- コード
- 面積
- 稼働状態
- 補足情報

### 7-2. 作付設定

新しい中心画面として追加する。

入力:

- 生産単位
- 作物
- 品種
- 栽培期間
- 記録の主単位
- 出荷単位
- 定植母数

### 7-3. ダッシュボード

ヘッダーに作物切り替えを入れる。

- 全体
- いちご
- トマト
- 他

### 7-4. 作業記録

資材選択時にロットも選べるようにする。

### 7-5. 収穫・出荷

収穫時にロットコードを持ち、出荷時にその収穫ロットを参照する。

---

## 8. 旧設計からの主な変更点

- `greenhouses` 中心から `production_units` 中心へ一般化
- `作物を親階層にする` のではなく `cultivation_cycles` を強化
- `organization_crop_settings` を追加し、作物別UI/分析/課金を表現
- 収穫・出荷に `quantity_value + quantity_unit + normalized_weight_kg` を導入
- 施肥/防除の詳細を `work_material_usages` と `material_lots` に寄せてトレーサビリティ対応
- 添付ファイルと証跡管理を追加
- AI分析のスコープに `crop_type_id` を含める

---

## 9. 最終結論

このサービスは、

- データ構造は場所中心
- 利用体験は作物中心
- 単位系は作付中心
- トレーサビリティは作業/収穫/出荷中心

で設計するのが最も拡張性と運用性のバランスが良いです。
