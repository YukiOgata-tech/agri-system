以下、**いちご向けで始めつつ、他作物にも拡張できるDB設計案の全体版**です。  
添付mdの記録項目を土台にしています。 fileciteturn0file0

---

# DB設計方針

## 目的
このDBは、次の4つを同時に支える前提で設計します。

1. 農家の記録システム  
2. ダッシュボード分析  
3. LLMによるレポート・助言  
4. サービス運用（課金、権限、通知、監査）

## 設計思想
- **農場 > ハウス > 作物/品種 > 記録** の階層で管理
- 記録はまず **ハウス単位** を基本にする
- 作物差分は **共通テーブル + 設定/拡張テーブル** で吸収
- LLM出力や分析結果は**別テーブルで保持**
- 将来のAPI連携やCSV取込に備えて、**外部ID管理テーブル**を持つ

---

# 全体ERの考え方

大きく以下の領域に分けます。

1. 認証・ユーザー・権限
2. 農場・ハウス・作物マスタ
3. 日々の記録データ
4. 天候・環境・外部データ
5. 分析・予測・LLM出力
6. 通知・アクション・フィードバック
7. サービス運用・課金・契約
8. 外部連携・監査・インポート

---

# 1. 認証・ユーザー・権限系

## users
ログイン主体。Authと紐づくアプリ側ユーザー。

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

## organizations
農家、農園法人、団体の単位。

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

## organization_members
組織に対する参加ユーザー。

- id
- organization_id
- user_id
- role
- invitation_status
- joined_at
- created_at
- updated_at

### 想定role
- owner
- admin
- manager
- worker
- viewer

## user_preferences
ユーザーごとの表示・通知設定。

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

# 2. 農場・ハウス・作物マスタ系

## farms
組織配下の農場。

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

## farm_sites
農場の中の拠点や圃場群。必要なら使う中間単位。

- id
- farm_id
- name
- site_type
- latitude
- longitude
- notes
- created_at
- updated_at

## greenhouses
ハウス単位管理の中心。

- id
- farm_id
- site_id
- code
- name
- greenhouse_type
- area_m2
- length_m
- width_m
- height_m
- orientation
- covering_material
- irrigation_system_type
- is_active
- notes
- created_at
- updated_at

## plots
露地やハウス内区画に対応する任意単位。

- id
- farm_id
- greenhouse_id
- name
- plot_type
- area_m2
- notes
- created_at
- updated_at

## crop_types
作物種別マスタ。

- id
- code
- name_ja
- name_en
- cultivation_category
- default_unit_yield
- created_at
- updated_at

## crop_varieties
品種マスタ。

- id
- crop_type_id
- name
- producer
- characteristics
- created_at
- updated_at

## cultivation_cycles
作付・栽培サイクル。ハウスごとに「今季」を持つ。

- id
- greenhouse_id
- plot_id
- crop_type_id
- crop_variety_id
- cycle_name
- start_date
- end_date
- planting_date
- expected_harvest_start_date
- expected_harvest_end_date
- status
- notes
- created_at
- updated_at

## crop_stage_events
生育ステージイベント。

- id
- cultivation_cycle_id
- stage_type
- occurred_on
- recorded_by_user_id
- notes
- created_at
- updated_at

### stage_type例
- transplanting
- flowering
- fruit_set
- harvest_start
- harvest_end
- heading
- ripening

---

# 3. 日々の記録データ系

## daily_house_reports
ハウス単位の日次サマリ。記録入力の入口としても使える。

- id
- greenhouse_id
- cultivation_cycle_id
- report_date
- worker_user_id
- general_condition
- issues_summary
- free_note
- created_at
- updated_at

## harvest_records
収穫データ。

- id
- greenhouse_id
- cultivation_cycle_id
- harvest_date
- quantity_kg
- quantity_count
- grade_a_kg
- grade_b_kg
- grade_c_kg
- waste_kg
- average_unit_weight_g
- recorded_by_user_id
- notes
- created_at
- updated_at

## shipment_records
出荷データ。

- id
- greenhouse_id
- cultivation_cycle_id
- shipment_date
- shipped_kg
- shipped_count
- average_unit_price
- revenue_amount
- destination_name
- notes
- created_at
- updated_at

## work_logs
作業ログの親テーブル。

- id
- greenhouse_id
- cultivation_cycle_id
- work_date
- work_type
- started_at
- ended_at
- duration_minutes
- worker_count
- operator_user_id
- status
- note
- copied_from_work_log_id
- created_at
- updated_at

### work_type例
- irrigation
- fertilization
- pesticide
- harvest
- pruning
- pollination
- ventilation
- cleaning
- inspection
- shipping
- other

## work_log_targets
1つの作業を複数ハウスへ一括適用した履歴。

- id
- work_log_id
- greenhouse_id
- applied_status
- created_at

## irrigation_logs
潅水詳細。

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

## fertilization_logs
施肥詳細。

- id
- work_log_id
- fertilizer_name
- amount_kg
- amount_l
- nitrogen_n
- phosphorus_p
- potassium_k
- application_method
- notes
- created_at
- updated_at

## pesticide_logs
防除詳細。

- id
- work_log_id
- pesticide_name
- active_ingredient
- target_pest_or_disease
- amount
- unit
- dilution_ratio
- application_method
- preharvest_interval_days
- notes
- created_at
- updated_at

## labor_logs
労務データ。

- id
- greenhouse_id
- work_log_id
- work_date
- worker_count
- work_hours
- labor_cost_amount
- notes
- created_at
- updated_at

## cost_records
コスト記録。

- id
- greenhouse_id
- cultivation_cycle_id
- cost_date
- cost_category
- amount
- vendor_name
- related_work_log_id
- memo
- created_at
- updated_at

### cost_category例
- fertilizer
- pesticide
- labor
- equipment
- utility
- shipping
- other

## equipment_master
設備・機械マスタ。

- id
- organization_id
- name
- equipment_type
- model_name
- serial_number
- purchase_date
- greenhouse_id
- notes
- created_at
- updated_at

## equipment_usage_logs
設備利用ログ。

- id
- equipment_id
- greenhouse_id
- work_log_id
- usage_date
- operating_hours
- fuel_consumption_l
- note
- created_at
- updated_at

---

# 4. 環境・天候・病害系

IoT未導入想定でも、外部天気と手入力環境は持てるようにします。

## weather_locations
天気取得地点。

- id
- farm_id
- name
- latitude
- longitude
- source
- created_at
- updated_at

## weather_daily
外部天気の日次データ。

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

## weather_forecasts
予報データ。

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

## greenhouse_environment_logs
ハウス内環境。手入力または将来IoT対応。

- id
- greenhouse_id
- observed_at
- temperature_c
- humidity_pct
- co2_ppm
- soil_temperature_c
- soil_moisture_pct
- light_lux
- source_type
- recorded_by_user_id
- notes
- created_at
- updated_at

## growth_condition_logs
生育状態の観察記録。

- id
- greenhouse_id
- cultivation_cycle_id
- observed_on
- vigor_score
- leaf_color_score
- abnormal_flag
- comment
- recorded_by_user_id
- created_at
- updated_at

## disease_pest_incidents
病害虫発生記録。

- id
- greenhouse_id
- cultivation_cycle_id
- occurred_on
- category
- name
- severity_level
- affected_area_ratio
- action_taken
- resolved_on
- note
- created_at
- updated_at

### category例
- disease
- pest

---

# 5. 分析・予測・LLM出力系

ここはかなり重要です。  
**生データとは分けて持つ**前提です。

## analysis_runs
分析実行の親。

- id
- organization_id
- farm_id
- greenhouse_id
- cultivation_cycle_id
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

### analysis_type例
- daily_report
- alert_risk
- weekly_summary
- growth_forecast
- yearly_review
- anomaly_detection
- shipment_forecast

## analysis_inputs
分析時に使った要約済み入力。

- id
- analysis_run_id
- payload_json
- created_at

## analysis_outputs
分析結果本体。

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

## analysis_metric_snapshots
分析時点の主要指標。

- id
- analysis_run_id
- metric_name
- metric_value
- metric_unit
- comparison_baseline
- comparison_value
- comparison_delta
- created_at

## forecasts
予測値保存。

- id
- greenhouse_id
- cultivation_cycle_id
- forecast_type
- target_date
- predicted_value
- lower_bound
- upper_bound
- unit
- model_name
- created_at
- updated_at

### forecast_type例
- harvest_kg
- shipment_kg
- disease_risk
- growth_stage_probability

## farmer_feedbacks
分析結果への農家フィードバック。

- id
- analysis_run_id
- user_id
- helpful_score
- applied_flag
- comment
- created_at

## farm_profiles
農場ごとのパーソナライズ用要約。

- id
- farm_id
- summary_text
- preferred_focus
- recurring_issues_json
- strong_patterns_json
- weak_patterns_json
- updated_by_analysis_run_id
- created_at
- updated_at

---

# 6. 通知・タスク・アクション系

## notifications
通知送信履歴。

- id
- organization_id
- farm_id
- greenhouse_id
- analysis_run_id
- notification_type
- title
- body
- channel
- recipient_user_id
- status
- sent_at
- created_at

### notification_type例
- daily_report
- risk_alert
- weekly_summary
- shipment_alert

## notification_preferences
通知設定。

- id
- user_id
- farm_id
- greenhouse_id
- enable_daily_report
- enable_risk_alert
- enable_weekly_summary
- delivery_time
- created_at
- updated_at

## recommended_actions
推奨アクションを構造化保存。

- id
- analysis_run_id
- greenhouse_id
- action_type
- priority
- due_date
- description
- completion_status
- completed_by_user_id
- completed_at
- created_at
- updated_at

## farmer_tasks
農家が管理するタスク。

- id
- greenhouse_id
- cultivation_cycle_id
- title
- description
- task_type
- priority
- due_date
- assigned_user_id
- status
- related_analysis_run_id
- created_at
- updated_at

---

# 7. サービス運用・契約・課金系

## plans
料金プランマスタ。

- id
- code
- name
- monthly_base_fee
- included_greenhouse_count
- extra_greenhouse_fee
- features_json
- is_active
- created_at
- updated_at

## subscriptions
契約情報。

- id
- organization_id
- plan_id
- status
- billing_cycle
- started_at
- current_period_start
- current_period_end
- canceled_at
- created_at
- updated_at

## subscription_items
契約に紐づく従量要素。

- id
- subscription_id
- item_type
- quantity
- unit_price
- created_at
- updated_at

### item_type例
- greenhouse
- storage
- premium_reports

## invoices
請求書。

- id
- organization_id
- subscription_id
- invoice_no
- billing_period_start
- billing_period_end
- subtotal_amount
- tax_amount
- total_amount
- status
- issued_at
- paid_at
- created_at
- updated_at

## payments
支払履歴。

- id
- invoice_id
- amount
- payment_method
- payment_provider
- payment_status
- paid_at
- created_at
- updated_at

## feature_usage_logs
機能利用量。従量課金や監視用。

- id
- organization_id
- greenhouse_id
- feature_code
- usage_date
- usage_count
- meta_json
- created_at

---

# 8. 外部連携・インポート・監査系

## external_integrations
外部サービス連携設定。

- id
- organization_id
- provider_name
- account_identifier
- connection_status
- access_token_encrypted
- refresh_token_encrypted
- token_expires_at
- created_at
- updated_at

### provider_name例
- ksas
- csv_import
- weather_api

## external_sync_jobs
同期ジョブ管理。

- id
- external_integration_id
- job_type
- status
- requested_at
- started_at
- completed_at
- result_summary
- error_message
- created_at
- updated_at

## external_resource_mappings
外部IDと内部IDの対応。

- id
- external_integration_id
- resource_type
- external_resource_id
- internal_resource_id
- metadata_json
- created_at
- updated_at

## import_files
CSV/Excel取込履歴。

- id
- organization_id
- uploaded_by_user_id
- file_name
- file_path
- file_type
- import_type
- status
- uploaded_at
- processed_at
- created_at
- updated_at

## import_rows
取込結果詳細。

- id
- import_file_id
- row_number
- raw_data_json
- normalized_data_json
- status
- error_message
- created_at

## audit_logs
監査ログ。

- id
- organization_id
- user_id
- action_type
- resource_type
- resource_id
- before_json
- after_json
- ip_address
- user_agent
- created_at

---

# 作物別拡張の持ち方

ここは重要です。  
作物ごとにテーブルを全部分けるのではなく、次の2段階がおすすめです。

## 方式A: 共通 + 設定
作物別のフォーム切替や分析条件は設定テーブルで持つ。

### crop_form_definitions
- id
- crop_type_id
- version
- schema_json
- is_active
- created_at
- updated_at

### crop_analysis_configs
- id
- crop_type_id
- analysis_type
- config_json
- is_active
- created_at
- updated_at

これで、いちご・トマト・稲ごとに重要項目や表示を切り替える。

## 方式B: 必要なら拡張テーブル
いちごだけ特別に必要なものが強いなら追加。

### strawberry_growth_logs
- id
- greenhouse_id
- cultivation_cycle_id
- observed_on
- flower_count
- fruit_set_count
- malformed_fruit_count
- gray_mold_risk_score
- note
- created_at
- updated_at

最初は方式A中心で十分です。

---

# 主要リレーション

## ユーザー周り
- organizations 1 : N organization_members
- users 1 : N organization_members

## 現場周り
- organizations 1 : N farms
- farms 1 : N greenhouses
- greenhouses 1 : N cultivation_cycles

## 記録周り
- greenhouses 1 : N work_logs
- work_logs 1 : 1 irrigation_logs
- work_logs 1 : 1 fertilization_logs
- work_logs 1 : 1 pesticide_logs
- greenhouses 1 : N harvest_records
- greenhouses 1 : N shipment_records

## 分析周り
- greenhouses 1 : N analysis_runs
- analysis_runs 1 : 1 analysis_outputs
- analysis_runs 1 : N analysis_metric_snapshots
- analysis_runs 1 : N recommended_actions

## 課金周り
- organizations 1 : N subscriptions
- subscriptions 1 : N invoices
- invoices 1 : N payments

---

# MVPで最低限必要なテーブル

最初から全部作る必要はありません。  
MVPなら次で十分です。

## 必須
- users
- organizations
- organization_members
- farms
- greenhouses
- crop_types
- crop_varieties
- cultivation_cycles
- harvest_records
- work_logs
- irrigation_logs
- fertilization_logs
- pesticide_logs
- weather_daily
- weather_forecasts
- disease_pest_incidents
- analysis_runs
- analysis_outputs
- notifications
- plans
- subscriptions

## あると強い
- shipment_records
- labor_logs
- cost_records
- recommended_actions
- farmer_feedbacks
- import_files
- import_rows
- audit_logs

---

# いちご向けで特に重要なカラム

いちご向けMVPでは、まず次を強く取るべきです。  
これは添付mdの「いちごで重要な項目」とも整合します。 fileciteturn0file0

## 重要
- greenhouses.area_m2
- cultivation_cycles.planting_date
- crop_stage_events.stage_type / occurred_on
- harvest_records.harvest_date / quantity_kg / waste_kg
- irrigation_logs.water_volume_l / timing_type
- greenhouse_environment_logs.temperature_c / humidity_pct
- disease_pest_incidents.name / severity_level
- weather_daily.temp_min_c / temp_max_c / humidity_avg_pct / precipitation_mm

---

# 実装時の注意

## 1. work_logsは親テーブルにする
潅水、施肥、防除を全部別管理にしてもよいですが、親の作業ログがある方がUIと監査が楽です。

## 2. 分析出力は生データから分離
analysis_outputs に保存し、毎回再生成しなくても参照できるようにする。

## 3. ハウス一括コピーを前提にする
work_logs.copied_from_work_log_id と work_log_targets を入れておくとよいです。

## 4. 外部IDマッピングは最初から入れる
KSASやCSV連携に備えて external_resource_mappings は早めに置くべきです。

## 5. 農場プロファイルを持つ
LLMのパーソナライズ用に farm_profiles はかなり有効です。

---

# 最終結論

このサービスのDBは、

- **現場記録DB**
- **分析/LLM結果DB**
- **SaaS運用DB**

の3層で考えるのが最も整理しやすいです。

最初はいちご向けに始めても、  
**共通コア + 作物別設定 + 一部拡張テーブル** の形なら、他作物へ十分広げられます。

次に進めるなら、  
**この設計をそのまま Supabase/PostgreSQL の CREATE TABLE 仕様レベル**まで落とせます。
