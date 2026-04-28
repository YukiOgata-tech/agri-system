# 初回オンボーディング / 組織参加アーキテクチャ

## 目的

認証済みユーザーをそのままダッシュボードへ通すのではなく、以下の順に利用開始させる。

1. Firebase Auth でアカウント作成
2. 最小限の利用ユーザーを Data Connect / Firestore に同期
3. 組織を新規作成する、または招待コードで既存組織へ参加する
4. 組織所属が確定した後に業務画面へ入る

この変更により、誰が記録したか、どの組織に属しているか、誰を招待できるか、を最初から一貫して扱える。

---

## 役割分担

### Firebase Auth

- ログイン本体
- メール/パスワード、Google ログイン
- `displayName` の更新元

### Firestore

- 軽量なプロフィール
- 最後に使った組織 ID
- 招待コードドキュメント

利用コレクション:

- `app_users/{authUid}`
- `organization_invites/{inviteCode}`

### Data Connect

- 業務データの正本
- `users`
- `organizations`
- `organization_members`
- 既存の農業データ群 `farms / production_units / cultivation_cycles ...`

---

## 実装フロー

### 初回ログイン

`AppSessionProvider` が以下を順に行う。

1. Firestore の `app_users/{authUid}` を作成または更新
2. Data Connect の `users` を `authUid` 基準で作成または更新
3. `organization_members` を取得
4. 所属組織がなければ `needsOnboarding = true`
5. 所属組織があれば Firestore の `lastOrganizationId` を見てアクティブ組織を確定

### 組織新規作成

オンボーディング画面から以下を作る。

1. `organizations`
2. `organization_members` に `owner`
3. 最初の `farms` 1件
4. Firestore `app_users.lastOrganizationId`

### 招待参加

招待コード入力時に以下を行う。

1. Firestore の `organization_invites/{code}` を検証
2. メール制限、期限、利用回数を確認
3. `organization_members` を作成
4. 招待コードの `useCount` を増やす
5. 必要なら `status = exhausted`
6. Firestore `app_users.lastOrganizationId` を更新

---

## 追加した主要 UI

### `/onboarding`

- `組織を作成`
- `招待で参加`
- 招待コードプレビュー
- アカウントやり直し用のログアウト

### `/settings`

- アカウント表示名更新
- 所属組織の確認と切替
- メンバー一覧
- 招待コード発行
- 招待コード停止
- コード/URLコピー

### サイドバー

- 現在の所属組織表示
- 複数所属時の組織切替

---

## 追加・変更した主なファイル

### セッション / 認証まわり

- `components/providers/app-session-provider.tsx`
- `lib/app-identity.ts`
- `lib/auth.ts`
- `lib/firebase.ts`

### ルーティング

- `app/page.tsx`
- `app/(app)/layout.tsx`
- `app/(auth)/login/page.tsx`
- `app/(auth)/register/page.tsx`
- `app/onboarding/page.tsx`
- `app/onboarding/onboarding-page-client.tsx`

### 組織管理 UI

- `app/(app)/settings/page.tsx`
- `components/layout/sidebar.tsx`
- `components/layout/mobile-header.tsx`

### Data Connect

- `dataconnect/example/operations.gql`

---

## Data Connect 側の変更点

追加した主な mutation:

- `UpdateUserProfile`

既存の以下をオンボーディングで利用:

- `CreateUser`
- `CreateOrganization`
- `CreateOrganizationMember`
- `CreateFarm`
- `GetUserByAuthUid`
- `GetOrganizationMembersByAuthUid`
- `GetOrganizationById`
- `GetOrganizationMembersByOrganization`

`operations.gql` を変更しているため、ローカル検証では Data Connect エミュレータ再起動が必要。

---

## Firestore ドキュメント設計

### `app_users/{authUid}`

- `authUid`
- `email`
- `displayName`
- `photoURL`
- `lastOrganizationId`
- `createdAt`
- `updatedAt`
- `lastLoginAt`

### `organization_invites/{inviteCode}`

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

---

## ローカル開発メモ

### Data Connect

- `firebase emulators:start --only dataconnect`
- `operations.gql` や `schema.gql` を変えたら再起動

### Firestore

デフォルトでは通常の Firestore 接続のまま。

ローカル Firestore Emulator を使う場合は、`.env.local` などで以下を設定する。

```env
NEXT_PUBLIC_USE_FIRESTORE_EMULATOR=true
NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST=127.0.0.1
NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT=8080
```

---

## 現時点の制約

- 招待コードは Firestore 側で管理している
- `organization_members` の重複防止は現在アプリ側チェック中心
- 組織削除、メンバー削除、権限変更 UI は未実装
- Firestore セキュリティルールや Data Connect 側の厳密な権限設計は今後の整理対象

---

## 次に進める候補

1. 組織オーナーによるメンバー権限変更
2. 招待 URL のワンクリック参加導線
3. Firestore ルール整備
4. 組織切替時の各画面キャッシュ最適化
5. Auth / Firestore / Data Connect をまたぐ退会・組織離脱フロー
