"use client";

import {
  useCallback,
  createContext,
  startTransition,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  createCropCode,
  createMockId,
  getAiPlanLabel,
  getCropById,
  getCropLabel,
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
  type CropId,
  type CropOption,
  type CropSelection,
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
import {
  clearOrganizationDataInEmulator,
  createCropInEmulator,
  createCultivationCycleInEmulator,
  createDiseaseIncidentInEmulator,
  createEnvironmentLogInEmulator,
  createHarvestRecordInEmulator,
  createProductionUnitInEmulator,
  resolveDiseaseIncidentInEmulator,
  createShipmentRecordInEmulator,
  createWorkLogInEmulator,
  loadEmulatorState,
  type AppDataState,
  type CropCreateInput,
  type CultivationCycleCreateInput,
  type DiseaseIncidentCreateInput,
  type EmulatorContext,
  type EnvironmentLogCreateInput,
  type HarvestRecordCreateInput,
  type ProductionUnitCreateInput,
  type ShipmentRecordCreateInput,
  type WorkLogCreateInput,
  type WorkMaterialUsageCreateInput,
  updateProductionUnitActiveInEmulator,
} from "@/lib/agri-emulator";
import { getCurrentDateInputValue } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import { useAppSession } from "@/components/providers/app-session-provider";

export type DataSourceMode = "mock" | "emulator";
type EmulatorStatus = "idle" | "loading" | "ready" | "error";

type AgriAppContextValue = {
  dataSourceMode: DataSourceMode;
  emulatorDataAvailable: boolean;
  emulatorStatus: EmulatorStatus;
  emulatorError: string | null;
  setDataSourceMode: (mode: DataSourceMode) => void;
  refreshEmulatorData: () => Promise<void>;
  clearEmulatorData: () => Promise<void>;
  crops: CropOption[];
  selectedCropId: CropSelection;
  selectedCrop: CropOption | null;
  setSelectedCropId: (cropId: CropSelection) => void;
  getCropLabel: (cropId: CropSelection) => string;
  productionUnits: ProductionUnit[];
  cultivationCycles: CultivationCycle[];
  harvestRecords: HarvestRecord[];
  shipmentRecords: ShipmentRecord[];
  workLogs: WorkLog[];
  environmentLogs: EnvironmentLog[];
  diseaseIncidents: DiseaseIncident[];
  materialLots: MaterialLot[];
  workMaterialUsages: WorkMaterialUsage[];
  addCrop: (input: CropCreateInput) => Promise<void>;
  addProductionUnit: (input: ProductionUnitCreateInput) => Promise<void>;
  addCultivationCycle: (input: CultivationCycleCreateInput) => Promise<void>;
  addHarvestRecord: (input: HarvestRecordCreateInput) => Promise<void>;
  addShipmentRecord: (input: ShipmentRecordCreateInput) => Promise<void>;
  addWorkLog: (
    input: WorkLogCreateInput,
    usages?: WorkMaterialUsageCreateInput[]
  ) => Promise<WorkLog | null>;
  addEnvironmentLog: (input: EnvironmentLogCreateInput) => Promise<EnvironmentLog | null>;
  addDiseaseIncident: (input: DiseaseIncidentCreateInput) => Promise<void>;
  toggleProductionUnitActive: (unitId: string) => Promise<void>;
  resolveDiseaseIncident: (incidentId: string) => Promise<void>;
  getUnitById: (unitId: string) => ProductionUnit | undefined;
  getCycleById: (cycleId: string) => CultivationCycle | undefined;
  getCycleForUnitAndCrop: (unitId: string, cropId: CropId) => CultivationCycle | undefined;
  getCyclesForUnit: (unitId: string) => CultivationCycle[];
  getCurrentCycleForUnit: (unitId: string) => CultivationCycle | undefined;
  getMaterialLotById: (lotId: string) => MaterialLot | undefined;
  matchesSelectedCrop: (cropId: CropId) => boolean;
};

const AgriAppContext = createContext<AgriAppContextValue | null>(null);

function createInitialMockState(): AppDataState {
  return {
    crops: initialCropOptions,
    productionUnits: initialProductionUnits,
    cultivationCycles: initialCultivationCycles,
    harvestRecords: initialHarvestRecords,
    shipmentRecords: initialShipmentRecords,
    workLogs: initialWorkLogs,
    environmentLogs: initialEnvironmentLogs,
    diseaseIncidents: initialDiseaseIncidents,
    materialLots: initialMaterialLots,
    workMaterialUsages: initialWorkMaterialUsages,
  };
}

const EMPTY_STATE: AppDataState = {
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

function normalizeProductionUnitCode(code?: string) {
  return code?.trim().toLowerCase() ?? "";
}

function toFriendlyEmulatorError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "エミュレータ操作に失敗しました";

  if (message.includes('connector "example" not found')) {
    return "Data Connect エミュレータに connector `example` が読み込まれていません。`C:\\projects\\agri-system` で `firebase emulators:start --only dataconnect` を再起動してください。起動しっぱなしの場合も、`operations.gql` 更新後は再起動が必要です。";
  }

  return message;
}

export function AgriAppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { activeOrganizationId } = useAppSession();
  const [dataSourceMode, setDataSourceModeState] = useState<DataSourceMode>("mock");
  const [selectedCropState, setSelectedCropState] = useState<CropSelection>("all");
  const [mockState, setMockState] = useState<AppDataState>(createInitialMockState);
  const [emulatorState, setEmulatorState] = useState<AppDataState>(EMPTY_STATE);
  const [emulatorContext, setEmulatorContext] = useState<EmulatorContext | null>(null);
  const [emulatorStatus, setEmulatorStatus] = useState<EmulatorStatus>("idle");
  const [emulatorError, setEmulatorError] = useState<string | null>(null);

  const currentState = dataSourceMode === "emulator" ? emulatorState : mockState;
  const {
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
  } = currentState;

  const setSelectedCropId = (cropId: CropSelection) => {
    startTransition(() => setSelectedCropState(cropId));
  };

  const setDataSourceMode = (mode: DataSourceMode) => {
    startTransition(() => setDataSourceModeState(mode));
  };

  const refreshEmulatorData = useCallback(async () => {
    if (!user) {
      setEmulatorContext({
        userId: null,
        organizationId: null,
        organizationName: null,
        needsSeed: true,
      });
      setEmulatorState(EMPTY_STATE);
      setEmulatorStatus("error");
      setEmulatorError("ログイン後にエミュレータデータを読み込めます");
      return;
    }
    setEmulatorStatus("loading");
    setEmulatorError(null);
    try {
      const loaded = await loadEmulatorState(user, activeOrganizationId);
      setEmulatorContext(loaded.context);
      setEmulatorState(loaded.state);
      setEmulatorStatus("ready");
    } catch (error) {
      setEmulatorStatus("error");
      setEmulatorError(toFriendlyEmulatorError(error));
    }
  }, [activeOrganizationId, user]);

  const clearEmulatorData = useCallback(async () => {
    if (!user) {
      setEmulatorStatus("error");
      setEmulatorError("ログイン後に削除できます");
      return;
    }
    setEmulatorStatus("loading");
    setEmulatorError(null);
    try {
      await clearOrganizationDataInEmulator(user, activeOrganizationId);
      const loaded = await loadEmulatorState(user, activeOrganizationId);
      setEmulatorContext(loaded.context);
      setEmulatorState(loaded.state);
      setEmulatorStatus("ready");
    } catch (error) {
      setEmulatorStatus("error");
      setEmulatorError(
        error instanceof Error ? error.message : "エミュレータデータの削除に失敗しました"
      );
    }
  }, [activeOrganizationId, user]);

  const selectedCropId =
    selectedCropState === "all" || crops.some((crop) => crop.id === selectedCropState)
      ? selectedCropState
      : "all";
  const selectedCrop = getCropById(crops, selectedCropId);
  const matchesSelectedCrop = (cropId: CropId) =>
    selectedCropId === "all" || selectedCropId === cropId;
  const getScopedCropLabel = (cropId: CropSelection) => getCropLabel(crops, cropId);

  const getUnitById = (unitId: string) => productionUnits.find((unit) => unit.id === unitId);
  const getCycleById = (cycleId: string) => cultivationCycles.find((cycle) => cycle.id === cycleId);
  const getCycleForUnitAndCrop = (unitId: string, cropId: CropId) =>
    cultivationCycles.find(
      (cycle) =>
        cycle.productionUnitId === unitId &&
        cycle.cropTypeId === cropId &&
        cycle.status === "active"
    ) ??
    cultivationCycles.find(
      (cycle) => cycle.productionUnitId === unitId && cycle.cropTypeId === cropId
    );
  const getCyclesForUnit = (unitId: string) =>
    cultivationCycles.filter((cycle) => cycle.productionUnitId === unitId);
  const getCurrentCycleForUnit = (unitId: string) =>
    cultivationCycles.find(
      (cycle) =>
        cycle.productionUnitId === unitId &&
        cycle.status === "active" &&
        matchesSelectedCrop(cycle.cropTypeId)
    ) ?? cultivationCycles.find((cycle) => cycle.productionUnitId === unitId && cycle.status === "active");
  const getMaterialLotById = (lotId: string) => materialLots.find((lot) => lot.id === lotId);

  const addCrop = async (input: CropCreateInput) => {
    if (dataSourceMode === "emulator") {
      if (!user) throw new Error("ログインが必要です");
      await createCropInEmulator(user, input, activeOrganizationId);
      await refreshEmulatorData();
      return;
    }

    setMockState((current) => {
      const nextIndex = current.crops.length;
      const style = getCropStylePreset(nextIndex);
      const aiLabel = getAiPlanLabel(input.aiPlan);
      const code = input.code?.trim() || createCropCode(input.name, nextIndex);
      return {
        ...current,
        crops: [
          {
            id: createMockId("crop"),
            code,
            name: input.name.trim(),
            accentClass: style.accentClass,
            surfaceClass: style.surfaceClass,
            pricingTier: aiLabel,
            aiEnabled: input.aiPlan !== "none",
            defaultYieldUnit: input.defaultYieldUnit.trim(),
            defaultShipmentUnit: input.defaultShipmentUnit.trim(),
          },
          ...current.crops,
        ],
      };
    });
  };

  const addProductionUnit = async (input: ProductionUnitCreateInput) => {
    const trimmedCode = input.code?.trim() ?? "";
    if (
      trimmedCode &&
      productionUnits.some(
        (unit) => normalizeProductionUnitCode(unit.code) === normalizeProductionUnitCode(trimmedCode)
      )
    ) {
      throw new Error("この識別コードは既に使われています");
    }

    if (dataSourceMode === "emulator") {
      if (!user) throw new Error("ログインが必要です");
      await createProductionUnitInEmulator(user, { ...input, code: trimmedCode }, activeOrganizationId);
      await refreshEmulatorData();
      return;
    }
    setMockState((current) => ({
      ...current,
      productionUnits: [
        {
          id: createMockId("pu"),
          isActive: true,
          ...input,
          code: trimmedCode,
        },
        ...current.productionUnits,
      ],
    }));
  };

  const addCultivationCycle = async (input: CultivationCycleCreateInput) => {
    if (dataSourceMode === "emulator") {
      if (!user) throw new Error("ログインが必要です");
      await createCultivationCycleInEmulator(user, input, activeOrganizationId);
      await refreshEmulatorData();
      return;
    }
    setMockState((current) => ({
      ...current,
      cultivationCycles: [
        {
          id: createMockId("cycle"),
          status: "active",
          ...input,
        },
        ...current.cultivationCycles,
      ],
    }));
  };

  const addHarvestRecord = async (input: HarvestRecordCreateInput) => {
    if (dataSourceMode === "emulator") {
      if (!user) throw new Error("ログインが必要です");
      await createHarvestRecordInEmulator(user, input, activeOrganizationId);
      await refreshEmulatorData();
      return;
    }
    setMockState((current) => ({
      ...current,
      harvestRecords: [{ id: createMockId("harv"), ...input }, ...current.harvestRecords],
    }));
  };

  const addShipmentRecord = async (input: ShipmentRecordCreateInput) => {
    if (dataSourceMode === "emulator") {
      if (!user) throw new Error("ログインが必要です");
      await createShipmentRecordInEmulator(user, input, activeOrganizationId);
      await refreshEmulatorData();
      return;
    }
    setMockState((current) => ({
      ...current,
      shipmentRecords: [{ id: createMockId("ship"), ...input }, ...current.shipmentRecords],
    }));
  };

  const addWorkLog = async (
    input: WorkLogCreateInput,
    usages: WorkMaterialUsageCreateInput[] = []
  ) => {
    if (dataSourceMode === "emulator") {
      if (!user) throw new Error("ログインが必要です");
      const created = await createWorkLogInEmulator(user, input, usages, activeOrganizationId);
      await refreshEmulatorData();
      return created;
    }

    const createdUsageIds = usages.map(() => createMockId("usage"));
    const createdLog: WorkLog = {
      id: createMockId("work"),
      ...input,
      materialUsageIds: createdUsageIds.length > 0 ? createdUsageIds : input.materialUsageIds,
    };
    if (usages.length > 0) {
      setMockState((current) => ({
        ...current,
        workMaterialUsages: [
          ...createdUsageIds.map((id, index) => ({ id, ...usages[index]! })),
          ...current.workMaterialUsages,
        ],
        workLogs: [createdLog, ...current.workLogs],
      }));
    } else {
      setMockState((current) => ({
        ...current,
        workLogs: [createdLog, ...current.workLogs],
      }));
    }
    return createdLog;
  };

  const addEnvironmentLog = async (input: EnvironmentLogCreateInput) => {
    if (dataSourceMode === "emulator") {
      if (!user) throw new Error("ログインが必要です");
      const created = await createEnvironmentLogInEmulator(user, input, activeOrganizationId);
      await refreshEmulatorData();
      return created;
    }
    const createdLog: EnvironmentLog = { id: createMockId("env"), ...input };
    setMockState((current) => ({
      ...current,
      environmentLogs: [createdLog, ...current.environmentLogs],
    }));
    return createdLog;
  };

  const addDiseaseIncident = async (input: DiseaseIncidentCreateInput) => {
    if (dataSourceMode === "emulator") {
      if (!user) throw new Error("ログインが必要です");
      await createDiseaseIncidentInEmulator(user, input, activeOrganizationId);
      await refreshEmulatorData();
      return;
    }
    setMockState((current) => ({
      ...current,
      diseaseIncidents: [{ id: createMockId("dis"), ...input }, ...current.diseaseIncidents],
    }));
  };

  const toggleProductionUnitActive = async (unitId: string) => {
    if (dataSourceMode === "emulator") {
      if (!user) throw new Error("ログインが必要です");
      const unit = productionUnits.find((item) => item.id === unitId);
      if (!unit) throw new Error("対象の生産エリアが見つかりません");
      await updateProductionUnitActiveInEmulator(user, unitId, !unit.isActive, activeOrganizationId);
      await refreshEmulatorData();
      return;
    }
    setMockState((current) => ({
      ...current,
      productionUnits: current.productionUnits.map((unit) =>
        unit.id === unitId ? { ...unit, isActive: !unit.isActive } : unit
      ),
    }));
  };

  const resolveDiseaseIncident = async (incidentId: string) => {
    const resolvedOn = getCurrentDateInputValue();
    if (dataSourceMode === "emulator") {
      if (!user) throw new Error("ログインが必要です");
      await resolveDiseaseIncidentInEmulator(user, incidentId, resolvedOn, activeOrganizationId);
      await refreshEmulatorData();
      return;
    }
    setMockState((current) => ({
      ...current,
      diseaseIncidents: current.diseaseIncidents.map((incident) =>
        incident.id === incidentId ? { ...incident, resolvedOn } : incident
      ),
    }));
  };

  const value: AgriAppContextValue = {
    dataSourceMode,
    emulatorDataAvailable: Boolean(emulatorContext?.organizationId),
    emulatorStatus,
    emulatorError,
    setDataSourceMode,
    refreshEmulatorData,
    clearEmulatorData,
    crops,
    selectedCropId,
    selectedCrop,
    setSelectedCropId,
    getCropLabel: getScopedCropLabel,
    productionUnits,
    cultivationCycles,
    harvestRecords,
    shipmentRecords,
    workLogs,
    environmentLogs,
    diseaseIncidents,
    materialLots,
    workMaterialUsages,
    addCrop,
    addProductionUnit,
    addCultivationCycle,
    addHarvestRecord,
    addShipmentRecord,
    addWorkLog,
    addEnvironmentLog,
    addDiseaseIncident,
    toggleProductionUnitActive,
    resolveDiseaseIncident,
    getUnitById,
    getCycleById,
    getCycleForUnitAndCrop,
    getCyclesForUnit,
    getCurrentCycleForUnit,
    getMaterialLotById,
    matchesSelectedCrop,
  };

  useEffect(() => {
    if (dataSourceMode === "emulator" && user && activeOrganizationId) {
      const timerId = window.setTimeout(() => {
        void refreshEmulatorData();
      }, 0);
      return () => window.clearTimeout(timerId);
    }
    return undefined;
  }, [activeOrganizationId, dataSourceMode, refreshEmulatorData, user]);

  return <AgriAppContext.Provider value={value}>{children}</AgriAppContext.Provider>;
}

export function useAgriApp() {
  const context = useContext(AgriAppContext);
  if (!context) {
    throw new Error("useAgriApp must be used within AgriAppProvider");
  }
  return context;
}
