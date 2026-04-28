/**
 * 音声テキスト → フォームフィールド解析ユーティリティ
 *
 * 使用箇所:
 *   収穫記録   app/(app)/harvest/page.tsx          parseHarvestVoice / harvestParseSummary
 *   作業記録   app/(app)/work-logs/page.tsx         parseWorkLogVoice / workLogParseSummary
 *   環境記録   app/(app)/environment/page.tsx       parseEnvironmentVoice / environmentParseSummary
 *   病気・害虫  app/(app)/diseases/page.tsx          parseDiseaseVoice / diseaseParseSummary
 *
 * 処理の流れ:
 *   VoiceInputPanel（録音UI）→ onTranscriptReady(transcript) コールバック
 *   → 各ページの handleVoiceTranscript が parseXxxVoice を呼ぶ
 *   → 解析済み値を XxxParseSummary で ParseField[] に変換して VoiceInputPanel に返す（表示用）
 *   → 同時に form.setValue() でフォームフィールドを自動埋め
 *
 * ガイドモード用:
 *   matchXxx 関数群を各ページの GuidedStep.apply から呼ぶ（フィールド単体の解析）
 *   preprocessTranscript を内部で適用済みなので raw テキストをそのまま渡してよい
 *
 * 注意:
 *   解析は正規表現ベース（AI未使用）。Chrome の webkitSpeechRecognition 専用。
 *   AI に置き換える場合は parseXxxVoice の実装だけ差し替えれば UI はそのまま動く。
 */

// VoiceInputPanel が受け取る解析結果の1フィールド分
// required=true のフィールドが value=undefined の場合、パネルに赤いアイコンと警告を表示する
export interface ParseField {
  key: string;
  label: string;
  value: string | undefined;
  required: boolean;
}

// ==================== 共通ヘルパー ====================

// 全角英数字 → 半角に正規化
function norm(text: string): string {
  return text
    .replace(/[Ａ-Ｚａ-ｚ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
}

/**
 * 漢数字・和語数詞 → アラビア数字に変換（農業記録で現実的な 0〜999 の範囲）
 * 例: 「三十五キロ」→「35キロ」、「百二十」→「120」
 */
function jpNumToDigit(text: string): string {
  let t = text;
  const d: Record<string, number> = {
    '〇': 0, '一': 1, '二': 2, '三': 3, '四': 4,
    '五': 5, '六': 6, '七': 7, '八': 8, '九': 9,
  };

  // 百の位: 二百三十五 → 235、百二十 → 120
  t = t.replace(/([二三四五六七八九]?)百([一二三四五六七八九]?十?[一二三四五六七八九]?)/g, (_, h, rest) => {
    const hundreds = h ? d[h]! * 100 : 100;
    let remainder = 0;
    const tenM = rest.match(/([一二三四五六七八九]?)十([一二三四五六七八九]?)/);
    if (tenM) {
      remainder = (tenM[1] ? d[tenM[1]]! * 10 : 10) + (tenM[2] ? d[tenM[2]]! : 0);
    } else if (rest && d[rest] !== undefined) {
      remainder = d[rest]!;
    }
    return String(hundreds + remainder);
  });

  // 十の位: 三十五 → 35、十二 → 12、二十 → 20
  t = t.replace(/([一二三四五六七八九]?)十([一二三四五六七八九]?)/g, (_, tens, ones) => {
    return String((tens ? d[tens]! * 10 : 10) + (ones ? d[ones]! : 0));
  });

  // 残った漢数字単体（「五キロ」→「5キロ」など）
  t = t.replace(/[一二三四五六七八九]/g, (c) => String(d[c]!));

  return t;
}

/**
 * 音声認識の誤認識テーブル（使い始めてから実際のミスを追加して育てる）
 * 農業用語は認識エンジンが苦手なため、よくある誤りをルールで補正する
 */
const SPEECH_CORRECTIONS: [RegExp, string][] = [
  // 作業種別
  [/完水|感水|灌水/g, "潅水"],
  [/摘花|適花/g, "摘花"],
  // 病害虫名
  [/灰色かぶ病|灰色かべ病|灰色蛾び病|灰色かみ病/g, "灰色かび病"],
  [/ボトリシス|ボトリキス/g, "ボトリチス"],
  [/うどん粉病|うどん子病/g, "うどんこ病"],
  // 単位
  [/キログラム/g, "kg"],
  [/ミリリットル/g, "mL"],
  // 生産エリア（カナ読みに加えて漢字誤認識も補正）
  [/エー棟|Ａ棟|あ棟/g, "A棟"],
  [/ビー棟|Ｂ棟|び棟/g, "B棟"],
  [/シー棟|Ｃ棟|し棟/g, "C棟"],
  [/ディー棟|Ｄ棟|でぃ棟/g, "D棟"],
  // 等級
  [/エー等級|あ等級/g, "A等級"],
  [/ビー等級|び等級/g, "B等級"],
  [/シー等級|し等級/g, "C等級"],
];

function applySpeechCorrections(text: string): string {
  let t = text;
  for (const [re, replacement] of SPEECH_CORRECTIONS) {
    t = t.replace(re, replacement);
  }
  return t;
}

/**
 * 音声テキストの前処理パイプライン
 * norm → 漢数字変換 → 誤認識補正 の順で適用する
 * 全ての parseXxxVoice と matchXxx 関数はこれを通した後にパターンマッチする
 */
export function preprocessTranscript(raw: string): string {
  return applySpeechCorrections(jpNumToDigit(norm(raw)));
}

// 正規表現パターン共通部品
const KG = "(?:kg|キログラム|キロ)";
const PCT = "(?:%|パーセント|％)";
const NUM = "([0-9]+(?:\\.[0-9]+)?)";

function exFloat(text: string, re: RegExp): number | undefined {
  const m = text.match(re);
  return m ? parseFloat(m[1]) : undefined;
}

function exInt(text: string, re: RegExp): number | undefined {
  const m = text.match(re);
  return m ? parseInt(m[1]) : undefined;
}

/**
 * 発話テキストから生産単位のアルファベット識別子（A〜D）を抽出する
 * 「エー棟」「A棟」「ハウスA」などに対応。F-2号棟のような複合コードは未対応（拡張ポイント）
 */
function parseUnitLetter(text: string): string | undefined {
  const kanaMap: [RegExp, string][] = [
    [/(?:ハウス|圃場|棟)?(?:エー|あ)\s*棟?(?!\S)/i, "A"],
    [/(?:ハウス|圃場|棟)?(?:ビー|び)\s*棟?(?!\S)/i, "B"],
    [/(?:ハウス|圃場|棟)?(?:シー|し)\s*棟?(?!\S)/i, "C"],
    [/(?:ハウス|圃場|棟)?(?:ディー|でぃ)\s*棟?(?!\S)/i, "D"],
  ];
  for (const [re, letter] of kanaMap) {
    if (re.test(text)) return letter;
  }
  const m =
    text.match(/(?:ハウス|圃場)\s*([A-Z])/i) ??
    text.match(/([A-Z])\s*棟/i);
  return m ? m[1].toUpperCase() : undefined;
}

/**
 * 抽出したアルファベットから productionUnits リストの該当ユニットを検索する
 * unit.name に識別子が含まれるか、unit.code の末尾が一致するかで判定
 */
function findUnit(
  letter: string | undefined,
  productionUnits: { id: string; name: string; code: string }[]
): { id: string; name: string } | undefined {
  if (!letter) return undefined;
  return productionUnits.find((u) =>
    u.name.toUpperCase().includes(letter) ||
    u.code.toUpperCase().endsWith(letter) ||
    u.code.toUpperCase().endsWith(`-${letter}`)
  );
}

// 備考・メモ欄用: キーワード周辺のテキスト（前15字・後20字）を抽出して結合する
function noteExtract(text: string, keywords: string[]): string | undefined {
  const parts = keywords.flatMap((kw) => {
    const re = new RegExp(`[^。、]{0,15}${kw}[^。、]{0,20}`, "g");
    return text.match(re) ?? [];
  });
  const unique = [...new Set(parts)];
  return unique.length ? unique.join("、") : undefined;
}

// ==================== ガイドモード用フィールド単体ヘルパー ====================
// 各ページの GuidedStep.apply から呼ぶ。preprocessTranscript を内部で適用済み。

/** 生産単位を音声テキストから検索して返す */
export function matchProductionUnit(
  raw: string,
  productionUnits: { id: string; name: string; code: string }[]
): { id: string; name: string } | undefined {
  const t = preprocessTranscript(raw);
  return findUnit(parseUnitLetter(t), productionUnits);
}

/** 作業種別を音声テキストから判定する */
export function matchWorkType(raw: string): string | undefined {
  const t = preprocessTranscript(raw);
  for (const [re, type] of WORK_TYPE_PATTERNS) {
    if (re.test(t)) return type;
  }
  return undefined;
}

/** 収穫量（kg）を音声テキストから抽出する */
export function matchQuantityKg(raw: string): number | undefined {
  const t = preprocessTranscript(raw);
  return (
    exFloat(t, new RegExp(`(?:合計|総|全体)?\\s*(?:収穫量?|収穫)[^0-9]*${NUM}\\s*${KG}`, "i")) ??
    exFloat(t, new RegExp(`${NUM}\\s*${KG}\\s*(?:収穫|採れ)`, "i")) ??
    exFloat(t, new RegExp(`${NUM}\\s*${KG}`, "i"))
  );
}

/** 廃棄重量（kg）を音声テキストから抽出する */
export function matchWasteKg(raw: string): number | undefined {
  const t = preprocessTranscript(raw);
  return exFloat(t, new RegExp(`(?:廃棄量?|廃|ロス)[^0-9]*${NUM}\\s*${KG}`, "i"));
}

/** 等級（A/B/C/D）を音声テキストから判定する */
export function matchQualityGrade(raw: string): string | undefined {
  const t = preprocessTranscript(raw);
  if (/(?:A|エー)\s*等級|秀/i.test(t)) return "A";
  if (/(?:B|ビー)\s*等級|優/i.test(t)) return "B";
  if (/(?:C|シー)\s*等級|良/i.test(t)) return "C";
  if (/(?:D|ディー)\s*等級|規格外/i.test(t)) return "D";
  return undefined;
}

/** 作業時間（分）を音声テキストから抽出する。「1時間30分」→ 90 */
export function matchDurationMinutes(raw: string): number | undefined {
  const t = preprocessTranscript(raw);
  const hourM = t.match(/([0-9]+)\s*時間/);
  const minM = t.match(/([0-9]+)\s*分/);
  if (!hourM && !minM) return undefined;
  return (hourM ? parseInt(hourM[1]) * 60 : 0) + (minM ? parseInt(minM[1]) : 0);
}

/** 作業者数を音声テキストから抽出する */
export function matchWorkerCount(raw: string): number | undefined {
  const t = preprocessTranscript(raw);
  return exInt(t, /([0-9]+)\s*(?:人|名)/);
}

/** 潅水量（L）を音声テキストから抽出する */
export function matchWaterVolumeL(raw: string): number | undefined {
  const t = preprocessTranscript(raw);
  return exFloat(t, new RegExp(`([0-9]+(?:\\.[0-9]+)?)\\s*(?:L|リットル|ℓ)`, "i"));
}

/** 気温（℃）を音声テキストから抽出する */
export function matchTemperatureC(raw: string): number | undefined {
  const t = preprocessTranscript(raw);
  return (
    exFloat(t, /(?:気温|温度|室温)[^0-9]*([0-9]+(?:\.[0-9]+)?)\s*(?:度|℃|°)/i) ??
    exFloat(t, /([0-9]+(?:\.[0-9]+)?)\s*度\s*(?:くらい|前後)?/i)
  );
}

/** 湿度（%）を音声テキストから抽出する */
export function matchHumidityPct(raw: string): number | undefined {
  const t = preprocessTranscript(raw);
  return exFloat(t, new RegExp(`(?:湿度)[^0-9]*${NUM}\\s*${PCT}`, "i"));
}

/** CO₂（ppm）を音声テキストから抽出する */
export function matchCo2Ppm(raw: string): number | undefined {
  const t = preprocessTranscript(raw);
  return exFloat(t, /(?:CO2|二酸化炭素|炭酸ガス)[^0-9]*([0-9]+)\s*(?:ppm|ピーピーエム)?/i);
}

/** 土壌水分（%）を音声テキストから抽出する */
export function matchSoilMoisturePct(raw: string): number | undefined {
  const t = preprocessTranscript(raw);
  return exFloat(t, new RegExp(`(?:土壌水分|水分)[^0-9]*${NUM}\\s*${PCT}`, "i"));
}

/** 照度（lux）を音声テキストから抽出する */
export function matchLightLux(raw: string): number | undefined {
  const t = preprocessTranscript(raw);
  return exFloat(t, /(?:照度|光量|日射)[^0-9]*([0-9]+)\s*(?:lux|ルクス)?/i);
}

/** 病気か害虫かを音声テキストから判定する */
export function matchDiseaseCategory(raw: string): "disease" | "pest" | undefined {
  const t = preprocessTranscript(raw);
  for (const name of DISEASE_NAMES) {
    if (t.includes(name)) return "disease";
  }
  for (const name of PEST_NAMES) {
    if (t.includes(name)) return "pest";
  }
  if (/病|カビ|疫病|炭疽/i.test(t)) return "disease";
  if (/虫|ハダニ|アブラ|アザミ/i.test(t)) return "pest";
  return undefined;
}

/** 病気・害虫名を固定リストから音声テキストで検索する */
export function matchDiseaseName(raw: string): string | undefined {
  const t = preprocessTranscript(raw);
  for (const name of [...DISEASE_NAMES, ...PEST_NAMES]) {
    if (t.includes(name)) return name;
  }
  return undefined;
}

/** 重症度（1〜5）を音声テキストから判定する */
export function matchSeverityLevel(raw: string): number | undefined {
  const t = preprocessTranscript(raw);
  for (const [re, level] of SEVERITY_WORDS) {
    if (re.test(t)) return level;
  }
  const m = t.match(/(?:重症度|深刻度|レベル)[^0-9]*([1-5])/);
  return m ? parseInt(m[1]) : undefined;
}

/** 被害面積割合（%）を音声テキストから抽出する */
export function matchAffectedAreaRatio(raw: string): number | undefined {
  const t = preprocessTranscript(raw);
  return (
    exFloat(t, new RegExp(`(?:発症|被害|影響)[^0-9]*${NUM}\\s*${PCT}`, "i")) ??
    exFloat(t, new RegExp(`${NUM}\\s*${PCT}\\s*(?:程度|くらい)?\\s*(?:被害|発症)`, "i"))
  );
}

// ==================== 収穫記録 ====================
// 使用ページ: app/(app)/harvest/page.tsx
// フォームへのマッピング:
//   unitLetter   → productionUnitId（ユニット検索）
//   quantityKg   → quantityValue + normalizedWeightKg（両方に同じ値を入れる）
//   wasteKg      → wasteWeightKg
//   gradeAKg/B/C → qualityGrade（最初にヒットした等級を "A"/"B"/"C" として設定）
//   notes        → notes

export interface HarvestVoiceParsed {
  unitLetter?: string;
  quantityKg?: number;
  quantityCount?: number;
  gradeAKg?: number;
  gradeBKg?: number;
  gradeCKg?: number;
  wasteKg?: number;
  averageUnitWeightG?: number; // 将来用（現在フォームへの反映なし）
  notes?: string;
}

export function parseHarvestVoice(raw: string): HarvestVoiceParsed {
  const t = preprocessTranscript(raw);
  const result: HarvestVoiceParsed = {};

  result.unitLetter = parseUnitLetter(t);

  // 収穫量: 「収穫 NNN kg」→ 優先。なければ「NNN kg」単体でフォールバック
  result.quantityKg =
    exFloat(t, new RegExp(`(?:合計|総|全体)?\\s*(?:収穫量?|収穫)[^0-9]*${NUM}\\s*${KG}`, "i")) ??
    exFloat(t, new RegExp(`${NUM}\\s*${KG}\\s*(?:収穫|採れ)`, "i")) ??
    exFloat(t, new RegExp(`${NUM}\\s*${KG}`, "i"));

  result.quantityCount = exInt(t, /([0-9]+)\s*(?:個|本|粒)/);
  result.wasteKg = exFloat(t, new RegExp(`(?:廃棄量?|廃|ロス)[^0-9]*${NUM}\\s*${KG}`, "i"));
  result.gradeAKg = exFloat(t, new RegExp(`(?:A|エー)\\s*等級[^0-9]*${NUM}\\s*${KG}`, "i"));
  result.gradeBKg = exFloat(t, new RegExp(`(?:B|ビー)\\s*等級[^0-9]*${NUM}\\s*${KG}`, "i"));
  result.gradeCKg = exFloat(t, new RegExp(`(?:C|シー)\\s*等級[^0-9]*${NUM}\\s*${KG}`, "i"));
  result.averageUnitWeightG = exFloat(
    t, /(?:平均粒重|粒重|平均重量)[^0-9]*([0-9]+(?:\.[0-9]+)?)\s*(?:g|グラム)/i
  );
  result.notes = noteExtract(t, [
    "被害", "異常", "問題", "注意", "良好", "不良", "カビ", "病", "虫", "ハダニ", "腐", "傷",
  ]);

  return result;
}

// VoiceInputPanel に渡す表示用フィールド一覧（収穫記録用）
export function harvestParseSummary(
  parsed: HarvestVoiceParsed,
  productionUnits: { id: string; name: string; code: string }[]
): ParseField[] {
  const unit = findUnit(parsed.unitLetter, productionUnits);
  return [
    { key: "productionUnit", label: "生産エリア", value: unit?.name, required: true },
    { key: "quantityKg", label: "合計収穫量", value: parsed.quantityKg !== undefined ? `${parsed.quantityKg} kg` : undefined, required: false },
    { key: "quantityCount", label: "個数", value: parsed.quantityCount !== undefined ? `${parsed.quantityCount} 個` : undefined, required: false },
    { key: "gradeAKg", label: "A等級", value: parsed.gradeAKg !== undefined ? `${parsed.gradeAKg} kg` : undefined, required: false },
    { key: "gradeBKg", label: "B等級", value: parsed.gradeBKg !== undefined ? `${parsed.gradeBKg} kg` : undefined, required: false },
    { key: "gradeCKg", label: "C等級", value: parsed.gradeCKg !== undefined ? `${parsed.gradeCKg} kg` : undefined, required: false },
    { key: "wasteKg", label: "廃棄量", value: parsed.wasteKg !== undefined ? `${parsed.wasteKg} kg` : undefined, required: false },
    { key: "notes", label: "メモ", value: parsed.notes, required: false },
  ];
}

// ==================== 作業記録 ====================
// 使用ページ: app/(app)/work-logs/page.tsx
// フォームへのマッピング:
//   unitLetter      → productionUnitId
//   workType        → workType + selectedType（タブ表示の切り替えも連動）
//   durationMinutes → durationMinutes
//   workerCount     → workerCount
//   waterVolumeL    → waterVolumeL（潅水・施肥時のみ表示されるフィールド）
//   note            → note

export interface WorkLogVoiceParsed {
  unitLetter?: string;
  workType?: string;
  durationMinutes?: number;
  workerCount?: number;
  note?: string;
  waterVolumeL?: number;
  fertilizerName?: string; // 将来用（現在フォームへの反映なし）
  pesticideName?: string;  // 将来用
  targetPest?: string;     // 将来用
}

// 発話キーワード → workType 値のマッピング（上から順に先勝ち）
const WORK_TYPE_PATTERNS: [RegExp, string][] = [
  [/潅水|かんすい|水やり|散水/, "irrigation"],
  [/施肥|せひ|肥料|液肥|フェルティゲーション/, "fertigation"],
  [/防除|ぼうじょ|農薬|散布/, "pesticide"],
  [/摘花|摘葉|摘果|てきか|摘芽|整枝/, "pruning"],
  [/収穫|しゅうかく/, "harvest"],
  [/見回り|みまわり|巡回|点検/, "inspection"],
  [/出荷|しゅっか/, "shipping"],
];

export function parseWorkLogVoice(raw: string): WorkLogVoiceParsed {
  const t = preprocessTranscript(raw);
  const result: WorkLogVoiceParsed = {};

  result.unitLetter = parseUnitLetter(t);

  // 作業種別: 上から順に評価し、最初にマッチしたものを採用
  for (const [re, type] of WORK_TYPE_PATTERNS) {
    if (re.test(t)) { result.workType = type; break; }
  }

  // 作業時間: 「N時間」と「N分」を別々に抽出して分に換算して合算
  const hourM = t.match(/([0-9]+)\s*時間/);
  const minM = t.match(/([0-9]+)\s*分/);
  if (hourM || minM) {
    result.durationMinutes =
      (hourM ? parseInt(hourM[1]) * 60 : 0) + (minM ? parseInt(minM[1]) : 0);
  }

  result.workerCount = exInt(t, /([0-9]+)\s*(?:人|名)/);
  result.waterVolumeL = exFloat(t, new RegExp(`([0-9]+(?:\\.[0-9]+)?)\\s*(?:L|リットル|ℓ)`, "i"));
  result.note = noteExtract(t, ["異常", "問題", "注意", "良好", "完了", "未完", "確認", "被害"]);

  return result;
}

// workType → 日本語ラベル（VoiceInputPanel の解析結果表示に使用）
const WORK_TYPE_LABELS: Record<string, string> = {
  irrigation: "潅水",
  fertigation: "施肥・液肥",
  pesticide: "防除",
  pruning: "摘葉・整枝",
  harvest: "収穫",
  inspection: "見回り",
  shipping: "出荷作業",
  other: "その他",
};

// VoiceInputPanel に渡す表示用フィールド一覧（作業記録用）
export function workLogParseSummary(
  parsed: WorkLogVoiceParsed,
  productionUnits: { id: string; name: string; code: string }[]
): ParseField[] {
  const unit = findUnit(parsed.unitLetter, productionUnits);
  return [
    { key: "productionUnit", label: "生産エリア", value: unit?.name, required: true },
    { key: "workType", label: "作業種別", value: parsed.workType ? WORK_TYPE_LABELS[parsed.workType] : undefined, required: true },
    { key: "durationMinutes", label: "作業時間", value: parsed.durationMinutes !== undefined ? `${parsed.durationMinutes} 分` : undefined, required: false },
    { key: "workerCount", label: "作業者数", value: parsed.workerCount !== undefined ? `${parsed.workerCount} 人` : undefined, required: false },
    { key: "waterVolumeL", label: "水量", value: parsed.waterVolumeL !== undefined ? `${parsed.waterVolumeL} L` : undefined, required: false },
    { key: "note", label: "メモ", value: parsed.note, required: false },
  ];
}

// ==================== 環境記録 ====================
// 使用ページ: app/(app)/environment/page.tsx
// フォームへのマッピング:
//   unitLetter        → productionUnitId
//   temperatureC      → temperatureC
//   humidityPct       → humidityPct
//   co2Ppm            → co2Ppm
//   soilTemperatureC  → soilTemperatureC
//   soilMoisturePct   → soilMoisturePct
//   lightLux          → lightLux
//   （ecDsM / ph は音声では取得できないため手動入力）

export interface EnvironmentVoiceParsed {
  unitLetter?: string;
  temperatureC?: number;
  humidityPct?: number;
  co2Ppm?: number;
  soilTemperatureC?: number;
  soilMoisturePct?: number;
  lightLux?: number;
  notes?: string;
}

export function parseEnvironmentVoice(raw: string): EnvironmentVoiceParsed {
  const t = preprocessTranscript(raw);
  const result: EnvironmentVoiceParsed = {};

  result.unitLetter = parseUnitLetter(t);

  // 気温: 「気温/温度/室温 + N度/℃」を優先。なければ「N度」単体でフォールバック
  result.temperatureC =
    exFloat(t, /(?:気温|温度|室温)[^0-9]*([0-9]+(?:\.[0-9]+)?)\s*(?:度|℃|°)/i) ??
    exFloat(t, /([0-9]+(?:\.[0-9]+)?)\s*度\s*(?:くらい|前後)?/i);

  result.humidityPct = exFloat(t, new RegExp(`(?:湿度)[^0-9]*${NUM}\\s*${PCT}`, "i"));
  result.co2Ppm = exFloat(t, /(?:CO2|二酸化炭素|炭酸ガス)[^0-9]*([0-9]+)\s*(?:ppm|ピーピーエム)?/i);
  result.soilTemperatureC = exFloat(t, /(?:地温|土壌温度)[^0-9]*([0-9]+(?:\.[0-9]+)?)\s*(?:度|℃)/i);
  result.soilMoisturePct = exFloat(t, new RegExp(`(?:土壌水分|水分)[^0-9]*${NUM}\\s*${PCT}`, "i"));
  result.lightLux = exFloat(t, /(?:照度|光量|日射)[^0-9]*([0-9]+)\s*(?:lux|ルクス)?/i);
  result.notes = noteExtract(t, ["異常", "注意", "高め", "低め", "問題", "良好"]);

  return result;
}

// VoiceInputPanel に渡す表示用フィールド一覧（環境記録用）
export function environmentParseSummary(
  parsed: EnvironmentVoiceParsed,
  productionUnits: { id: string; name: string; code: string }[]
): ParseField[] {
  const unit = findUnit(parsed.unitLetter, productionUnits);
  return [
    { key: "productionUnit", label: "生産エリア", value: unit?.name, required: true },
    { key: "temperatureC", label: "気温", value: parsed.temperatureC !== undefined ? `${parsed.temperatureC} ℃` : undefined, required: false },
    { key: "humidityPct", label: "湿度", value: parsed.humidityPct !== undefined ? `${parsed.humidityPct} %` : undefined, required: false },
    { key: "co2Ppm", label: "CO₂", value: parsed.co2Ppm !== undefined ? `${parsed.co2Ppm} ppm` : undefined, required: false },
    { key: "soilTemperatureC", label: "地温", value: parsed.soilTemperatureC !== undefined ? `${parsed.soilTemperatureC} ℃` : undefined, required: false },
    { key: "soilMoisturePct", label: "土壌水分", value: parsed.soilMoisturePct !== undefined ? `${parsed.soilMoisturePct} %` : undefined, required: false },
    { key: "lightLux", label: "照度", value: parsed.lightLux !== undefined ? `${parsed.lightLux} lux` : undefined, required: false },
    { key: "notes", label: "メモ", value: parsed.notes, required: false },
  ];
}

// ==================== 病気・害虫記録 ====================
// 使用ページ: app/(app)/diseases/page.tsx
// フォームへのマッピング:
//   unitLetter        → productionUnitId
//   category          → category（"disease" / "pest"）
//   name              → name
//   severityLevel     → severityLevel（1〜5）
//   affectedAreaRatio → affectedAreaRatio（%）
//   actionTaken       → actionTaken
//   note              → note

export interface DiseaseVoiceParsed {
  unitLetter?: string;
  category?: "disease" | "pest";
  name?: string;
  severityLevel?: number;
  affectedAreaRatio?: number;
  actionTaken?: string;
  note?: string;
}

// 病気名の固定リスト（完全一致でのみ name として採用）
const DISEASE_NAMES = [
  "灰色かび病", "ボトリチス", "うどんこ病", "炭疽病", "萎黄病", "青枯病", "疫病", "萎凋病",
];
// 害虫名の固定リスト（同上）
const PEST_NAMES = [
  "ハダニ", "アブラムシ", "コナジラミ", "アザミウマ", "スリップス", "ナメクジ",
];

// 形容詞 → 重症度レベル（上から先勝ち）
const SEVERITY_WORDS: [RegExp, number][] = [
  [/軽微|わずか|ごくわずか/, 1],
  [/低い?|少ない?|少し/, 2],
  [/中程度|普通/, 3],
  [/高い?|多い?|かなり/, 4],
  [/重大|深刻|ひどい/, 5],
];

export function parseDiseaseVoice(raw: string): DiseaseVoiceParsed {
  const t = preprocessTranscript(raw);
  const result: DiseaseVoiceParsed = {};

  result.unitLetter = parseUnitLetter(t);

  // 病気名: DISEASE_NAMES に含まれる語が発話にあれば採用（先勝ち）
  for (const name of DISEASE_NAMES) {
    if (t.includes(name)) { result.name = name; result.category = "disease"; break; }
  }
  if (!result.name) {
    for (const name of PEST_NAMES) {
      if (t.includes(name)) { result.name = name; result.category = "pest"; break; }
    }
  }
  // 名前が取れなければ「病」「虫」などの単語でカテゴリだけ推定
  if (!result.category) {
    if (/病|カビ|疫病|炭疽/i.test(t)) result.category = "disease";
    else if (/虫|ハダニ|アブラ|アザミ/i.test(t)) result.category = "pest";
  }

  for (const [re, level] of SEVERITY_WORDS) {
    if (re.test(t)) { result.severityLevel = level; break; }
  }
  if (!result.severityLevel) {
    const m = t.match(/(?:重症度|深刻度|レベル)[^0-9]*([1-5])/);
    if (m) result.severityLevel = parseInt(m[1]);
  }

  result.affectedAreaRatio =
    exFloat(t, new RegExp(`(?:発症|被害|影響)[^0-9]*${NUM}\\s*${PCT}`, "i")) ??
    exFloat(t, new RegExp(`${NUM}\\s*${PCT}\\s*(?:程度|くらい)?\\s*(?:被害|発症)`, "i"));

  result.actionTaken = noteExtract(t, ["散布", "除去", "摘除", "処理", "防除"]);
  result.note = noteExtract(t, ["確認", "注意", "観察", "継続", "様子見", "集中"]);

  return result;
}

const SEVERITY_LABELS = ["", "軽微", "低", "中", "高", "重大"];

// VoiceInputPanel に渡す表示用フィールド一覧（病気・害虫記録用）
export function diseaseParseSummary(
  parsed: DiseaseVoiceParsed,
  productionUnits: { id: string; name: string; code: string }[]
): ParseField[] {
  const unit = findUnit(parsed.unitLetter, productionUnits);
  return [
    { key: "productionUnit", label: "生産エリア", value: unit?.name, required: true },
    { key: "category", label: "区分", value: parsed.category === "disease" ? "病気" : parsed.category === "pest" ? "害虫" : undefined, required: true },
    { key: "name", label: "病気・害虫名", value: parsed.name, required: true },
    {
      key: "severityLevel",
      label: "重症度",
      value: parsed.severityLevel !== undefined
        ? `${parsed.severityLevel}（${SEVERITY_LABELS[parsed.severityLevel]}）`
        : undefined,
      required: false,
    },
    {
      key: "affectedAreaRatio",
      label: "被害面積割合",
      value: parsed.affectedAreaRatio !== undefined ? `${parsed.affectedAreaRatio} %` : undefined,
      required: false,
    },
    { key: "actionTaken", label: "対処内容", value: parsed.actionTaken, required: false },
    { key: "note", label: "メモ", value: parsed.note, required: false },
  ];
}
