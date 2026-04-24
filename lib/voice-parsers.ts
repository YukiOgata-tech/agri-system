// 音声テキストを各フォームフィールドに解析するユーティリティ
// AI解析への移行時は parseXxxVoice を置き換えるだけでUIはそのまま使える

export interface ParseField {
  key: string;
  label: string;
  value: string | undefined;
  required: boolean;
}

// ==================== 共通ヘルパー ====================

function norm(text: string): string {
  return text
    .replace(/[Ａ-Ｚａ-ｚ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
}

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

// ハウス名から大文字アルファベット1文字を抽出
function parseGreenhouseLetter(text: string): string | undefined {
  // カナ読み対応
  const kanaMap: [RegExp, string][] = [
    [/(?:ハウス|圃場)?(?:エー|あ)\s*棟?(?!\S)/i, "A"],
    [/(?:ハウス|圃場)?(?:ビー|び)\s*棟?(?!\S)/i, "B"],
    [/(?:ハウス|圃場)?(?:シー|し)\s*棟?(?!\S)/i, "C"],
    [/(?:ハウス|圃場)?(?:ディー|でぃ)\s*棟?(?!\S)/i, "D"],
  ];
  for (const [re, letter] of kanaMap) {
    if (re.test(text)) return letter;
  }
  const m =
    text.match(/(?:ハウス|圃場)\s*([A-D])/i) ??
    text.match(/([A-D])\s*棟/i);
  return m ? m[1].toUpperCase() : undefined;
}

function noteExtract(text: string, keywords: string[]): string | undefined {
  const parts = keywords.flatMap((kw) => {
    const re = new RegExp(`[^。、]{0,15}${kw}[^。、]{0,20}`, "g");
    return text.match(re) ?? [];
  });
  const unique = [...new Set(parts)];
  return unique.length ? unique.join("、") : undefined;
}

// ==================== 収穫記録 ====================

export interface HarvestVoiceParsed {
  greenhouseLetter?: string;
  quantityKg?: number;
  quantityCount?: number;
  gradeAKg?: number;
  gradeBKg?: number;
  gradeCKg?: number;
  wasteKg?: number;
  averageUnitWeightG?: number;
  notes?: string;
}

export function parseHarvestVoice(raw: string): HarvestVoiceParsed {
  const t = norm(raw);
  const result: HarvestVoiceParsed = {};

  result.greenhouseLetter = parseGreenhouseLetter(t);

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
    t,
    /(?:平均粒重|粒重|平均重量)[^0-9]*([0-9]+(?:\.[0-9]+)?)\s*(?:g|グラム)/i
  );

  result.notes = noteExtract(t, [
    "被害", "異常", "問題", "注意", "良好", "不良", "カビ", "病", "虫", "ハダニ", "腐", "傷",
  ]);

  return result;
}

export function harvestParseSummary(
  parsed: HarvestVoiceParsed,
  greenhouses: { id: string; name: string }[]
): ParseField[] {
  const ghName = parsed.greenhouseLetter
    ? greenhouses.find((g) => g.name.toUpperCase().startsWith(parsed.greenhouseLetter!))?.name
    : undefined;

  return [
    { key: "greenhouse", label: "ハウス", value: ghName, required: true },
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

export interface WorkLogVoiceParsed {
  greenhouseLetter?: string;
  workType?: string;
  durationMinutes?: number;
  workerCount?: number;
  note?: string;
  // 潅水
  waterVolumeL?: number;
  // 施肥
  fertilizerName?: string;
  // 防除
  pesticideName?: string;
  targetPest?: string;
}

const WORK_TYPE_PATTERNS: [RegExp, string][] = [
  [/潅水|かんすい|水やり|散水/, "irrigation"],
  [/施肥|せひ|肥料|液肥/, "fertilization"],
  [/防除|ぼうじょ|農薬|散布/, "pesticide"],
  [/摘花|摘葉|摘果|てきか|摘芽/, "pruning"],
  [/収穫|しゅうかく/, "harvest"],
  [/見回り|みまわり|巡回|点検/, "inspection"],
];

export function parseWorkLogVoice(raw: string): WorkLogVoiceParsed {
  const t = norm(raw);
  const result: WorkLogVoiceParsed = {};

  result.greenhouseLetter = parseGreenhouseLetter(t);

  for (const [re, type] of WORK_TYPE_PATTERNS) {
    if (re.test(t)) { result.workType = type; break; }
  }

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

const WORK_TYPE_LABELS: Record<string, string> = {
  irrigation: "潅水",
  fertilization: "施肥",
  pesticide: "防除",
  pruning: "摘花・摘葉",
  harvest: "収穫",
  inspection: "見回り",
  other: "その他",
};

export function workLogParseSummary(
  parsed: WorkLogVoiceParsed,
  greenhouses: { id: string; name: string }[]
): ParseField[] {
  const ghName = parsed.greenhouseLetter
    ? greenhouses.find((g) => g.name.toUpperCase().startsWith(parsed.greenhouseLetter!))?.name
    : undefined;

  return [
    { key: "greenhouse", label: "ハウス", value: ghName, required: true },
    { key: "workType", label: "作業種別", value: parsed.workType ? WORK_TYPE_LABELS[parsed.workType] : undefined, required: true },
    { key: "durationMinutes", label: "作業時間", value: parsed.durationMinutes !== undefined ? `${parsed.durationMinutes} 分` : undefined, required: false },
    { key: "workerCount", label: "作業者数", value: parsed.workerCount !== undefined ? `${parsed.workerCount} 人` : undefined, required: false },
    { key: "waterVolumeL", label: "水量", value: parsed.waterVolumeL !== undefined ? `${parsed.waterVolumeL} L` : undefined, required: false },
    { key: "note", label: "メモ", value: parsed.note, required: false },
  ];
}

// ==================== 環境記録 ====================

export interface EnvironmentVoiceParsed {
  greenhouseLetter?: string;
  temperatureC?: number;
  humidityPct?: number;
  co2Ppm?: number;
  soilTemperatureC?: number;
  soilMoisturePct?: number;
  lightLux?: number;
  notes?: string;
}

export function parseEnvironmentVoice(raw: string): EnvironmentVoiceParsed {
  const t = norm(raw);
  const result: EnvironmentVoiceParsed = {};

  result.greenhouseLetter = parseGreenhouseLetter(t);

  result.temperatureC =
    exFloat(t, /(?:気温|温度|室温)[^0-9]*([0-9]+(?:\.[0-9]+)?)\s*(?:度|℃|°)/i) ??
    exFloat(t, /([0-9]+(?:\.[0-9]+)?)\s*度\s*(?:くらい|前後)?/i);

  result.humidityPct = exFloat(t, new RegExp(`(?:湿度)[^0-9]*${NUM}\\s*${PCT}`, "i"));

  result.co2Ppm = exFloat(
    t,
    /(?:CO2|二酸化炭素|炭酸ガス)[^0-9]*([0-9]+)\s*(?:ppm|ピーピーエム)?/i
  );

  result.soilTemperatureC = exFloat(
    t,
    /(?:地温|土壌温度)[^0-9]*([0-9]+(?:\.[0-9]+)?)\s*(?:度|℃)/i
  );

  result.soilMoisturePct = exFloat(
    t,
    new RegExp(`(?:土壌水分|水分)[^0-9]*${NUM}\\s*${PCT}`, "i")
  );

  result.lightLux = exFloat(
    t,
    /(?:照度|光量|日射)[^0-9]*([0-9]+)\s*(?:lux|ルクス)?/i
  );

  result.notes = noteExtract(t, ["異常", "注意", "高め", "低め", "問題", "良好"]);

  return result;
}

export function environmentParseSummary(
  parsed: EnvironmentVoiceParsed,
  greenhouses: { id: string; name: string }[]
): ParseField[] {
  const ghName = parsed.greenhouseLetter
    ? greenhouses.find((g) => g.name.toUpperCase().startsWith(parsed.greenhouseLetter!))?.name
    : undefined;

  return [
    { key: "greenhouse", label: "ハウス", value: ghName, required: true },
    { key: "temperatureC", label: "気温", value: parsed.temperatureC !== undefined ? `${parsed.temperatureC} ℃` : undefined, required: false },
    { key: "humidityPct", label: "湿度", value: parsed.humidityPct !== undefined ? `${parsed.humidityPct} %` : undefined, required: false },
    { key: "co2Ppm", label: "CO₂", value: parsed.co2Ppm !== undefined ? `${parsed.co2Ppm} ppm` : undefined, required: false },
    { key: "soilTemperatureC", label: "地温", value: parsed.soilTemperatureC !== undefined ? `${parsed.soilTemperatureC} ℃` : undefined, required: false },
    { key: "soilMoisturePct", label: "土壌水分", value: parsed.soilMoisturePct !== undefined ? `${parsed.soilMoisturePct} %` : undefined, required: false },
    { key: "lightLux", label: "照度", value: parsed.lightLux !== undefined ? `${parsed.lightLux} lux` : undefined, required: false },
    { key: "notes", label: "メモ", value: parsed.notes, required: false },
  ];
}

// ==================== 病害虫記録 ====================

export interface DiseaseVoiceParsed {
  greenhouseLetter?: string;
  category?: "disease" | "pest";
  name?: string;
  severityLevel?: number;
  affectedAreaRatio?: number;
  actionTaken?: string;
  note?: string;
}

const DISEASE_NAMES = [
  "灰色かび病", "ボトリチス", "うどんこ病", "炭疽病", "萎黄病", "青枯病", "疫病", "萎凋病",
];
const PEST_NAMES = [
  "ハダニ", "アブラムシ", "コナジラミ", "アザミウマ", "スリップス", "ナメクジ",
];

const SEVERITY_WORDS: [RegExp, number][] = [
  [/軽微|わずか|ごくわずか/, 1],
  [/低い?|少ない?|少し/, 2],
  [/中程度|普通/, 3],
  [/高い?|多い?|かなり/, 4],
  [/重大|深刻|ひどい/, 5],
];

export function parseDiseaseVoice(raw: string): DiseaseVoiceParsed {
  const t = norm(raw);
  const result: DiseaseVoiceParsed = {};

  result.greenhouseLetter = parseGreenhouseLetter(t);

  for (const name of DISEASE_NAMES) {
    if (t.includes(name)) { result.name = name; result.category = "disease"; break; }
  }
  if (!result.name) {
    for (const name of PEST_NAMES) {
      if (t.includes(name)) { result.name = name; result.category = "pest"; break; }
    }
  }
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

export function diseaseParseSummary(
  parsed: DiseaseVoiceParsed,
  greenhouses: { id: string; name: string }[]
): ParseField[] {
  const ghName = parsed.greenhouseLetter
    ? greenhouses.find((g) => g.name.toUpperCase().startsWith(parsed.greenhouseLetter!))?.name
    : undefined;

  return [
    { key: "greenhouse", label: "ハウス", value: ghName, required: true },
    { key: "category", label: "区分", value: parsed.category === "disease" ? "病気" : parsed.category === "pest" ? "害虫" : undefined, required: true },
    { key: "name", label: "病害虫名", value: parsed.name, required: true },
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
