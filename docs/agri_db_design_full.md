# Agri System データ設計

## 1. 目的

Agri System は、農業現場の記録、組織運用、作物別管理、資材トレーサビリティ、将来のAI分析を一貫して扱うためのサービスです。

データ設計の基本方針は次のとおりです。

- 認証と業務データを分離する
- 業務データは `組織 -> 農場 -> 生産エリア -> 作付` を基準に管理する
- UI は作物文脈で切り替えられるようにする
- 記録機能は広く無料提供できる構成にし、AI分析は作物単位・組織単位で拡張できるようにする
- ハウスだけに閉じず、露地、圃場、区画、ベッドまで扱える汎用構造にする
- 単位系、ロット、記録由来、証跡を最初から考慮する

---

## 2. データ基盤の役割分担

このシステムは 1 つのデータベースだけで完結させず、責務ごとに分けています。

### Firebase Auth

- ログイン本体
- メール/パスワード認証
- Google ログイン
- 認証ユーザーの `uid`
- 認証ユーザーの `displayName`

### Firestore

- 軽量プロフィール
- 最後に利用した組織の保持
- 招待コードの管理
- UI/オンボーディング補助データ

利用コレクション:

- `app_users/{authUid}`
- `organization_invites/{inviteCode}`

### Firebase Data Connect

- 業務データの正本
- 組織、所属、農場、生産エリア、作付
- 収穫、出荷、作業、環境、病気・害虫
- 資材、ロット、在庫移動
- 分析実行、分析入出力

---

## 3. 全体モデル

コアとなるデータ階層は次のとおりです。

1. `users`
2. `organizations`
3. `organization_members`
4. `farms`
5. `production_units`
6. `crop_types`
7. `crop_varieties`
8. `organization_crop_settings`
9. `cultivation_cycles`

ここで重要なのは `production_units` と `cultivation_cycles` です。

- `production_units` は「どこで作っているか」を表す
- `cultivation_cycles` は「その場所で、どの作物を、どの期間、どの単位で管理するか」を表す

この構造により、DB は場所中心を維持しつつ、画面や分析は作物中心に切り替えられます。

---

## 4. 権限モデル

組織運用の基本権限は `organization_members.role` で管理します。

### `owner`

- 組織の代表
- 組織設定の管理
- 招待管理
- 将来の請求/契約管理の主体

### `manager`

- 現場管理者
- メンバー招待
- 記録管理
- 生産エリア、作付、資材運用

### `worker`

- 現場記録主体
- 作業記録、収穫記録、環境記録、病気・害虫記録

---

## 5. オンボーディングと組織参加

利用開始の流れは次のとおりです。

1. Firebase Auth でアカウント作成
2. Auth ユーザーを Firestore と Data Connect の最小ユーザーへ同期
3. 組織を新規作成する、または招待コードで既存組織へ参加する
4. 所属組織が確定してから業務画面へ入る

### Firestore: `app_users/{authUid}`

- `authUid`
- `email`
- `displayName`
- `photoURL`
- `lastOrganizationId`
- `createdAt`
- `updatedAt`
- `lastLoginAt`

### Firestore: `organization_invites/{inviteCode}`

- `code`
- `organizationId`
- `organizationName`
- `role`
- `invitedEmail`
- `status`
- `expiresAt`
- `maxUses`
- `useCount`
- `createdAt`
- `updatedAt`
- `createdByAuthUid`
- `createdByDisplayName`

招待コードは組織参加のための入口であり、業務データ本体ではないため Firestore で扱います。

---

## 6. Data Connect スキーマ

以下は `dataconnect/schema/schema.gql` に基づく現在の業務データ構成です。

### 6-1. ユーザー・組織

#### `users`

業務データ側で参照する最小ユーザーです。

- `id: UUID`
- `auth_provider`
- `auth_uid`
- `email`
- `display_name`
- `phone`
- `avatar_url`
- `status`
- `last_login_at`
- `created_at`
- `updated_at`

主な制約:

- `auth_uid` は一意

#### `organizations`

契約・運用の主体です。個人農家でも法人でも 1 つの組織として扱います。

- `id`
- `name`
- `organization_type`
- `owner`
- `postal_code`
- `prefecture`
- `city`
- `address_line`
- `timezone`
- `status`
- `created_at`
- `updated_at`

#### `organization_members`

ユーザーと組織の所属関係です。

- `id`
- `organization`
- `user`
- `role`
- `invitation_status`
- `joined_at`
- `created_at`
- `updated_at`

#### `user_preferences`

通知や表示まわりの個人設定です。

- `id`
- `user`
- `language`
- `date_format`
- `notification_email_enabled`
- `notification_push_enabled`
- `daily_report_delivery_time`
- `weekly_report_delivery_day`
- `created_at`
- `updated_at`

---

### 6-2. 農場・生産エリア

#### `farms`

組織配下の拠点です。

- `id`
- `organization`
- `name`
- `postal_code`
- `prefecture`
- `city`
- `address_line`
- `latitude`
- `longitude`
- `elevation_m`
- `notes`
- `created_at`
- `updated_at`

#### `production_units`

現場管理の中心です。ハウス、露地、圃場、区画、ベッドなどを統一的に扱います。

- `id`
- `farm`
- `parent_unit`
- `unit_type`
- `code`
- `name`
- `area_m2`
- `length_m`
- `width_m`
- `height_m`
- `orientation`
- `covering_material`
- `irrigation_system_type`
- `bed_count`
- `row_count`
- `planting_line_count`
- `is_active`
- `notes`
- `created_at`
- `updated_at`

主な制約:

- `code` は任意
- `code` が入る場合は一意
- `parent_unit` により親子構造を持てる

このテーブルは UI 上では「生産エリア」として扱います。

---

### 6-3. 作物マスタ・作物別設定

#### `crop_types`

作物種別マスタです。

- `id`
- `code`
- `name_ja`
- `name_en`
- `cultivation_category`
- `default_yield_unit`
- `default_shipment_unit`
- `created_at`
- `updated_at`

主な制約:

- `code` は一意

#### `crop_varieties`

品種マスタです。

- `id`
- `crop_type`
- `name`
- `producer`
- `characteristics`
- `created_at`
- `updated_at`

#### `organization_crop_settings`

組織ごとの作物利用設定です。

- `id`
- `organization`
- `crop_type`
- `is_enabled`
- `ai_analysis_enabled`
- `default_dashboard`
- `pricing_tier`
- `record_mode`
- `created_at`
- `updated_at`

このテーブルで、作物ごとの無料/有料機能や、ダッシュボード既定表示などを管理します。

---

### 6-4. 作付

#### `cultivation_cycles`

生産エリアと作物を結ぶ中心テーブルです。

- `id`
- `production_unit`
- `crop_type`
- `crop_variety`
- `cycle_name`
- `start_date`
- `end_date`
- `planting_date`
- `expected_harvest_start_date`
- `expected_harvest_end_date`
- `status`
- `primary_record_unit`
- `secondary_record_unit`
- `shipment_unit`
- `planted_area_m2`
- `planted_count`
- `row_count`
- `ridge_count`
- `plant_spacing_cm`
- `line_spacing_cm`
- `source_batch_code`
- `notes`
- `created_at`
- `updated_at`

このテーブルで扱う内容:

- どの生産エリアで育てるか
- 何の作物・品種か
- いつからいつまでの栽培か
- 収穫入力の主単位
- 出荷入力の単位
- 定植母数

#### `crop_stage_events`

生育ステージのイベントです。

- `id`
- `cultivation_cycle`
- `stage_type`
- `occurred_on`
- `recorded_by`
- `notes`
- `created_at`
- `updated_at`

---

### 6-5. 日次・収穫・出荷

#### `daily_production_reports`

日報です。

- `id`
- `production_unit`
- `cultivation_cycle`
- `report_date`
- `worker`
- `general_condition`
- `issues_summary`
- `free_note`
- `created_at`
- `updated_at`

#### `harvest_records`

収穫記録です。

- `id`
- `production_unit`
- `cultivation_cycle`
- `lot_code`
- `harvest_date`
- `quantity_value`
- `quantity_unit`
- `normalized_weight_kg`
- `package_count`
- `package_unit`
- `quality_grade`
- `waste_weight_kg`
- `recorded_by`
- `source_type`
- `notes`
- `created_at`
- `updated_at`

ポイント:

- 入力単位は `quantity_value + quantity_unit`
- 横断集計用に `normalized_weight_kg` を持つ
- ロット単位管理の入口になる

#### `shipment_records`

出荷記録です。

- `id`
- `production_unit`
- `cultivation_cycle`
- `harvest_record`
- `shipment_date`
- `shipment_lot_code`
- `quantity_value`
- `quantity_unit`
- `normalized_weight_kg`
- `package_count`
- `package_unit`
- `average_unit_price`
- `revenue_amount`
- `destination_name`
- `recorded_by`
- `notes`
- `created_at`
- `updated_at`

ポイント:

- 収穫ロットと出荷を結びつけられる
- 売上や単価管理の基礎になる

---

### 6-6. 作業・資材・トレーサビリティ

#### `work_logs`

農作業記録の中心です。

- `id`
- `production_unit`
- `cultivation_cycle`
- `work_date`
- `work_type`
- `started_at`
- `ended_at`
- `duration_minutes`
- `worker_count`
- `operator`
- `status`
- `source_type`
- `note`
- `copied_from_work_log`
- `created_at`
- `updated_at`

ポイント:

- 単独記録にも複製記録にも使える
- `copied_from_work_log` で複製元を追える

#### `work_log_targets`

作業の複数エリア適用先です。

- `id`
- `work_log`
- `production_unit`
- `applied_status`
- `created_at`

#### `irrigation_logs`

潅水詳細です。

- `id`
- `work_log`
- `water_volume_l`
- `duration_minutes`
- `method`
- `timing_type`
- `source_type`
- `notes`
- `created_at`
- `updated_at`

#### `input_materials`

資材マスタです。

- `id`
- `organization`
- `material_type`
- `name`
- `manufacturer`
- `active_ingredient`
- `default_unit`
- `notes`
- `created_at`
- `updated_at`

#### `material_lots`

資材ロットです。

- `id`
- `organization`
- `material`
- `lot_code`
- `supplier_name`
- `purchased_on`
- `expires_on`
- `received_quantity_value`
- `received_quantity_unit`
- `remaining_quantity_value`
- `remaining_quantity_unit`
- `status`
- `notes`
- `created_at`
- `updated_at`

#### `work_material_usages`

どの作業でどのロットを使ったかを記録します。

- `id`
- `work_log`
- `material_lot`
- `usage_quantity_value`
- `usage_quantity_unit`
- `normalized_usage_kg`
- `normalized_usage_l`
- `target_pest_or_disease`
- `dilution_ratio`
- `preharvest_interval_days`
- `notes`
- `created_at`
- `updated_at`

#### `inventory_transactions`

在庫の増減履歴です。

- `id`
- `organization`
- `material_lot`
- `transaction_type`
- `quantity_value`
- `quantity_unit`
- `related_work_log`
- `transaction_on`
- `notes`
- `created_at`

---

### 6-7. 環境・病気・害虫・証跡

#### `weather_locations`

気象参照地点です。

- `id`
- `farm`
- `name`
- `latitude`
- `longitude`
- `source`
- `created_at`
- `updated_at`

#### `weather_daily`

日別気象実績です。

- `id`
- `weather_location`
- `target_date`
- `temp_min_c`
- `temp_max_c`
- `temp_avg_c`
- `humidity_avg_pct`
- `precipitation_mm`
- `solar_radiation`
- `wind_speed_avg`
- `weather_code`
- `source_name`
- `raw_json`
- `created_at`
- `updated_at`

#### `weather_forecasts`

気象予報です。

- `id`
- `weather_location`
- `forecast_generated_at`
- `target_date`
- `temp_min_c`
- `temp_max_c`
- `precipitation_mm`
- `humidity_avg_pct`
- `weather_code`
- `source_name`
- `raw_json`
- `created_at`
- `updated_at`

#### `production_unit_environment_logs`

生産エリア単位の環境記録です。

- `id`
- `production_unit`
- `observed_at`
- `temperature_c`
- `humidity_pct`
- `co2_ppm`
- `soil_temperature_c`
- `soil_moisture_pct`
- `ec_ds_m`
- `ph`
- `light_lux`
- `source_type`
- `recorded_by`
- `notes`
- `created_at`
- `updated_at`

#### `growth_observations`

生育観察です。

- `id`
- `production_unit`
- `cultivation_cycle`
- `observed_on`
- `vigor_score`
- `leaf_color_score`
- `flowering_score`
- `fruiting_score`
- `abnormal_flag`
- `comment`
- `recorded_by`
- `created_at`
- `updated_at`

#### `disease_pest_incidents`

病気・害虫記録です。

- `id`
- `production_unit`
- `cultivation_cycle`
- `occurred_on`
- `category`
- `name`
- `severity_level`
- `affected_area_ratio`
- `action_taken`
- `resolved_on`
- `source_type`
- `note`
- `created_at`
- `updated_at`

#### `observation_attachments`

写真や添付の証跡です。

- `id`
- `organization`
- `production_unit`
- `cultivation_cycle`
- `work_log`
- `harvest_record`
- `disease_pest_incident`
- `environment_log`
- `file_path`
- `file_type`
- `caption`
- `captured_at`
- `uploaded_by`
- `created_at`

---

### 6-8. 分析・予測

#### `analysis_runs`

分析ジョブ本体です。

- `id`
- `organization`
- `farm`
- `production_unit`
- `cultivation_cycle`
- `crop_type`
- `analysis_type`
- `target_date`
- `target_period_start`
- `target_period_end`
- `trigger_type`
- `status`
- `input_snapshot_version`
- `llm_model`
- `started_at`
- `completed_at`
- `created_at`
- `updated_at`

#### `analysis_inputs`

分析実行時の入力スナップショットです。

- `id`
- `analysis_run`
- `payload_json`
- `created_at`

#### `analysis_outputs`

分析結果です。

- `id`
- `analysis_run`
- `summary_text`
- `advice_text`
- `evaluation_text`
- `risk_level`
- `confidence_score`
- `action_items_json`
- `key_metrics_json`
- `created_at`
- `updated_at`

---

## 7. 主な制約と運用ルール

### 7-1. DB制約

`schema.gql` 上で明示されている主な制約:

- `users.auth_uid` は一意
- `crop_types.code` は一意
- `production_units.code` は一意
- 主キーは基本的に `UUID`
- 作成日時は `request.time`
- 更新日時も `request.time` を初期値で付与

### 7-2. 運用上の前提

- `production_units.code` は任意
- コードを入れる場合は、入力・検索・連携・音声入力の識別子として使う
- 組織メンバーの重複所属は発生させない前提でアプリ側でも制御する
- 招待コードの利用回数、期限、メール制限は Firestore 側で管理する
- 作物の無料/有料差は `organization_crop_settings` で表現する

---

## 8. UIとDBの関係

### DBは場所中心

- `organization`
- `farm`
- `production_unit`

### UIは作物中心に切替可能

- `crop_type`
- `organization_crop_settings`
- `cultivation_cycle`

これにより、同じ DB のまま次の両立が可能になります。

- 場所ごとの履歴管理
- 作物ごとのダッシュボード切替
- 作物ごとのAI分析
- 作物ごとの料金制御

---

## 9. 現在の実装で見るべきファイル

### スキーマ本体

- `dataconnect/schema/schema.gql`

### アプリからの利用入口

- `dataconnect/example/operations.gql`

### オンボーディングと組織参加

- `docs/onboarding-organization-architecture.md`

---

## 10. 設計要約

このシステムの現在のデータ設計は、次の一文で表せます。

`認証は Firebase Auth、軽量プロフィールと招待は Firestore、農業の正データは Data Connect。業務データは 組織 -> 農場 -> 生産エリア -> 作付 を核にし、画面とAIは作物文脈で切り替える。`
