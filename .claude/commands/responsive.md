# /responsive — スマホレスポンシブ改善

対象: $ARGUMENTS（省略時は指示を待つ）

---

## ▼ STEP 0: 必ず最初にネスト構造を監査する

対象ページを Read し、以下を**数えて列挙**してから作業に入る。

チェック項目：
- padding/margin が何層重なっているか（Card > CardContent > div > form など）
- `grid-cols-2` や `grid-cols-3` がスマホでそのまま残っている箇所
- テーブルがあるか（→ カードリスト化が必要）
- ダイアログがあるか（→ ボトムシート化が必要）
- 文字サイズをコンポーネントのデフォルトに任せている箇所

監査結果をユーザーに提示し、**方針を確認してから修正に入る**。

---

## ▼ このプロジェクトの UI コンポーネントが持つ固有スペーシング

`components/ui/` の各コンポーネントが暗黙的に持つ余白。
これが重なると「狭い・縦長」の根本原因になる。

| コンポーネント | 固有の余白 |
|---|---|
| `Card` | `rounded-xl border shadow-sm`（余白なし、枠のみ） |
| `CardHeader` | `p-6 pb-0` |
| `CardContent` | `p-6`（デフォルト）または上書き `p-4` |
| `DialogContent` | `p-6` |
| `DialogHeader` | `pb-4` |
| `Button` size=sm | `px-3 py-1.5 h-9` |

**モバイルでは上記が重複しないよう、構造から見直す。**

---

## ▼ 改善の優先原則（重要度順）

### 原則1: 二重パディングを除去する

❌ 表面的な修正（根本解決にならない）
```tsx
<CardContent className="p-4 sm:p-6">  {/* パディングを小さくしただけ */}
```

✅ 構造から見直す
```tsx
{/* モバイルでは Card の枠ごと消す */}
<div className="sm:rounded-xl sm:border sm:shadow-sm">
  <div className="px-4 py-3 sm:p-6">
    {/* コンテンツ */}
  </div>
</div>
```

または、CardContent に `p-0` を指定して内側でだけ余白を管理する。

---

### 原則2: スマホは「全幅・枠なし・薄い区切り線」を基本とする

スマホ画面では Card の `rounded` / `border` / `shadow` は視覚的ノイズになりやすく、
かつ左右マージンで表示幅を削る。

モバイルでの推奨パターン：
```tsx
{/* カードをスマホで全幅フラット表示に */}
<div className="border-0 rounded-none sm:border sm:rounded-xl sm:shadow-sm">
```

または Card を使わず `divide-y divide-border` でリスト区切りだけにする。

---

### 原則3: 統計カードグリッドは「横スクロール」を優先する

3列以上をスマホで縦積みにすると**縦が一気に伸びる**。代替案：

```tsx
{/* 横スクロールカード（縦を増やさない） */}
<div className="flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible">
  {/* 各カードに min-w を指定 */}
  <Card className="min-w-[140px] sm:min-w-0 flex-shrink-0 sm:flex-shrink">
```

または、スマホでは数値だけを横並びにしたコンパクト表示に切り替える：
```tsx
{/* スマホ用コンパクトサマリー */}
<div className="grid grid-cols-3 gap-px bg-border sm:hidden">
  {stats.map(s => (
    <div key={s.label} className="bg-background px-3 py-2 text-center">
      <p className="text-lg font-bold leading-tight">{s.value}</p>
      <p className="text-[10px] text-muted-foreground leading-tight">{s.label}</p>
    </div>
  ))}
</div>
{/* デスクトップ用カードグリッド */}
<div className="hidden sm:grid sm:grid-cols-3 gap-4">
  {/* 既存のカード */}
</div>
```

---

### 原則7: 文字サイズをコンポーネントデフォルトに任せない


## ▼ このプロジェクトの確立パターン（ユーザーが直接確認・承認済み）

### ★ エッジツーエッジ（最重要パターン）

`app/(app)/dashboard/page.tsx` でユーザー自身が示した理想スタイル。
**すべてのセクションに適用すること。**

```tsx
{/* セクションラッパー: モバイルで全幅・角丸なし */}
<div className="grid gap-4 lg:grid-cols-3 -mx-4 sm:mx-0">
  <Card className="rounded-none sm:rounded-2xl">
    <CardContent className="p-2 sm:p-5">
      {/* コンテンツ */}
    </CardContent>
  </Card>
</div>
```

- **`-mx-4 sm:mx-0`**: layout の `px-3` を打ち消して画面端まで伸ばす（モバイルのみ）
- **`rounded-none sm:rounded-2xl`**: モバイルでフラット、デスクトップで角丸
- **`p-2 sm:p-5`**: モバイルで超コンパクト、デスクトップで標準
- **`lg:` ブレークポイント**: 多列グリッドは `sm:` でなく `lg:` を使う（タブレット対応）

### ★ KPI カード（2列 → 4列）

```tsx
<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
  <Card>
    <CardContent className="p-2 sm:p-5">
      <div className="flex h-6 w-6 sm:h-10 sm:w-10 items-center justify-center rounded-lg">
```

### ★ ページタイトル

```tsx
<h1 className="text-xl sm:text-2xl font-bold">
```

### ★ ヘッダーボタン（モバイルでアイコンのみ）

```tsx
<Button size="sm" onClick={...}>
  <Plus className="h-4 w-4 sm:mr-1.5" />
  <span className="hidden sm:inline">記録追加</span>
</Button>
```

### ★ 横スクロールフィルター

```tsx
<div className="-mx-3 px-3 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto pb-1">
  <button className="shrink-0 ...">...</button>
</div>
```

---

## ▼ このプロジェクトのレイアウト基盤（必ず把握する）

`app/(app)/layout.tsx` の `<main>` が `px-3 py-4 sm:p-6` になっている。
モバイルで横 12px、デスクトップで 24px の外側余白。

**エッジツーエッジにするには `-mx-4 sm:mx-0` を使う**（`px-3` より 1px 多く打ち消す。ユーザー確認済みパターン）。
