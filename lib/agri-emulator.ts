"use client";

import type { User as FirebaseUser } from "firebase/auth";
import {
  executeMutation,
  executeQuery,
  mutationRef,
  queryRef,
} from "firebase/data-connect";
import {
  getAiPlanLabel,
  getCropStylePreset,
  initialCropOptions,
  initialCultivationCycles,
  initialDiseaseIncidents,
  initialEnvironmentLogs,
  initialHarvestRecords,
  initialMaterialLots,
  initialProductionUnits,
  initialShipmentRecords,
  initialWorkLogs,
  initialWorkMaterialUsages,
  type CropOption,
  type CultivationCycle,
  type DiseaseIncident,
  type EnvironmentLog,
  type HarvestRecord,
  type MaterialLot,
  type ProductionUnit,
  type ShipmentRecord,
  type WorkLog,
  type WorkMaterialUsage,
} from "@/lib/agri-mock-data";
import { getDataConnectClient } from "@/lib/dataconnect";
import { dateTimeInputValueToIsoString } from "@/lib/utils";

export type AppDataState = {
  crops: CropOption[];
  productionUnits: ProductionUnit[];
  cultivationCycles: CultivationCycle[];
  harvestRecords: HarvestRecord[];
  shipmentRecords: ShipmentRecord[];
  workLogs: WorkLog[];
  environmentLogs: EnvironmentLog[];
  diseaseIncidents: DiseaseIncident[];
  materialLots: MaterialLot[];
  workMaterialUsages: WorkMaterialUsage[];
};

export type EmulatorContext = {
  userId: string | null;
  organizationId: string | null;
  organizationName: string | null;
  needsSeed: boolean;
};

export type CropCreateInput = {
  name: string;
  code?: string;
  defaultYieldUnit: string;
  defaultShipmentUnit: string;
  aiPlan: "none" | "lite" | "pro";
};

export type ProductionUnitCreateInput = Omit<
  Pick<
    ProductionUnit,
    "farmName" | "parentUnitId" | "unitType" | "code" | "name" | "areaM2" | "notes"
  >,
  "code"
> & {
  code?: string;
};

export type CultivationCycleCreateInput = Pick<
  CultivationCycle,
  | "productionUnitId"
  | "cropTypeId"
  | "varietyName"
  | "cycleName"
  | "startDate"
  | "plantingDate"
  | "expectedHarvestStartDate"
  | "expectedHarvestEndDate"
  | "primaryRecordUnit"
  | "secondaryRecordUnit"
  | "shipmentUnit"
  | "plantedCount"
  | "plantedAreaM2"
  | "sourceBatchCode"
  | "notes"
>;

export type HarvestRecordCreateInput = Omit<HarvestRecord, "id">;
export type ShipmentRecordCreateInput = Omit<ShipmentRecord, "id">;
export type WorkLogCreateInput = Omit<WorkLog, "id">;
export type EnvironmentLogCreateInput = Omit<EnvironmentLog, "id">;
export type DiseaseIncidentCreateInput = Omit<DiseaseIncident, "id">;
export type WorkMaterialUsageCreateInput = Omit<WorkMaterialUsage, "id">;

const EMPTY_DATA_STATE: AppDataState = {
  crops: [],
  productionUnits: [],
  cultivationCycles: [],
  harvestRecords: [],
  shipmentRecords: [],
  workLogs: [],
  environmentLogs: [],
  diseaseIncidents: [],
  materialLots: [],
  workMaterialUsages: [],
};

type DUser = { id: string; authUid: string; email: string; displayName?: string | null };
type DOrg = { id: string; name: string };
type DProductionUnit = {
  id: string;
  name: string;
  code?: string | null;
  unitType: string;
  areaM2?: number | null;
  isActive: boolean;
  coveringMaterial?: string | null;
  irrigationSystemType?: string | null;
  bedCount?: number | null;
  rowCount?: number | null;
  notes?: string | null;
  parentUnit?: { id: string } | null;
  farm: { id: string; name: string };
};
type DCultivationCycle = {
  id: string;
  cycleName: string;
  startDate: string;
  endDate?: string | null;
  plantingDate?: string | null;
  expectedHarvestStartDate?: string | null;
  expectedHarvestEndDate?: string | null;
  status: "active" | "planned" | "completed";
  primaryRecordUnit?: string | null;
  secondaryRecordUnit?: string | null;
  shipmentUnit?: string | null;
  plantedCount?: number | null;
  plantedAreaM2?: number | null;
  sourceBatchCode?: string | null;
  notes?: string | null;
  productionUnit: { id: string };
  cropType: { id: string; code: string; nameJa: string };
  cropVariety?: { id: string; name: string } | null;
};
type DHarvestRecord = {
  id: string;
  lotCode?: string | null;
  harvestDate: string;
  quantityValue?: number | null;
  quantityUnit?: string | null;
  normalizedWeightKg?: number | null;
  packageCount?: number | null;
  packageUnit?: string | null;
  qualityGrade?: string | null;
  wasteWeightKg?: number | null;
  notes?: string | null;
  productionUnit: { id: string };
  cultivationCycle?: {
    id: string;
    cropType?: { id: string; code: string; nameJa: string } | null;
  } | null;
};
type DShipmentRecord = {
  id: string;
  shipmentDate: string;
  shipmentLotCode?: string | null;
  quantityValue?: number | null;
  quantityUnit?: string | null;
  normalizedWeightKg?: number | null;
  packageCount?: number | null;
  packageUnit?: string | null;
  averageUnitPrice?: number | null;
  revenueAmount?: number | null;
  destinationName?: string | null;
  notes?: string | null;
  productionUnit: { id: string };
  harvestRecord?: { id: string; lotCode?: string | null } | null;
  cultivationCycle?: {
    id: string;
    cropType?: { id: string; code: string; nameJa: string } | null;
  } | null;
};
type DWorkLog = {
  id: string;
  workDate: string;
  workType: WorkLog["workType"];
  durationMinutes?: number | null;
  workerCount?: number | null;
  sourceType?: "manual" | "imported" | null;
  note?: string | null;
  productionUnit: { id: string };
  cultivationCycle?: {
    id: string;
    cropType?: { id: string; code: string; nameJa: string } | null;
  } | null;
  operator?: { id: string; displayName?: string | null } | null;
  copiedFromWorkLog?: { id: string } | null;
  irrigationLog?: { id: string; waterVolumeL?: number | null; method?: string | null; timingType?: string | null } | null;
};
type DEnvironmentLog = {
  id: string;
  observedAt: string;
  temperatureC?: number | null;
  humidityPct?: number | null;
  co2Ppm?: number | null;
  soilTemperatureC?: number | null;
  soilMoisturePct?: number | null;
  ecDsM?: number | null;
  ph?: number | null;
  lightLux?: number | null;
  notes?: string | null;
  productionUnit: { id: string };
};
type DDiseaseIncident = {
  id: string;
  occurredOn: string;
  category: "disease" | "pest";
  name: string;
  severityLevel?: number | null;
  affectedAreaRatio?: number | null;
  actionTaken?: string | null;
  resolvedOn?: string | null;
  note?: string | null;
  productionUnit: { id: string };
  cultivationCycle?: {
    id: string;
    cropType?: { id: string; code: string; nameJa: string } | null;
  } | null;
};
type DWorkMaterialUsage = {
  id: string;
  usageQuantityValue?: number | null;
  usageQuantityUnit?: string | null;
  targetPestOrDisease?: string | null;
  dilutionRatio?: string | null;
  workLog: { id: string };
  materialLot: {
    id: string;
    lotCode: string;
    material: { id: string; name: string; materialType: "fertilizer" | "pesticide" | "packaging" };
  };
};
type DMaterialLot = {
  id: string;
  lotCode: string;
  supplierName?: string | null;
  purchasedOn?: string | null;
  expiresOn?: string | null;
  remainingQuantityValue?: number | null;
  remainingQuantityUnit?: string | null;
  material: { id: string; name: string; materialType: "fertilizer" | "pesticide" | "packaging" };
};

type QueryResultMap = {
  GetUserByAuthUid: { users: DUser[] };
  GetOrganizationMembersByAuthUid: { organizationMembers: Array<{ id: string; role: string; organization: DOrg }> };
  GetOrganizationsByOwner: { organizations: DOrg[] };
  GetFarmsByOrg: { farms: Array<{ id: string; name: string; prefecture?: string | null; city?: string | null; notes?: string | null }> };
  GetProductionUnitsByOrganization: { productionUnits: DProductionUnit[] };
  GetOrganizationCropSettings: {
    organizationCropSettings: Array<{
      id: string;
      aiAnalysisEnabled: boolean;
      defaultDashboard: boolean;
      pricingTier?: string | null;
      recordMode?: string | null;
      cropType: {
        id: string;
        code: string;
        nameJa: string;
        cultivationCategory?: string | null;
        defaultYieldUnit?: string | null;
        defaultShipmentUnit?: string | null;
      };
    }>;
  };
  GetCultivationCyclesByOrganization: { cultivationCycles: DCultivationCycle[] };
  GetHarvestRecordsByOrganization: { harvestRecords: DHarvestRecord[] };
  GetShipmentRecordsByOrganization: { shipmentRecords: DShipmentRecord[] };
  GetWorkLogsByOrganization: { workLogs: DWorkLog[] };
  GetWorkMaterialUsagesByOrganization: { workMaterialUsages: DWorkMaterialUsage[] };
  GetEnvironmentLogsByOrganization: { productionUnitEnvironmentLogs: DEnvironmentLog[] };
  GetDiseasePestIncidentsByOrganization: { diseasePestIncidents: DDiseaseIncident[] };
  GetCropTypes: {
    cropTypes: Array<{
      id: string;
      code: string;
      nameJa: string;
      nameEn?: string | null;
      cultivationCategory?: string | null;
      defaultYieldUnit?: string | null;
      defaultShipmentUnit?: string | null;
    }>;
  };
  GetCropVarieties: {
    cropVarieties: Array<{ id: string; name: string; producer?: string | null; characteristics?: string | null }>;
  };
  GetInputMaterials: {
    inputMaterials: Array<{
      id: string;
      materialType: "fertilizer" | "pesticide" | "packaging";
      name: string;
      manufacturer?: string | null;
      activeIngredient?: string | null;
      defaultUnit?: string | null;
    }>;
  };
  GetMaterialLotsByOrganization: { materialLots: DMaterialLot[] };
  GetWorkLogs: { workLogs: DWorkLog[] };
};

type MutationResultMap = {
  CreateUser: { user_insert: string };
  CreateOrganization: { organization_insert: string };
  CreateOrganizationMember: { organizationMember_insert: string };
  CreateFarm: { farm_insert: string };
  CreateCropType: { cropType_insert: string };
  CreateCropVariety: { cropVariety_insert: string };
  CreateOrganizationCropSetting: { organizationCropSetting_insert: string };
  CreateProductionUnit: { productionUnit_insert: string };
  CreateCultivationCycle: { cultivationCycle_insert: string };
  CreateHarvestRecord: { harvestRecord_insert: string };
  CreateShipmentRecord: { shipmentRecord_insert: string };
  CreateWorkLog: { workLog_insert: string };
  CreateIrrigationLog: { irrigationLog_insert: string };
  CreateInputMaterial: { inputMaterial_insert: string };
  CreateMaterialLot: { materialLot_insert: string };
  CreateWorkMaterialUsage: { workMaterialUsage_insert: string };
  CreateEnvironmentLog: { productionUnitEnvironmentLog_insert: string };
  CreateDiseasePestIncident: { diseasePestIncident_insert: string };
  UpdateProductionUnitActive: { productionUnit_update: string };
  DeleteWorkMaterialUsage: { workMaterialUsage_delete: string };
  DeleteIrrigationLog: { irrigationLog_delete: string };
  DeleteWorkLog: { workLog_delete: string };
  DeleteEnvironmentLog: { productionUnitEnvironmentLog_delete: string };
  DeleteDiseasePestIncident: { diseasePestIncident_delete: string };
  DeleteShipmentRecord: { shipmentRecord_delete: string };
  DeleteHarvestRecord: { harvestRecord_delete: string };
  DeleteCultivationCycle: { cultivationCycle_delete: string };
  DeleteProductionUnit: { productionUnit_delete: string };
  DeleteMaterialLot: { materialLot_delete: string };
  DeleteInputMaterial: { inputMaterial_delete: string };
  DeleteOrganizationCropSetting: { organizationCropSetting_delete: string };
  ResolveDiseasePestIncident: { diseasePestIncident_update: string };
};

type OperationName = keyof QueryResultMap;
type MutationName = keyof MutationResultMap;

async function runQuery<Name extends OperationName, Variables extends object | undefined>(
  name: Name,
  variables?: Variables
): Promise<QueryResultMap[Name]> {
  const dc = getDataConnectClient();
  const ref = variables
    ? queryRef<QueryResultMap[Name], Variables>(dc, name, variables)
    : queryRef<QueryResultMap[Name]>(dc, name);
  const result = await executeQuery(ref);
  return result.data;
}

async function runMutation<Name extends MutationName, Variables extends object | undefined>(
  name: Name,
  variables?: Variables
): Promise<MutationResultMap[Name]> {
  const dc = getDataConnectClient();
  const ref = variables
    ? mutationRef<MutationResultMap[Name], Variables>(dc, name, variables)
    : mutationRef<MutationResultMap[Name]>(dc, name);
  const result = await executeMutation(ref);
  return result.data;
}

function getMockAiPlan(code: string) {
  const found = initialCropOptions.find((crop) => crop.code === code);
  if (!found) return { aiEnabled: false, pricingTier: "未契約" };
  return { aiEnabled: found.aiEnabled, pricingTier: found.pricingTier };
}

function normalizeProductionUnitCode(code?: string | null) {
  return code?.trim().toLowerCase() ?? "";
}

function buildCropOptions(
  settings: QueryResultMap["GetOrganizationCropSettings"]["organizationCropSettings"]
): CropOption[] {
  return settings.map((setting, index) => {
    const style = getCropStylePreset(index);
    const fallback = getMockAiPlan(setting.cropType.code);
    return {
      id: setting.cropType.id,
      code: setting.cropType.code,
      name: setting.cropType.nameJa,
      accentClass: style.accentClass,
      surfaceClass: style.surfaceClass,
      pricingTier: setting.pricingTier ?? fallback.pricingTier,
      aiEnabled: setting.aiAnalysisEnabled ?? fallback.aiEnabled,
      defaultYieldUnit: setting.cropType.defaultYieldUnit ?? "kg",
      defaultShipmentUnit: setting.cropType.defaultShipmentUnit ?? "箱",
    };
  });
}

function deriveActiveCycleMaps(cycles: CultivationCycle[]) {
  const cycleByUnit = new Map<string, CultivationCycle>();
  for (const cycle of cycles) {
    if (!cycleByUnit.has(cycle.productionUnitId) || cycle.status === "active") {
      cycleByUnit.set(cycle.productionUnitId, cycle);
    }
  }
  return cycleByUnit;
}

export async function inspectEmulatorContext(
  authUser: FirebaseUser | null,
  preferredOrganizationId?: string | null
): Promise<EmulatorContext> {
  if (!authUser) {
    return { userId: null, organizationId: null, organizationName: null, needsSeed: true };
  }

  const userResult = await runQuery("GetUserByAuthUid", { authUid: authUser.uid });
  const user = userResult.users[0] ?? null;
  if (!user) {
    return { userId: null, organizationId: null, organizationName: null, needsSeed: true };
  }

  const [memberResult, ownerResult] = await Promise.all([
    runQuery("GetOrganizationMembersByAuthUid", { authUid: authUser.uid }),
    runQuery("GetOrganizationsByOwner", { ownerId: user.id }),
  ]);
  const organization =
    memberResult.organizationMembers.find(
      (member) => member.organization.id === preferredOrganizationId
    )?.organization ??
    ownerResult.organizations.find((organization) => organization.id === preferredOrganizationId) ??
    memberResult.organizationMembers[0]?.organization ??
    ownerResult.organizations[0] ??
    null;

  return {
    userId: user.id,
    organizationId: organization?.id ?? null,
    organizationName: organization?.name ?? null,
    needsSeed: !organization,
  };
}

export async function loadEmulatorState(
  authUser: FirebaseUser | null,
  preferredOrganizationId?: string | null
): Promise<{ context: EmulatorContext; state: AppDataState }> {
  const context = await inspectEmulatorContext(authUser, preferredOrganizationId);
  if (!context.organizationId) {
    return { context, state: EMPTY_DATA_STATE };
  }

  const fromDate = "2020-01-01";
  const toDate = "2035-12-31";
  const fromTimestamp = "2020-01-01T00:00:00Z";
  const toTimestamp = "2035-12-31T23:59:59Z";

  const [
    cropSettingsResult,
    productionUnitsResult,
    cyclesResult,
    harvestsResult,
    shipmentsResult,
    workLogsResult,
    usagesResult,
    environmentResult,
    diseasesResult,
    materialLotsResult,
  ] = await Promise.all([
    runQuery("GetOrganizationCropSettings", { organizationId: context.organizationId }),
    runQuery("GetProductionUnitsByOrganization", { organizationId: context.organizationId }),
    runQuery("GetCultivationCyclesByOrganization", { organizationId: context.organizationId }),
    runQuery("GetHarvestRecordsByOrganization", {
      organizationId: context.organizationId,
      from: fromDate,
      to: toDate,
    }),
    runQuery("GetShipmentRecordsByOrganization", {
      organizationId: context.organizationId,
      from: fromDate,
      to: toDate,
    }),
    runQuery("GetWorkLogsByOrganization", {
      organizationId: context.organizationId,
      from: fromDate,
      to: toDate,
    }),
    runQuery("GetWorkMaterialUsagesByOrganization", { organizationId: context.organizationId }),
    runQuery("GetEnvironmentLogsByOrganization", {
      organizationId: context.organizationId,
      from: fromTimestamp,
      to: toTimestamp,
    }),
    runQuery("GetDiseasePestIncidentsByOrganization", {
      organizationId: context.organizationId,
    }),
    runQuery("GetMaterialLotsByOrganization", { organizationId: context.organizationId }),
  ]);

  const crops = buildCropOptions(cropSettingsResult.organizationCropSettings);
  const productionUnits: ProductionUnit[] = productionUnitsResult.productionUnits.map((unit) => ({
    id: unit.id,
    farmName: unit.farm.name,
    parentUnitId: unit.parentUnit?.id ?? undefined,
    unitType: unit.unitType as ProductionUnit["unitType"],
    code: unit.code ?? "",
    name: unit.name,
    areaM2: unit.areaM2 ?? 0,
    isActive: unit.isActive,
    coveringMaterial: unit.coveringMaterial ?? undefined,
    irrigationSystemType: unit.irrigationSystemType ?? undefined,
    bedCount: unit.bedCount ?? undefined,
    rowCount: unit.rowCount ?? undefined,
    notes: unit.notes ?? undefined,
  }));
  const cultivationCycles: CultivationCycle[] = cyclesResult.cultivationCycles.map((cycle) => ({
    id: cycle.id,
    productionUnitId: cycle.productionUnit.id,
    cropTypeId: cycle.cropType.id,
    varietyName: cycle.cropVariety?.name ?? cycle.cropType.nameJa,
    cycleName: cycle.cycleName,
    status: cycle.status,
    startDate: cycle.startDate,
    plantingDate: cycle.plantingDate ?? cycle.startDate,
    expectedHarvestStartDate: cycle.expectedHarvestStartDate ?? cycle.startDate,
    expectedHarvestEndDate: cycle.expectedHarvestEndDate ?? cycle.endDate ?? cycle.startDate,
    primaryRecordUnit: cycle.primaryRecordUnit ?? "kg",
    secondaryRecordUnit: cycle.secondaryRecordUnit ?? undefined,
    shipmentUnit: cycle.shipmentUnit ?? "箱",
    plantedCount: cycle.plantedCount ?? 0,
    plantedAreaM2: cycle.plantedAreaM2 ?? 0,
    sourceBatchCode: cycle.sourceBatchCode ?? undefined,
    notes: cycle.notes ?? undefined,
  }));
  const cycleByUnit = deriveActiveCycleMaps(cultivationCycles);
  const workMaterialUsages: WorkMaterialUsage[] = usagesResult.workMaterialUsages.map((usage) => ({
    id: usage.id,
    materialLotId: usage.materialLot.id,
    materialName: usage.materialLot.material.name,
    lotCode: usage.materialLot.lotCode,
    usageQuantityValue: usage.usageQuantityValue ?? 0,
    usageQuantityUnit: usage.usageQuantityUnit ?? "",
    targetPestOrDisease: usage.targetPestOrDisease ?? undefined,
    dilutionRatio: usage.dilutionRatio ?? undefined,
  }));
  const usageIdsByWorkLog = new Map<string, string[]>();
  for (const usage of usagesResult.workMaterialUsages) {
    const current = usageIdsByWorkLog.get(usage.workLog.id) ?? [];
    current.push(usage.id);
    usageIdsByWorkLog.set(usage.workLog.id, current);
  }

  const harvestRecords: HarvestRecord[] = harvestsResult.harvestRecords.map((record) => ({
    id: record.id,
    productionUnitId: record.productionUnit.id,
    cultivationCycleId: record.cultivationCycle?.id ?? "",
    cropTypeId:
      record.cultivationCycle?.cropType?.id ??
      cycleByUnit.get(record.productionUnit.id)?.cropTypeId ??
      "",
    lotCode: record.lotCode ?? record.id,
    harvestDate: record.harvestDate,
    quantityValue: record.quantityValue ?? 0,
    quantityUnit: record.quantityUnit ?? "kg",
    normalizedWeightKg: record.normalizedWeightKg ?? 0,
    packageCount: record.packageCount ?? 0,
    packageUnit: record.packageUnit ?? "箱",
    qualityGrade: record.qualityGrade ?? "A",
    wasteWeightKg: record.wasteWeightKg ?? 0,
    notes: record.notes ?? undefined,
  }));
  const shipmentRecords: ShipmentRecord[] = shipmentsResult.shipmentRecords.map((record) => ({
    id: record.id,
    productionUnitId: record.productionUnit.id,
    cultivationCycleId: record.cultivationCycle?.id ?? "",
    cropTypeId:
      record.cultivationCycle?.cropType?.id ??
      cycleByUnit.get(record.productionUnit.id)?.cropTypeId ??
      "",
    harvestRecordId: record.harvestRecord?.id ?? "",
    shipmentDate: record.shipmentDate,
    shipmentLotCode: record.shipmentLotCode ?? record.id,
    quantityValue: record.quantityValue ?? 0,
    quantityUnit: record.quantityUnit ?? "kg",
    normalizedWeightKg: record.normalizedWeightKg ?? 0,
    packageCount: record.packageCount ?? 0,
    packageUnit: record.packageUnit ?? "箱",
    averageUnitPrice: record.averageUnitPrice ?? 0,
    revenueAmount: record.revenueAmount ?? 0,
    destinationName: record.destinationName ?? "",
    notes: record.notes ?? undefined,
  }));
  const workLogs: WorkLog[] = workLogsResult.workLogs.map((log) => ({
    id: log.id,
    productionUnitId: log.productionUnit.id,
    cultivationCycleId: log.cultivationCycle?.id ?? "",
    cropTypeId:
      log.cultivationCycle?.cropType?.id ??
      cycleByUnit.get(log.productionUnit.id)?.cropTypeId ??
      "",
    copiedFromWorkLogId: log.copiedFromWorkLog?.id ?? undefined,
    workDate: log.workDate,
    workType: log.workType,
    durationMinutes: log.durationMinutes ?? 0,
    workerCount: log.workerCount ?? 1,
    operatorName: log.operator?.displayName ?? "",
    sourceType: (log.sourceType ?? "manual") as WorkLog["sourceType"],
    note: log.note ?? undefined,
    irrigation: log.irrigationLog
      ? {
          waterVolumeL: log.irrigationLog.waterVolumeL ?? 0,
          timingType: log.irrigationLog.timingType ?? "",
          method: log.irrigationLog.method ?? "",
        }
      : undefined,
    materialUsageIds: usageIdsByWorkLog.get(log.id) ?? [],
  }));
  const environmentLogs: EnvironmentLog[] = environmentResult.productionUnitEnvironmentLogs.map((log) => {
    const cycle = cycleByUnit.get(log.productionUnit.id);
    return {
      id: log.id,
      productionUnitId: log.productionUnit.id,
      cultivationCycleId: cycle?.id ?? "",
      cropTypeId: cycle?.cropTypeId ?? "",
      observedAt: log.observedAt,
      temperatureC: log.temperatureC ?? 0,
      humidityPct: log.humidityPct ?? 0,
      co2Ppm: log.co2Ppm ?? 0,
      soilTemperatureC: log.soilTemperatureC ?? 0,
      soilMoisturePct: log.soilMoisturePct ?? 0,
      ecDsM: log.ecDsM ?? 0,
      ph: log.ph ?? 0,
      lightLux: log.lightLux ?? 0,
      notes: log.notes ?? undefined,
    };
  });
  const diseaseIncidents: DiseaseIncident[] = diseasesResult.diseasePestIncidents.map((incident) => ({
    id: incident.id,
    productionUnitId: incident.productionUnit.id,
    cultivationCycleId: incident.cultivationCycle?.id ?? "",
    cropTypeId:
      incident.cultivationCycle?.cropType?.id ??
      cycleByUnit.get(incident.productionUnit.id)?.cropTypeId ??
      "",
    occurredOn: incident.occurredOn,
    category: incident.category,
    name: incident.name,
    severityLevel: incident.severityLevel ?? 0,
    affectedAreaRatio: incident.affectedAreaRatio ?? 0,
    actionTaken: incident.actionTaken ?? undefined,
    resolvedOn: incident.resolvedOn ?? undefined,
    note: incident.note ?? undefined,
  }));
  const materialLots: MaterialLot[] = materialLotsResult.materialLots.map((lot) => ({
    id: lot.id,
    materialType: lot.material.materialType,
    materialName: lot.material.name,
    lotCode: lot.lotCode,
    supplierName: lot.supplierName ?? "",
    remainingQuantityValue: lot.remainingQuantityValue ?? 0,
    remainingQuantityUnit: lot.remainingQuantityUnit ?? "",
    expiresOn: lot.expiresOn ?? undefined,
  }));

  return {
    context: { ...context, needsSeed: false },
    state: {
      crops,
      productionUnits,
      cultivationCycles,
      harvestRecords,
      shipmentRecords,
      workLogs,
      environmentLogs,
      diseaseIncidents,
      materialLots,
      workMaterialUsages,
    },
  };
}

async function ensureUser(authUser: FirebaseUser) {
  let context = await inspectEmulatorContext(authUser);
  if (context.userId) return context.userId;

  await runMutation("CreateUser", {
    authUid: authUser.uid,
    email: authUser.email ?? `${authUser.uid}@local.test`,
    displayName: authUser.displayName ?? "ローカル検証ユーザー",
    authProvider: authUser.providerData[0]?.providerId ?? "password",
  });

  context = await inspectEmulatorContext(authUser);
  if (!context.userId) {
    throw new Error("ユーザー作成後の再取得に失敗しました");
  }
  return context.userId;
}

function getUniqueFarmsFromMock() {
  return Array.from(new Set(initialProductionUnits.map((unit) => unit.farmName))).map((name) => ({
    name,
    prefecture: name.includes("静岡") ? "静岡県" : "静岡県",
    city: name.includes("掛川") ? "掛川市" : "静岡市",
  }));
}

export async function seedEmulatorFromMock(
  authUser: FirebaseUser
): Promise<{ context: EmulatorContext; state: AppDataState }> {
  const userId = await ensureUser(authUser);
  let context = await inspectEmulatorContext(authUser);

  if (!context.organizationId) {
    await runMutation("CreateOrganization", {
      ownerId: userId,
      name: "ローカル検証農場",
      prefecture: "静岡県",
      city: "静岡市",
    });
    context = await inspectEmulatorContext(authUser);
    if (!context.organizationId) {
      throw new Error("組織作成後の再取得に失敗しました");
    }
    await runMutation("CreateOrganizationMember", {
      organizationId: context.organizationId,
      userId,
      role: "owner",
    });
    context = await inspectEmulatorContext(authUser);
  }

  const organizationId = context.organizationId!;

  const cropTypesResult = await runQuery("GetCropTypes");
  const cropTypesByCode = new Map(cropTypesResult.cropTypes.map((crop) => [crop.code, crop]));
  for (const crop of initialCropOptions) {
    if (cropTypesByCode.has(crop.code)) continue;
    await runMutation("CreateCropType", {
      code: crop.code,
      nameJa: crop.name,
      cultivationCategory: "fruit",
      defaultYieldUnit: crop.defaultYieldUnit,
      defaultShipmentUnit: crop.defaultShipmentUnit,
    });
  }

  const refreshedCropTypes = await runQuery("GetCropTypes");
  const cropTypeByCode = new Map(refreshedCropTypes.cropTypes.map((crop) => [crop.code, crop]));

  const orgCropSettings = await runQuery("GetOrganizationCropSettings", { organizationId });
  const existingSettingIds = new Set(orgCropSettings.organizationCropSettings.map((setting) => setting.cropType.code));
  for (const crop of initialCropOptions) {
    if (existingSettingIds.has(crop.code)) continue;
    const dbCrop = cropTypeByCode.get(crop.code);
    if (!dbCrop) continue;
    await runMutation("CreateOrganizationCropSetting", {
      organizationId,
      cropTypeId: dbCrop.id,
      aiAnalysisEnabled: crop.aiEnabled,
      defaultDashboard: false,
      pricingTier: crop.pricingTier,
      recordMode: "standard",
    });
  }

  for (const crop of initialCropOptions) {
    const dbCrop = cropTypeByCode.get(crop.code);
    if (!dbCrop) continue;
    const varietiesResult = await runQuery("GetCropVarieties", { cropTypeId: dbCrop.id });
    const varietyNames = new Set(varietiesResult.cropVarieties.map((item) => item.name));
    for (const cycle of initialCultivationCycles.filter((item) => item.cropTypeId === crop.id)) {
      if (varietyNames.has(cycle.varietyName)) continue;
      await runMutation("CreateCropVariety", {
        cropTypeId: dbCrop.id,
        name: cycle.varietyName,
      });
      varietyNames.add(cycle.varietyName);
    }
  }

  const farmsResult = await runQuery("GetFarmsByOrg", { organizationId });
  const existingFarms = new Set(farmsResult.farms.map((farm) => farm.name));
  for (const farm of getUniqueFarmsFromMock()) {
    if (existingFarms.has(farm.name)) continue;
    await runMutation("CreateFarm", {
      organizationId,
      name: farm.name,
      prefecture: farm.prefecture,
      city: farm.city,
      notes: "モックから投入",
    });
  }

  const farmsAfter = await runQuery("GetFarmsByOrg", { organizationId });
  const farmByName = new Map(farmsAfter.farms.map((farm) => [farm.name, farm]));

  const unitsBefore = await runQuery("GetProductionUnitsByOrganization", { organizationId });
  const unitKeys = new Set(unitsBefore.productionUnits.map((unit) => `${unit.farm.name}::${unit.code ?? unit.name}`));
  const unitsSorted = [...initialProductionUnits].sort((a, b) => Number(Boolean(a.parentUnitId)) - Number(Boolean(b.parentUnitId)));
  for (const unit of unitsSorted) {
    const farm = farmByName.get(unit.farmName);
    if (!farm) continue;
    const unitKey = `${unit.farmName}::${unit.code || unit.name}`;
    if (unitKeys.has(unitKey)) continue;
    const parentUnit = unit.parentUnitId
      ? initialProductionUnits.find((item) => item.id === unit.parentUnitId)
      : undefined;
    const unitsLatest = await runQuery("GetProductionUnitsByOrganization", { organizationId });
    const parentDbUnit = parentUnit
      ? unitsLatest.productionUnits.find(
          (item) => item.farm.name === parentUnit.farmName && (item.code ?? item.name) === (parentUnit.code || parentUnit.name)
        )
      : undefined;
    await runMutation("CreateProductionUnit", {
      farmId: farm.id,
      parentUnitId: parentDbUnit?.id ?? null,
      unitType: unit.unitType,
      name: unit.name,
      code: unit.code,
      areaM2: unit.areaM2,
      notes: unit.notes ?? null,
    });
    unitKeys.add(unitKey);
  }

  const unitsAfter = await runQuery("GetProductionUnitsByOrganization", { organizationId });
  const unitByCode = new Map(unitsAfter.productionUnits.map((unit) => [unit.code || unit.name, unit]));

  const cyclesBefore = await runQuery("GetCultivationCyclesByOrganization", { organizationId });
  const cycleKeys = new Set(cyclesBefore.cultivationCycles.map((cycle) => `${cycle.productionUnit.id}::${cycle.cycleName}`));
  for (const cycle of initialCultivationCycles) {
    const unit = initialProductionUnits.find((item) => item.id === cycle.productionUnitId);
    const dbUnit = unit ? unitByCode.get(unit.code || unit.name) : undefined;
    const crop = initialCropOptions.find((item) => item.id === cycle.cropTypeId);
    const dbCrop = crop ? cropTypeByCode.get(crop.code) : undefined;
    if (!dbUnit || !dbCrop) continue;
    const key = `${dbUnit.id}::${cycle.cycleName}`;
    if (cycleKeys.has(key)) continue;
    const varieties = await runQuery("GetCropVarieties", { cropTypeId: dbCrop.id });
    const variety = varieties.cropVarieties.find((item) => item.name === cycle.varietyName);
    await runMutation("CreateCultivationCycle", {
      productionUnitId: dbUnit.id,
      cropTypeId: dbCrop.id,
      cropVarietyId: variety?.id ?? null,
      cycleName: cycle.cycleName,
      startDate: cycle.startDate,
      plantingDate: cycle.plantingDate,
      primaryRecordUnit: cycle.primaryRecordUnit,
      secondaryRecordUnit: cycle.secondaryRecordUnit ?? null,
      shipmentUnit: cycle.shipmentUnit,
      plantedCount: cycle.plantedCount,
      notes: cycle.notes ?? null,
    });
    cycleKeys.add(key);
  }

  const cyclesAfter = await runQuery("GetCultivationCyclesByOrganization", { organizationId });
  const cycleByKey = new Map(
    cyclesAfter.cultivationCycles.map((cycle) => [
      `${cycle.productionUnit.id}::${cycle.cycleName}`,
      cycle,
    ])
  );

  const materialsBefore = await runQuery("GetInputMaterials", { organizationId });
  const materialByKey = new Map(
    materialsBefore.inputMaterials.map((material) => [`${material.materialType}::${material.name}`, material])
  );
  for (const lot of initialMaterialLots) {
    const key = `${lot.materialType}::${lot.materialName}`;
    if (materialByKey.has(key)) continue;
    await runMutation("CreateInputMaterial", {
      organizationId,
      materialType: lot.materialType,
      name: lot.materialName,
      defaultUnit: lot.remainingQuantityUnit,
    });
  }
  const materialsAfter = await runQuery("GetInputMaterials", { organizationId });
  const materialAfterByKey = new Map(
    materialsAfter.inputMaterials.map((material) => [`${material.materialType}::${material.name}`, material])
  );

  const lotsBefore = await runQuery("GetMaterialLotsByOrganization", { organizationId });
  const lotCodes = new Set(lotsBefore.materialLots.map((lot) => lot.lotCode));
  for (const lot of initialMaterialLots) {
    if (lotCodes.has(lot.lotCode)) continue;
    const material = materialAfterByKey.get(`${lot.materialType}::${lot.materialName}`);
    if (!material) continue;
    await runMutation("CreateMaterialLot", {
      organizationId,
      materialId: material.id,
      lotCode: lot.lotCode,
      supplierName: lot.supplierName,
      purchasedOn: null,
      receivedQuantityValue: lot.remainingQuantityValue,
      receivedQuantityUnit: lot.remainingQuantityUnit,
      remainingQuantityValue: lot.remainingQuantityValue,
      remainingQuantityUnit: lot.remainingQuantityUnit,
      notes: "モックから投入",
    });
    lotCodes.add(lot.lotCode);
  }

  const harvestsBefore = await runQuery("GetHarvestRecordsByOrganization", {
    organizationId,
    from: "2020-01-01",
    to: "2035-12-31",
  });
  const harvestKeys = new Set(harvestsBefore.harvestRecords.map((record) => `${record.productionUnit.id}::${record.lotCode}`));
  for (const record of initialHarvestRecords) {
    const mockUnit = initialProductionUnits.find((unit) => unit.id === record.productionUnitId);
    const mockCycle = initialCultivationCycles.find((cycle) => cycle.id === record.cultivationCycleId);
    const dbUnit = mockUnit ? unitByCode.get(mockUnit.code || mockUnit.name) : undefined;
    const dbCycle = mockUnit && mockCycle ? cycleByKey.get(`${dbUnit?.id}::${mockCycle.cycleName}`) : undefined;
    if (!dbUnit) continue;
    const key = `${dbUnit.id}::${record.lotCode}`;
    if (harvestKeys.has(key)) continue;
    await runMutation("CreateHarvestRecord", {
      productionUnitId: dbUnit.id,
      cultivationCycleId: dbCycle?.id ?? null,
      lotCode: record.lotCode,
      harvestDate: record.harvestDate,
      quantityValue: record.quantityValue,
      quantityUnit: record.quantityUnit,
      normalizedWeightKg: record.normalizedWeightKg,
      packageCount: record.packageCount,
      packageUnit: record.packageUnit,
      qualityGrade: record.qualityGrade,
      wasteWeightKg: record.wasteWeightKg,
      recordedByUserId: userId,
      notes: record.notes ?? null,
    });
    harvestKeys.add(key);
  }

  const harvestsAfter = await runQuery("GetHarvestRecordsByOrganization", {
    organizationId,
    from: "2020-01-01",
    to: "2035-12-31",
  });
  const harvestByLot = new Map(harvestsAfter.harvestRecords.map((record) => [record.lotCode ?? record.id, record]));

  const shipmentsBefore = await runQuery("GetShipmentRecordsByOrganization", {
    organizationId,
    from: "2020-01-01",
    to: "2035-12-31",
  });
  const shipmentKeys = new Set(shipmentsBefore.shipmentRecords.map((record) => record.shipmentLotCode ?? record.id));
  for (const record of initialShipmentRecords) {
    if (shipmentKeys.has(record.shipmentLotCode)) continue;
    const mockUnit = initialProductionUnits.find((unit) => unit.id === record.productionUnitId);
    const mockCycle = initialCultivationCycles.find((cycle) => cycle.id === record.cultivationCycleId);
    const mockHarvest = initialHarvestRecords.find((harvest) => harvest.id === record.harvestRecordId);
    const dbUnit = mockUnit ? unitByCode.get(mockUnit.code || mockUnit.name) : undefined;
    const dbCycle = mockUnit && mockCycle ? cycleByKey.get(`${dbUnit?.id}::${mockCycle.cycleName}`) : undefined;
    const dbHarvest = mockHarvest ? harvestByLot.get(mockHarvest.lotCode) : undefined;
    if (!dbUnit) continue;
    await runMutation("CreateShipmentRecord", {
      productionUnitId: dbUnit.id,
      cultivationCycleId: dbCycle?.id ?? null,
      harvestRecordId: dbHarvest?.id ?? null,
      shipmentDate: record.shipmentDate,
      shipmentLotCode: record.shipmentLotCode,
      quantityValue: record.quantityValue,
      quantityUnit: record.quantityUnit,
      normalizedWeightKg: record.normalizedWeightKg,
      packageCount: record.packageCount,
      packageUnit: record.packageUnit,
      averageUnitPrice: record.averageUnitPrice,
      revenueAmount: record.revenueAmount,
      destinationName: record.destinationName,
      recordedByUserId: userId,
      notes: record.notes ?? null,
    });
    shipmentKeys.add(record.shipmentLotCode);
  }

  const workLogsBefore = await runQuery("GetWorkLogsByOrganization", {
    organizationId,
    from: "2020-01-01",
    to: "2035-12-31",
  });
  const existingWorkKeys = new Set(
    workLogsBefore.workLogs.map((log) => `${log.productionUnit.id}::${log.workDate}::${log.workType}::${log.note ?? ""}`)
  );
  const lotsAfter = await runQuery("GetMaterialLotsByOrganization", { organizationId });
  const lotByCode = new Map(lotsAfter.materialLots.map((lot) => [lot.lotCode, lot]));
  for (const log of initialWorkLogs) {
    const mockUnit = initialProductionUnits.find((unit) => unit.id === log.productionUnitId);
    const mockCycle = initialCultivationCycles.find((cycle) => cycle.id === log.cultivationCycleId);
    const dbUnit = mockUnit ? unitByCode.get(mockUnit.code || mockUnit.name) : undefined;
    const dbCycle = mockUnit && mockCycle ? cycleByKey.get(`${dbUnit?.id}::${mockCycle.cycleName}`) : undefined;
    if (!dbUnit) continue;
    const key = `${dbUnit.id}::${log.workDate}::${log.workType}::${log.note ?? ""}`;
    if (existingWorkKeys.has(key)) continue;
    const created = await runMutation("CreateWorkLog", {
      productionUnitId: dbUnit.id,
      cultivationCycleId: dbCycle?.id ?? null,
      workDate: log.workDate,
      workType: log.workType,
      durationMinutes: log.durationMinutes,
      workerCount: log.workerCount,
      operatorUserId: userId,
      note: log.note ?? null,
      copiedFromWorkLogId: null,
    });
    const createdWorkLogId = created.workLog_insert;
    if (log.irrigation) {
      await runMutation("CreateIrrigationLog", {
        workLogId: createdWorkLogId,
        waterVolumeL: log.irrigation.waterVolumeL,
        durationMinutes: log.durationMinutes,
        method: log.irrigation.method,
        timingType: log.irrigation.timingType,
        notes: log.note ?? null,
      });
    }
    const mockUsages = initialWorkMaterialUsages.filter((usage) =>
      (log.materialUsageIds ?? []).includes(usage.id)
    );
    for (const usage of mockUsages) {
      const dbLot = lotByCode.get(usage.lotCode);
      if (!dbLot) continue;
      await runMutation("CreateWorkMaterialUsage", {
        workLogId: createdWorkLogId,
        materialLotId: dbLot.id,
        usageQuantityValue: usage.usageQuantityValue,
        usageQuantityUnit: usage.usageQuantityUnit,
        normalizedUsageKg: null,
        normalizedUsageL: null,
        targetPestOrDisease: usage.targetPestOrDisease ?? null,
        dilutionRatio: usage.dilutionRatio ?? null,
        preharvestIntervalDays: null,
        notes: null,
      });
    }
    existingWorkKeys.add(key);
  }

  const environmentBefore = await runQuery("GetEnvironmentLogsByOrganization", {
    organizationId,
    from: "2020-01-01T00:00:00Z",
    to: "2035-12-31T23:59:59Z",
  });
  const environmentKeys = new Set(
    environmentBefore.productionUnitEnvironmentLogs.map((log) => `${log.productionUnit.id}::${log.observedAt}`)
  );
  for (const log of initialEnvironmentLogs) {
    const mockUnit = initialProductionUnits.find((unit) => unit.id === log.productionUnitId);
    const dbUnit = mockUnit ? unitByCode.get(mockUnit.code || mockUnit.name) : undefined;
    if (!dbUnit) continue;
    const key = `${dbUnit.id}::${log.observedAt}`;
    if (environmentKeys.has(key)) continue;
    await runMutation("CreateEnvironmentLog", {
      productionUnitId: dbUnit.id,
      observedAt: dateTimeInputValueToIsoString(log.observedAt),
      temperatureC: log.temperatureC,
      humidityPct: log.humidityPct,
      co2Ppm: log.co2Ppm,
      soilTemperatureC: log.soilTemperatureC,
      soilMoisturePct: log.soilMoisturePct,
      ecDsM: log.ecDsM,
      ph: log.ph,
      lightLux: log.lightLux,
      recordedByUserId: userId,
      notes: log.notes ?? null,
    });
    environmentKeys.add(key);
  }

  const diseaseBefore = await runQuery("GetDiseasePestIncidentsByOrganization", {
    organizationId,
  });
  const diseaseKeys = new Set(
    diseaseBefore.diseasePestIncidents.map(
      (incident) => `${incident.productionUnit.id}::${incident.occurredOn}::${incident.name}`
    )
  );
  for (const incident of initialDiseaseIncidents) {
    const mockUnit = initialProductionUnits.find((unit) => unit.id === incident.productionUnitId);
    const mockCycle = initialCultivationCycles.find((cycle) => cycle.id === incident.cultivationCycleId);
    const dbUnit = mockUnit ? unitByCode.get(mockUnit.code || mockUnit.name) : undefined;
    const dbCycle = mockUnit && mockCycle ? cycleByKey.get(`${dbUnit?.id}::${mockCycle.cycleName}`) : undefined;
    if (!dbUnit) continue;
    const key = `${dbUnit.id}::${incident.occurredOn}::${incident.name}`;
    if (diseaseKeys.has(key)) continue;
    await runMutation("CreateDiseasePestIncident", {
      productionUnitId: dbUnit.id,
      cultivationCycleId: dbCycle?.id ?? null,
      occurredOn: incident.occurredOn,
      category: incident.category,
      name: incident.name,
      severityLevel: incident.severityLevel,
      affectedAreaRatio: incident.affectedAreaRatio,
      actionTaken: incident.actionTaken ?? null,
      note: incident.note ?? null,
    });
    diseaseKeys.add(key);
  }

  return loadEmulatorState(authUser);
}

function getProductionUnitDepth(
  unitId: string,
  parentById: Map<string, string | undefined>,
  cache: Map<string, number>
): number {
  const cached = cache.get(unitId);
  if (cached !== undefined) return cached;
  const parentId = parentById.get(unitId);
  const depth = parentId ? getProductionUnitDepth(parentId, parentById, cache) + 1 : 0;
  cache.set(unitId, depth);
  return depth;
}

export async function clearOrganizationDataInEmulator(
  authUser: FirebaseUser,
  preferredOrganizationId?: string | null
) {
  const context = await ensureContextReady(authUser, preferredOrganizationId);
  const organizationId = context.organizationId!;
  const fromDate = "2020-01-01";
  const toDate = "2035-12-31";
  const fromTimestamp = "2020-01-01T00:00:00Z";
  const toTimestamp = "2035-12-31T23:59:59Z";

  const [
    cropSettingsResult,
    productionUnitsResult,
    cyclesResult,
    harvestsResult,
    shipmentsResult,
    workLogsResult,
    usagesResult,
    environmentResult,
    diseasesResult,
    materialLotsResult,
    inputMaterialsResult,
  ] = await Promise.all([
    runQuery("GetOrganizationCropSettings", { organizationId }),
    runQuery("GetProductionUnitsByOrganization", { organizationId }),
    runQuery("GetCultivationCyclesByOrganization", { organizationId }),
    runQuery("GetHarvestRecordsByOrganization", { organizationId, from: fromDate, to: toDate }),
    runQuery("GetShipmentRecordsByOrganization", { organizationId, from: fromDate, to: toDate }),
    runQuery("GetWorkLogsByOrganization", { organizationId, from: fromDate, to: toDate }),
    runQuery("GetWorkMaterialUsagesByOrganization", { organizationId }),
    runQuery("GetEnvironmentLogsByOrganization", {
      organizationId,
      from: fromTimestamp,
      to: toTimestamp,
    }),
    runQuery("GetDiseasePestIncidentsByOrganization", { organizationId }),
    runQuery("GetMaterialLotsByOrganization", { organizationId }),
    runQuery("GetInputMaterials", { organizationId }),
  ]);

  for (const usage of usagesResult.workMaterialUsages) {
    await runMutation("DeleteWorkMaterialUsage", { id: usage.id });
  }

  for (const workLog of workLogsResult.workLogs) {
    if (workLog.irrigationLog?.id) {
      await runMutation("DeleteIrrigationLog", { id: workLog.irrigationLog.id });
    }
  }

  for (const shipment of shipmentsResult.shipmentRecords) {
    await runMutation("DeleteShipmentRecord", { id: shipment.id });
  }

  for (const harvest of harvestsResult.harvestRecords) {
    await runMutation("DeleteHarvestRecord", { id: harvest.id });
  }

  for (const environmentLog of environmentResult.productionUnitEnvironmentLogs) {
    await runMutation("DeleteEnvironmentLog", { id: environmentLog.id });
  }

  for (const incident of diseasesResult.diseasePestIncidents) {
    await runMutation("DeleteDiseasePestIncident", { id: incident.id });
  }

  for (const workLog of workLogsResult.workLogs) {
    await runMutation("DeleteWorkLog", { id: workLog.id });
  }

  for (const cycle of cyclesResult.cultivationCycles) {
    await runMutation("DeleteCultivationCycle", { id: cycle.id });
  }

  const parentById = new Map(
    productionUnitsResult.productionUnits.map((unit) => [unit.id, unit.parentUnit?.id ?? undefined])
  );
  const depthCache = new Map<string, number>();
  const unitsByDepth = [...productionUnitsResult.productionUnits].sort(
    (left, right) =>
      getProductionUnitDepth(right.id, parentById, depthCache) -
      getProductionUnitDepth(left.id, parentById, depthCache)
  );
  for (const unit of unitsByDepth) {
    await runMutation("DeleteProductionUnit", { id: unit.id });
  }

  for (const lot of materialLotsResult.materialLots) {
    await runMutation("DeleteMaterialLot", { id: lot.id });
  }

  for (const material of inputMaterialsResult.inputMaterials) {
    await runMutation("DeleteInputMaterial", { id: material.id });
  }

  for (const setting of cropSettingsResult.organizationCropSettings) {
    await runMutation("DeleteOrganizationCropSetting", { id: setting.id });
  }
}

function toCropCode(input: CropCreateInput) {
  const normalized = (input.code?.trim() || input.name.trim())
    .normalize("NFKC")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4);
  return normalized || "CROP";
}

async function ensureContextReady(
  authUser: FirebaseUser,
  preferredOrganizationId?: string | null
) {
  const context = await inspectEmulatorContext(authUser, preferredOrganizationId);
  if (!context.userId || !context.organizationId) {
    throw new Error("エミュレータにユーザーまたは組織データがありません。先にエミュレータDBへデータを作成してください。");
  }
  return context;
}

export async function createCropInEmulator(
  authUser: FirebaseUser,
  input: CropCreateInput,
  preferredOrganizationId?: string | null
) {
  const context = await ensureContextReady(authUser, preferredOrganizationId);
  const code = toCropCode(input);
  const crops = await runQuery("GetCropTypes");
  let cropType = crops.cropTypes.find((item) => item.code === code || item.nameJa === input.name.trim());
  if (!cropType) {
    await runMutation("CreateCropType", {
      code,
      nameJa: input.name.trim(),
      cultivationCategory: "general",
      defaultYieldUnit: input.defaultYieldUnit.trim(),
      defaultShipmentUnit: input.defaultShipmentUnit.trim(),
    });
    const refreshed = await runQuery("GetCropTypes");
    cropType = refreshed.cropTypes.find(
      (item) => item.code === code || item.nameJa === input.name.trim()
    );
  }
  if (!cropType) {
    throw new Error("作物マスタの作成に失敗しました");
  }
  const settings = await runQuery("GetOrganizationCropSettings", {
    organizationId: context.organizationId,
  });
  const exists = settings.organizationCropSettings.some((item) => item.cropType.id === cropType!.id);
  if (!exists) {
    await runMutation("CreateOrganizationCropSetting", {
      organizationId: context.organizationId,
      cropTypeId: cropType.id,
      aiAnalysisEnabled: input.aiPlan !== "none",
      defaultDashboard: false,
      pricingTier: getAiPlanLabel(input.aiPlan),
      recordMode: "standard",
    });
  }
}

export async function createProductionUnitInEmulator(
  authUser: FirebaseUser,
  input: ProductionUnitCreateInput,
  preferredOrganizationId?: string | null
) {
  const context = await ensureContextReady(authUser, preferredOrganizationId);
  const trimmedCode = input.code?.trim() ?? "";
  let farms = await runQuery("GetFarmsByOrg", { organizationId: context.organizationId });
  let farm = farms.farms.find((item) => item.name === input.farmName);
  if (!farm) {
    await runMutation("CreateFarm", {
      organizationId: context.organizationId,
      name: input.farmName,
      prefecture: "静岡県",
      city: "静岡市",
      notes: "UIから追加",
    });
    farms = await runQuery("GetFarmsByOrg", { organizationId: context.organizationId });
    farm = farms.farms.find((item) => item.name === input.farmName);
  }
  if (!farm) throw new Error("農場の解決に失敗しました");

  const units = await runQuery("GetProductionUnitsByOrganization", {
    organizationId: context.organizationId,
  });
  if (
    trimmedCode &&
    units.productionUnits.some(
      (item) => normalizeProductionUnitCode(item.code) === normalizeProductionUnitCode(trimmedCode)
    )
  ) {
    throw new Error("この識別コードは既に使われています");
  }
  const parentMockId = input.parentUnitId;
  const parentUnit = parentMockId
    ? units.productionUnits.find((item) => item.id === parentMockId || item.code === parentMockId)
    : undefined;
  await runMutation("CreateProductionUnit", {
    farmId: farm.id,
    parentUnitId: parentUnit?.id ?? null,
    unitType: input.unitType,
    name: input.name,
    code: trimmedCode || null,
    areaM2: input.areaM2,
    notes: input.notes ?? null,
  });
}

export async function createCultivationCycleInEmulator(
  authUser: FirebaseUser,
  input: CultivationCycleCreateInput,
  preferredOrganizationId?: string | null
) {
  await ensureContextReady(authUser, preferredOrganizationId);
  let varieties = await runQuery("GetCropVarieties", { cropTypeId: input.cropTypeId });
  let variety = varieties.cropVarieties.find((item) => item.name === input.varietyName);
  if (!variety) {
    await runMutation("CreateCropVariety", {
      cropTypeId: input.cropTypeId,
      name: input.varietyName,
    });
    varieties = await runQuery("GetCropVarieties", { cropTypeId: input.cropTypeId });
    variety = varieties.cropVarieties.find((item) => item.name === input.varietyName);
  }
  await runMutation("CreateCultivationCycle", {
    productionUnitId: input.productionUnitId,
    cropTypeId: input.cropTypeId,
    cropVarietyId: variety?.id ?? null,
    cycleName: input.cycleName,
    startDate: input.startDate,
    plantingDate: input.plantingDate,
    primaryRecordUnit: input.primaryRecordUnit,
    secondaryRecordUnit: input.secondaryRecordUnit ?? null,
    shipmentUnit: input.shipmentUnit,
    plantedCount: input.plantedCount,
    notes: input.notes ?? null,
  });
}

export async function createHarvestRecordInEmulator(
  authUser: FirebaseUser,
  input: HarvestRecordCreateInput,
  preferredOrganizationId?: string | null
) {
  const context = await ensureContextReady(authUser, preferredOrganizationId);
  await runMutation("CreateHarvestRecord", {
    productionUnitId: input.productionUnitId,
    cultivationCycleId: input.cultivationCycleId || null,
    lotCode: input.lotCode,
    harvestDate: input.harvestDate,
    quantityValue: input.quantityValue,
    quantityUnit: input.quantityUnit,
    normalizedWeightKg: input.normalizedWeightKg,
    packageCount: input.packageCount,
    packageUnit: input.packageUnit,
    qualityGrade: input.qualityGrade,
    wasteWeightKg: input.wasteWeightKg,
    recordedByUserId: context.userId,
    notes: input.notes ?? null,
  });
}

export async function createShipmentRecordInEmulator(
  authUser: FirebaseUser,
  input: ShipmentRecordCreateInput,
  preferredOrganizationId?: string | null
) {
  const context = await ensureContextReady(authUser, preferredOrganizationId);
  await runMutation("CreateShipmentRecord", {
    productionUnitId: input.productionUnitId,
    cultivationCycleId: input.cultivationCycleId || null,
    harvestRecordId: input.harvestRecordId || null,
    shipmentDate: input.shipmentDate,
    shipmentLotCode: input.shipmentLotCode,
    quantityValue: input.quantityValue,
    quantityUnit: input.quantityUnit,
    normalizedWeightKg: input.normalizedWeightKg,
    packageCount: input.packageCount,
    packageUnit: input.packageUnit,
    averageUnitPrice: input.averageUnitPrice,
    revenueAmount: input.revenueAmount,
    destinationName: input.destinationName,
    recordedByUserId: context.userId,
    notes: input.notes ?? null,
  });
}

export async function createWorkLogInEmulator(
  authUser: FirebaseUser,
  input: WorkLogCreateInput,
  usages: WorkMaterialUsageCreateInput[] = [],
  preferredOrganizationId?: string | null
): Promise<WorkLog | null> {
  const context = await ensureContextReady(authUser, preferredOrganizationId);
  const created = await runMutation("CreateWorkLog", {
    productionUnitId: input.productionUnitId,
    cultivationCycleId: input.cultivationCycleId || null,
    workDate: input.workDate,
    workType: input.workType,
    durationMinutes: input.durationMinutes,
    workerCount: input.workerCount,
    operatorUserId: context.userId,
    note: input.note ?? null,
    copiedFromWorkLogId: input.copiedFromWorkLogId ?? null,
  });
  const workLogId = created.workLog_insert;
  if (input.irrigation) {
    await runMutation("CreateIrrigationLog", {
      workLogId,
      waterVolumeL: input.irrigation.waterVolumeL,
      durationMinutes: input.durationMinutes,
      method: input.irrigation.method,
      timingType: input.irrigation.timingType,
      notes: input.note ?? null,
    });
  }
  for (const usage of usages) {
    await runMutation("CreateWorkMaterialUsage", {
      workLogId,
      materialLotId: usage.materialLotId,
      usageQuantityValue: usage.usageQuantityValue,
      usageQuantityUnit: usage.usageQuantityUnit,
      normalizedUsageKg: null,
      normalizedUsageL: null,
      targetPestOrDisease: usage.targetPestOrDisease ?? null,
      dilutionRatio: usage.dilutionRatio ?? null,
      preharvestIntervalDays: null,
      notes: null,
    });
  }

  const reloaded = await loadEmulatorState(authUser, preferredOrganizationId);
  return (
    reloaded.state.workLogs.find((log) => log.id === workLogId) ??
    reloaded.state.workLogs.find(
      (log) =>
        log.productionUnitId === input.productionUnitId &&
        log.workDate === input.workDate &&
        log.workType === input.workType &&
        (log.note ?? "") === (input.note ?? "")
    ) ??
    null
  );
}

export async function createEnvironmentLogInEmulator(
  authUser: FirebaseUser,
  input: EnvironmentLogCreateInput,
  preferredOrganizationId?: string | null
): Promise<EnvironmentLog | null> {
  const context = await ensureContextReady(authUser, preferredOrganizationId);
  const observedAt = dateTimeInputValueToIsoString(input.observedAt);
  const created = await runMutation("CreateEnvironmentLog", {
    productionUnitId: input.productionUnitId,
    observedAt,
    temperatureC: input.temperatureC,
    humidityPct: input.humidityPct,
    co2Ppm: input.co2Ppm,
    soilTemperatureC: input.soilTemperatureC,
    soilMoisturePct: input.soilMoisturePct,
    ecDsM: input.ecDsM,
    ph: input.ph,
    lightLux: input.lightLux,
    recordedByUserId: context.userId,
    notes: input.notes ?? null,
  });
  const environmentLogId = created.productionUnitEnvironmentLog_insert;
  const reloaded = await loadEmulatorState(authUser, preferredOrganizationId);
  return (
    reloaded.state.environmentLogs.find((log) => log.id === environmentLogId) ??
    reloaded.state.environmentLogs.find(
      (log) =>
        log.productionUnitId === input.productionUnitId &&
        log.observedAt.startsWith(observedAt.slice(0, 16))
    ) ??
    null
  );
}

export async function createDiseaseIncidentInEmulator(
  authUser: FirebaseUser,
  input: DiseaseIncidentCreateInput,
  preferredOrganizationId?: string | null
) {
  await ensureContextReady(authUser, preferredOrganizationId);
  await runMutation("CreateDiseasePestIncident", {
    productionUnitId: input.productionUnitId,
    cultivationCycleId: input.cultivationCycleId || null,
    occurredOn: input.occurredOn,
    category: input.category,
    name: input.name,
    severityLevel: input.severityLevel,
    affectedAreaRatio: input.affectedAreaRatio,
    actionTaken: input.actionTaken ?? null,
    note: input.note ?? null,
  });
}

export async function updateProductionUnitActiveInEmulator(
  authUser: FirebaseUser,
  productionUnitId: string,
  isActive: boolean,
  preferredOrganizationId?: string | null
) {
  await ensureContextReady(authUser, preferredOrganizationId);
  await runMutation("UpdateProductionUnitActive", {
    id: productionUnitId,
    isActive,
  });
}

export async function resolveDiseaseIncidentInEmulator(
  authUser: FirebaseUser,
  incidentId: string,
  resolvedOn: string,
  preferredOrganizationId?: string | null
) {
  await ensureContextReady(authUser, preferredOrganizationId);
  await runMutation("ResolveDiseasePestIncident", {
    id: incidentId,
    resolvedOn,
  });
}
