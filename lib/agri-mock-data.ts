import {
  addDaysToDateInputValue,
  getCurrentDateInputValue,
} from "@/lib/utils";

export type CropId = string;
export type CropSelection = CropId | "all";
export type CropAiPlan = "none" | "lite" | "pro";

export type CropOption = {
  id: CropId;
  code: string;
  name: string;
  accentClass: string;
  surfaceClass: string;
  pricingTier: string;
  aiEnabled: boolean;
  defaultYieldUnit: string;
  defaultShipmentUnit: string;
};

export type ProductionUnitType =
  | "greenhouse"
  | "open_field"
  | "plot"
  | "bed"
  | "nursery_area";

export type ProductionUnit = {
  id: string;
  farmName: string;
  parentUnitId?: string;
  unitType: ProductionUnitType;
  code: string;
  name: string;
  areaM2: number;
  isActive: boolean;
  coveringMaterial?: string;
  irrigationSystemType?: string;
  bedCount?: number;
  rowCount?: number;
  notes?: string;
};

export type CultivationCycle = {
  id: string;
  productionUnitId: string;
  cropTypeId: CropId;
  varietyName: string;
  cycleName: string;
  status: "active" | "planned" | "completed";
  startDate: string;
  plantingDate: string;
  expectedHarvestStartDate: string;
  expectedHarvestEndDate: string;
  primaryRecordUnit: string;
  secondaryRecordUnit?: string;
  shipmentUnit: string;
  plantedCount: number;
  plantedAreaM2: number;
  sourceBatchCode?: string;
  notes?: string;
};

export type HarvestRecord = {
  id: string;
  productionUnitId: string;
  cultivationCycleId: string;
  cropTypeId: CropId;
  lotCode: string;
  harvestDate: string;
  quantityValue: number;
  quantityUnit: string;
  normalizedWeightKg: number;
  packageCount: number;
  packageUnit: string;
  qualityGrade: string;
  wasteWeightKg: number;
  notes?: string;
};

export type ShipmentRecord = {
  id: string;
  productionUnitId: string;
  cultivationCycleId: string;
  cropTypeId: CropId;
  harvestRecordId: string;
  shipmentDate: string;
  shipmentLotCode: string;
  quantityValue: number;
  quantityUnit: string;
  normalizedWeightKg: number;
  packageCount: number;
  packageUnit: string;
  averageUnitPrice: number;
  revenueAmount: number;
  destinationName: string;
  notes?: string;
};

export type MaterialLot = {
  id: string;
  materialType: "fertilizer" | "pesticide" | "packaging";
  materialName: string;
  lotCode: string;
  supplierName: string;
  remainingQuantityValue: number;
  remainingQuantityUnit: string;
  expiresOn?: string;
};

export type WorkMaterialUsage = {
  id: string;
  materialLotId: string;
  materialName: string;
  lotCode: string;
  usageQuantityValue: number;
  usageQuantityUnit: string;
  targetPestOrDisease?: string;
  dilutionRatio?: string;
};

export type WorkLog = {
  id: string;
  productionUnitId: string;
  cultivationCycleId: string;
  cropTypeId: CropId;
  copiedFromWorkLogId?: string;
  inputBatchId?: string;
  workDate: string;
  workType:
    | "irrigation"
    | "fertigation"
    | "pesticide"
    | "harvest"
    | "pruning"
    | "inspection"
    | "shipping"
    | "other";
  durationMinutes: number;
  workerCount: number;
  operatorName: string;
  sourceType: "manual" | "imported";
  note?: string;
  irrigation?: {
    waterVolumeL: number;
    timingType: string;
    method: string;
  };
  materialUsageIds?: string[];
};

export type EnvironmentLog = {
  id: string;
  productionUnitId: string;
  cultivationCycleId: string;
  cropTypeId: CropId;
  copiedFromEnvironmentLogId?: string;
  inputBatchId?: string;
  observedAt: string;
  temperatureC: number;
  humidityPct: number;
  co2Ppm: number;
  soilTemperatureC: number;
  soilMoisturePct: number;
  ecDsM: number;
  ph: number;
  lightLux: number;
  notes?: string;
};

export type DiseaseIncident = {
  id: string;
  productionUnitId: string;
  cultivationCycleId: string;
  cropTypeId: CropId;
  occurredOn: string;
  category: "disease" | "pest";
  name: string;
  severityLevel: number;
  affectedAreaRatio: number;
  actionTaken?: string;
  resolvedOn?: string;
  note?: string;
};

export const initialCropOptions: CropOption[] = [
  {
    id: "strawberry",
    code: "STR",
    name: "いちご",
    accentClass: "text-rose-700",
    surfaceClass: "bg-rose-100 text-rose-800 border-rose-200",
    pricingTier: "AI Pro",
    aiEnabled: true,
    defaultYieldUnit: "kg",
    defaultShipmentUnit: "箱",
  },
  {
    id: "tomato",
    code: "TMT",
    name: "トマト",
    accentClass: "text-orange-700",
    surfaceClass: "bg-orange-100 text-orange-800 border-orange-200",
    pricingTier: "AI Lite",
    aiEnabled: true,
    defaultYieldUnit: "kg",
    defaultShipmentUnit: "ケース",
  },
  {
    id: "komatsuna",
    code: "KMT",
    name: "小松菜",
    accentClass: "text-lime-700",
    surfaceClass: "bg-lime-100 text-lime-800 border-lime-200",
    pricingTier: "未契約",
    aiEnabled: false,
    defaultYieldUnit: "束",
    defaultShipmentUnit: "ケース",
  },
];

const cropStylePresets = [
  { accentClass: "text-rose-700", surfaceClass: "bg-rose-100 text-rose-800 border-rose-200" },
  { accentClass: "text-orange-700", surfaceClass: "bg-orange-100 text-orange-800 border-orange-200" },
  { accentClass: "text-lime-700", surfaceClass: "bg-lime-100 text-lime-800 border-lime-200" },
  { accentClass: "text-sky-700", surfaceClass: "bg-sky-100 text-sky-800 border-sky-200" },
  { accentClass: "text-violet-700", surfaceClass: "bg-violet-100 text-violet-800 border-violet-200" },
  { accentClass: "text-amber-700", surfaceClass: "bg-amber-100 text-amber-800 border-amber-200" },
  { accentClass: "text-emerald-700", surfaceClass: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { accentClass: "text-cyan-700", surfaceClass: "bg-cyan-100 text-cyan-800 border-cyan-200" },
];

export function getCropStylePreset(index: number) {
  return cropStylePresets[index % cropStylePresets.length]!;
}

export function getAiPlanLabel(plan: CropAiPlan) {
  switch (plan) {
    case "lite":
      return "AI Lite";
    case "pro":
      return "AI Pro";
    case "none":
    default:
      return "未契約";
  }
}

export function getCropPricingSummary(crop: CropOption) {
  return `記録 無料 / AI ${crop.aiEnabled ? crop.pricingTier : "未契約"}`;
}

export function createCropCode(name: string, index: number) {
  const normalized = name
    .normalize("NFKC")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4);
  return normalized || `C${index + 1}`;
}

const TODAY = getCurrentDateInputValue();
const YESTERDAY = addDaysToDateInputValue(TODAY, -1);
const TWO_DAYS_AGO = addDaysToDateInputValue(TODAY, -2);
const THREE_DAYS_AGO = addDaysToDateInputValue(TODAY, -3);
const TEN_DAYS_AGO = addDaysToDateInputValue(TODAY, -10);
const TWENTY_SEVEN_DAYS_AGO = addDaysToDateInputValue(TODAY, -27);
const THIRTY_TWO_DAYS_AGO = addDaysToDateInputValue(TODAY, -32);
const NINETY_FIVE_DAYS_AGO = addDaysToDateInputValue(TODAY, -95);
const ONE_HUNDRED_TEN_DAYS_AGO = addDaysToDateInputValue(TODAY, -110);
const ONE_HUNDRED_FORTY_DAYS_AGO = addDaysToDateInputValue(TODAY, -140);
const TWO_HUNDRED_NINETEEN_DAYS_AGO = addDaysToDateInputValue(TODAY, -219);
const TWO_HUNDRED_TWENTY_SIX_DAYS_AGO = addDaysToDateInputValue(TODAY, -226);
const NINETEEN_DAYS_LATER = addDaysToDateInputValue(TODAY, 19);
const TWENTY_ONE_DAYS_LATER = addDaysToDateInputValue(TODAY, 21);
const THIRTY_TWO_DAYS_LATER = addDaysToDateInputValue(TODAY, 32);
const ONE_HUNDRED_TWENTY_THREE_DAYS_LATER = addDaysToDateInputValue(TODAY, 123);

const TODAY_AT_1000 = `${TODAY}T10:00`;
const TODAY_AT_0930 = `${TODAY}T09:30`;

function toMonthDayCode(value: string) {
  return `${value.slice(5, 7)}${value.slice(8, 10)}`;
}

export const initialProductionUnits: ProductionUnit[] = [
  {
    id: "pu-gh-a",
    farmName: "静岡本園",
    unitType: "greenhouse",
    code: "A",
    name: "A棟",
    areaM2: 1200,
    isActive: true,
    coveringMaterial: "フッ素フィルム",
    irrigationSystemType: "点滴潅水",
    bedCount: 8,
    rowCount: 16,
    notes: "高設いちごの主力棟",
  },
  {
    id: "pu-gh-b",
    farmName: "静岡本園",
    unitType: "greenhouse",
    code: "B",
    name: "B棟",
    areaM2: 980,
    isActive: true,
    coveringMaterial: "POフィルム",
    irrigationSystemType: "点滴潅水",
    bedCount: 6,
    rowCount: 12,
    notes: "トマトの高糖度ライン",
  },
  {
    id: "pu-gh-c",
    farmName: "静岡本園",
    unitType: "greenhouse",
    code: "C",
    name: "C棟",
    areaM2: 840,
    isActive: true,
    coveringMaterial: "POフィルム",
    irrigationSystemType: "頭上散水",
    bedCount: 5,
    rowCount: 10,
    notes: "葉菜ローテーション",
  },
  {
    id: "pu-field-2",
    farmName: "掛川露地圃場",
    unitType: "open_field",
    code: "F2",
    name: "第2圃場",
    areaM2: 2200,
    isActive: true,
    irrigationSystemType: "スプリンクラー",
    notes: "露地葉菜ライン",
  },
  {
    id: "pu-bed-a1",
    farmName: "静岡本園",
    parentUnitId: "pu-gh-a",
    unitType: "bed",
    code: "A1",
    name: "A棟 北ベッド",
    areaM2: 180,
    isActive: true,
    notes: "観察重点区画",
  },
  {
    id: "pu-nursery",
    farmName: "静岡本園",
    unitType: "nursery_area",
    code: "N1",
    name: "育苗エリア",
    areaM2: 240,
    isActive: true,
    notes: "苗受け・仮置き用",
  },
];

export const initialCultivationCycles: CultivationCycle[] = [
  {
    id: "cycle-st-2026-a",
    productionUnitId: "pu-gh-a",
    cropTypeId: "strawberry",
    varietyName: "紅ほっぺ",
    cycleName: "2026 冬春いちご",
    status: "active",
    startDate: TWO_HUNDRED_TWENTY_SIX_DAYS_AGO,
    plantingDate: TWO_HUNDRED_NINETEEN_DAYS_AGO,
    expectedHarvestStartDate: ONE_HUNDRED_FORTY_DAYS_AGO,
    expectedHarvestEndDate: THIRTY_TWO_DAYS_LATER,
    primaryRecordUnit: "kg",
    secondaryRecordUnit: "パック",
    shipmentUnit: "箱",
    plantedCount: 4200,
    plantedAreaM2: 1180,
    sourceBatchCode: "ST-25-0912",
    notes: "高単価向けライン",
  },
  {
    id: "cycle-tm-2026-b",
    productionUnitId: "pu-gh-b",
    cropTypeId: "tomato",
    varietyName: "麗夏",
    cycleName: "2026 春夏トマト",
    status: "active",
    startDate: ONE_HUNDRED_TEN_DAYS_AGO,
    plantingDate: NINETY_FIVE_DAYS_AGO,
    expectedHarvestStartDate: TEN_DAYS_AGO,
    expectedHarvestEndDate: ONE_HUNDRED_TWENTY_THREE_DAYS_LATER,
    primaryRecordUnit: "kg",
    secondaryRecordUnit: "ケース",
    shipmentUnit: "ケース",
    plantedCount: 1680,
    plantedAreaM2: 950,
    sourceBatchCode: "TM-26-0108",
  },
  {
    id: "cycle-km-2026-c",
    productionUnitId: "pu-gh-c",
    cropTypeId: "komatsuna",
    varietyName: "浜美2号",
    cycleName: "2026 初夏小松菜",
    status: "active",
    startDate: THIRTY_TWO_DAYS_AGO,
    plantingDate: addDaysToDateInputValue(TODAY, -31),
    expectedHarvestStartDate: THREE_DAYS_AGO,
    expectedHarvestEndDate: NINETEEN_DAYS_LATER,
    primaryRecordUnit: "束",
    secondaryRecordUnit: "kg",
    shipmentUnit: "ケース",
    plantedCount: 12000,
    plantedAreaM2: 820,
    sourceBatchCode: "KM-26-0325",
  },
  {
    id: "cycle-km-2026-field",
    productionUnitId: "pu-field-2",
    cropTypeId: "komatsuna",
    varietyName: "浜美2号",
    cycleName: "2026 露地小松菜 1作目",
    status: "active",
    startDate: TWENTY_SEVEN_DAYS_AGO,
    plantingDate: addDaysToDateInputValue(TODAY, -26),
    expectedHarvestStartDate: TODAY,
    expectedHarvestEndDate: TWENTY_ONE_DAYS_LATER,
    primaryRecordUnit: "束",
    secondaryRecordUnit: "kg",
    shipmentUnit: "ケース",
    plantedCount: 34000,
    plantedAreaM2: 2100,
    sourceBatchCode: "KM-26-0401",
  },
];

export const initialHarvestRecords: HarvestRecord[] = [
  {
    id: "harv-1",
    productionUnitId: "pu-gh-a",
    cultivationCycleId: "cycle-st-2026-a",
    cropTypeId: "strawberry",
    lotCode: `ST-A-${toMonthDayCode(TODAY)}-AM`,
    harvestDate: TODAY,
    quantityValue: 26.8,
    quantityUnit: "kg",
    normalizedWeightKg: 26.8,
    packageCount: 180,
    packageUnit: "パック",
    qualityGrade: "A",
    wasteWeightKg: 0.8,
  },
  {
    id: "harv-2",
    productionUnitId: "pu-gh-a",
    cultivationCycleId: "cycle-st-2026-a",
    cropTypeId: "strawberry",
    lotCode: `ST-A-${toMonthDayCode(YESTERDAY)}-AM`,
    harvestDate: YESTERDAY,
    quantityValue: 24.3,
    quantityUnit: "kg",
    normalizedWeightKg: 24.3,
    packageCount: 164,
    packageUnit: "パック",
    qualityGrade: "A",
    wasteWeightKg: 0.7,
  },
  {
    id: "harv-3",
    productionUnitId: "pu-gh-b",
    cultivationCycleId: "cycle-tm-2026-b",
    cropTypeId: "tomato",
    lotCode: `TM-B-${toMonthDayCode(TODAY)}-PM`,
    harvestDate: TODAY,
    quantityValue: 38.4,
    quantityUnit: "kg",
    normalizedWeightKg: 38.4,
    packageCount: 12,
    packageUnit: "ケース",
    qualityGrade: "秀",
    wasteWeightKg: 1.2,
  },
  {
    id: "harv-4",
    productionUnitId: "pu-gh-c",
    cultivationCycleId: "cycle-km-2026-c",
    cropTypeId: "komatsuna",
    lotCode: `KM-C-${toMonthDayCode(TODAY)}-AM`,
    harvestDate: TODAY,
    quantityValue: 320,
    quantityUnit: "束",
    normalizedWeightKg: 64,
    packageCount: 16,
    packageUnit: "ケース",
    qualityGrade: "良",
    wasteWeightKg: 2.1,
  },
  {
    id: "harv-5",
    productionUnitId: "pu-field-2",
    cultivationCycleId: "cycle-km-2026-field",
    cropTypeId: "komatsuna",
    lotCode: `KM-F2-${toMonthDayCode(YESTERDAY)}-AM`,
    harvestDate: YESTERDAY,
    quantityValue: 520,
    quantityUnit: "束",
    normalizedWeightKg: 104,
    packageCount: 26,
    packageUnit: "ケース",
    qualityGrade: "良",
    wasteWeightKg: 3.4,
  },
];

export const initialShipmentRecords: ShipmentRecord[] = [
  {
    id: "ship-1",
    productionUnitId: "pu-gh-a",
    cultivationCycleId: "cycle-st-2026-a",
    cropTypeId: "strawberry",
    harvestRecordId: "harv-1",
    shipmentDate: TODAY,
    shipmentLotCode: `OUT-ST-A-${toMonthDayCode(TODAY)}-01`,
    quantityValue: 42,
    quantityUnit: "箱",
    normalizedWeightKg: 25.2,
    packageCount: 42,
    packageUnit: "箱",
    averageUnitPrice: 1480,
    revenueAmount: 62160,
    destinationName: "首都圏青果センター",
  },
  {
    id: "ship-2",
    productionUnitId: "pu-gh-b",
    cultivationCycleId: "cycle-tm-2026-b",
    cropTypeId: "tomato",
    harvestRecordId: "harv-3",
    shipmentDate: TODAY,
    shipmentLotCode: `OUT-TM-B-${toMonthDayCode(TODAY)}-01`,
    quantityValue: 10,
    quantityUnit: "ケース",
    normalizedWeightKg: 32,
    packageCount: 10,
    packageUnit: "ケース",
    averageUnitPrice: 920,
    revenueAmount: 29440,
    destinationName: "地場スーパーABC",
  },
  {
    id: "ship-3",
    productionUnitId: "pu-gh-c",
    cultivationCycleId: "cycle-km-2026-c",
    cropTypeId: "komatsuna",
    harvestRecordId: "harv-4",
    shipmentDate: TODAY,
    shipmentLotCode: `OUT-KM-C-${toMonthDayCode(TODAY)}-01`,
    quantityValue: 16,
    quantityUnit: "ケース",
    normalizedWeightKg: 64,
    packageCount: 16,
    packageUnit: "ケース",
    averageUnitPrice: 1680,
    revenueAmount: 26880,
    destinationName: "JA集荷場",
  },
];

export const initialMaterialLots: MaterialLot[] = [
  {
    id: "lot-fert-1",
    materialType: "fertilizer",
    materialName: "液肥A",
    lotCode: "FERT-A-2604",
    supplierName: "静岡アグリ資材",
    remainingQuantityValue: 140,
    remainingQuantityUnit: "L",
    expiresOn: "2026-08-31",
  },
  {
    id: "lot-pest-1",
    materialType: "pesticide",
    materialName: "アミスター",
    lotCode: "PST-AM-2603",
    supplierName: "静岡アグリ資材",
    remainingQuantityValue: 3200,
    remainingQuantityUnit: "mL",
    expiresOn: "2027-03-31",
  },
  {
    id: "lot-pack-1",
    materialType: "packaging",
    materialName: "いちご化粧箱",
    lotCode: "PK-ST-2604",
    supplierName: "中部パッケージ",
    remainingQuantityValue: 180,
    remainingQuantityUnit: "箱",
  },
];

export const initialWorkMaterialUsages: WorkMaterialUsage[] = [
  {
    id: "usage-1",
    materialLotId: "lot-fert-1",
    materialName: "液肥A",
    lotCode: "FERT-A-2604",
    usageQuantityValue: 24,
    usageQuantityUnit: "L",
  },
  {
    id: "usage-2",
    materialLotId: "lot-pest-1",
    materialName: "アミスター",
    lotCode: "PST-AM-2603",
    usageQuantityValue: 250,
    usageQuantityUnit: "mL",
    targetPestOrDisease: "灰色かび病",
    dilutionRatio: "1000倍",
  },
];

export const initialWorkLogs: WorkLog[] = [
  {
    id: "work-1",
    productionUnitId: "pu-gh-a",
    cultivationCycleId: "cycle-st-2026-a",
    cropTypeId: "strawberry",
    workDate: TODAY,
    workType: "harvest",
    durationMinutes: 140,
    workerCount: 4,
    operatorName: "山田",
    sourceType: "manual",
    note: "朝収穫。A品率が高い。",
  },
  {
    id: "work-2",
    productionUnitId: "pu-gh-a",
    cultivationCycleId: "cycle-st-2026-a",
    cropTypeId: "strawberry",
    workDate: TODAY,
    workType: "pesticide",
    durationMinutes: 45,
    workerCount: 2,
    operatorName: "高橋",
    sourceType: "manual",
    note: "湿度上昇対策で予防散布",
    materialUsageIds: ["usage-2"],
  },
  {
    id: "work-3",
    productionUnitId: "pu-gh-b",
    cultivationCycleId: "cycle-tm-2026-b",
    cropTypeId: "tomato",
    workDate: TODAY,
    workType: "fertigation",
    durationMinutes: 35,
    workerCount: 1,
    operatorName: "佐藤",
    sourceType: "manual",
    note: "高糖度ラインの追肥",
    irrigation: {
      waterVolumeL: 280,
      timingType: "午前",
      method: "点滴潅水",
    },
    materialUsageIds: ["usage-1"],
  },
  {
    id: "work-4",
    productionUnitId: "pu-gh-c",
    cultivationCycleId: "cycle-km-2026-c",
    cropTypeId: "komatsuna",
    workDate: TODAY,
    workType: "harvest",
    durationMinutes: 90,
    workerCount: 3,
    operatorName: "伊藤",
    sourceType: "manual",
    note: "ケース詰めまで実施",
  },
  {
    id: "work-5",
    productionUnitId: "pu-field-2",
    cultivationCycleId: "cycle-km-2026-field",
    cropTypeId: "komatsuna",
    workDate: YESTERDAY,
    workType: "irrigation",
    durationMinutes: 50,
    workerCount: 1,
    operatorName: "伊藤",
    sourceType: "manual",
    irrigation: {
      waterVolumeL: 1400,
      timingType: "夕方",
      method: "スプリンクラー",
    },
  },
];

export const initialEnvironmentLogs: EnvironmentLog[] = [
  {
    id: "env-1",
    productionUnitId: "pu-gh-a",
    cultivationCycleId: "cycle-st-2026-a",
    cropTypeId: "strawberry",
    observedAt: TODAY_AT_1000,
    temperatureC: 22.6,
    humidityPct: 76,
    co2Ppm: 420,
    soilTemperatureC: 18.5,
    soilMoisturePct: 64,
    ecDsM: 1.2,
    ph: 6.1,
    lightLux: 28400,
  },
  {
    id: "env-2",
    productionUnitId: "pu-gh-b",
    cultivationCycleId: "cycle-tm-2026-b",
    cropTypeId: "tomato",
    observedAt: TODAY_AT_1000,
    temperatureC: 25.1,
    humidityPct: 69,
    co2Ppm: 460,
    soilTemperatureC: 20.2,
    soilMoisturePct: 58,
    ecDsM: 2.4,
    ph: 5.9,
    lightLux: 30100,
  },
  {
    id: "env-3",
    productionUnitId: "pu-gh-c",
    cultivationCycleId: "cycle-km-2026-c",
    cropTypeId: "komatsuna",
    observedAt: TODAY_AT_1000,
    temperatureC: 19.8,
    humidityPct: 82,
    co2Ppm: 390,
    soilTemperatureC: 16.4,
    soilMoisturePct: 71,
    ecDsM: 1.0,
    ph: 6.4,
    lightLux: 21600,
    notes: "換気遅れ気味",
  },
  {
    id: "env-4",
    productionUnitId: "pu-field-2",
    cultivationCycleId: "cycle-km-2026-field",
    cropTypeId: "komatsuna",
    observedAt: TODAY_AT_0930,
    temperatureC: 18.7,
    humidityPct: 74,
    co2Ppm: 370,
    soilTemperatureC: 15.8,
    soilMoisturePct: 69,
    ecDsM: 0.8,
    ph: 6.6,
    lightLux: 33200,
  },
];

export const initialDiseaseIncidents: DiseaseIncident[] = [
  {
    id: "dis-1",
    productionUnitId: "pu-gh-a",
    cultivationCycleId: "cycle-st-2026-a",
    cropTypeId: "strawberry",
    occurredOn: YESTERDAY,
    category: "disease",
    name: "灰色かび病",
    severityLevel: 3,
    affectedAreaRatio: 12,
    actionTaken: "予防散布と換気強化",
    note: "北側ベッドに集中",
  },
  {
    id: "dis-2",
    productionUnitId: "pu-gh-b",
    cultivationCycleId: "cycle-tm-2026-b",
    cropTypeId: "tomato",
    occurredOn: THREE_DAYS_AGO,
    category: "pest",
    name: "コナジラミ",
    severityLevel: 2,
    affectedAreaRatio: 7,
    actionTaken: "黄板追加",
    resolvedOn: YESTERDAY,
  },
  {
    id: "dis-3",
    productionUnitId: "pu-field-2",
    cultivationCycleId: "cycle-km-2026-field",
    cropTypeId: "komatsuna",
    occurredOn: TWO_DAYS_AGO,
    category: "pest",
    name: "アブラムシ",
    severityLevel: 2,
    affectedAreaRatio: 5,
    actionTaken: "散水と局所防除",
  },
];

export function getCropById(crops: CropOption[], cropId: CropSelection) {
  if (cropId === "all") return null;
  return crops.find((crop) => crop.id === cropId) ?? null;
}

export function getCropLabel(crops: CropOption[], cropId: CropSelection) {
  if (cropId === "all") return "全作物";
  return getCropById(crops, cropId)?.name ?? "不明";
}

export function getProductionUnitTypeLabel(type: ProductionUnitType) {
  switch (type) {
    case "greenhouse":
      return "ハウス";
    case "open_field":
      return "露地圃場";
    case "plot":
      return "区画";
    case "bed":
      return "ベッド";
    case "nursery_area":
      return "育苗";
    default:
      return type;
  }
}

export function createMockId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
