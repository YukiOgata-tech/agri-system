"use client";

import {
  createContext,
  startTransition,
  useContext,
  useState,
  type ReactNode,
} from "react";
import {
  createMockId,
  cropOptions,
  getCropById,
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

type ProductionUnitInput = Pick<
  ProductionUnit,
  "farmName" | "parentUnitId" | "unitType" | "code" | "name" | "areaM2" | "notes"
>;

type CultivationCycleInput = Pick<
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

type HarvestRecordInput = Omit<HarvestRecord, "id">;
type ShipmentRecordInput = Omit<ShipmentRecord, "id">;
type WorkLogInput = Omit<WorkLog, "id">;
type EnvironmentLogInput = Omit<EnvironmentLog, "id">;
type DiseaseIncidentInput = Omit<DiseaseIncident, "id">;
type WorkMaterialUsageInput = Omit<WorkMaterialUsage, "id">;

type AgriAppContextValue = {
  crops: typeof cropOptions;
  selectedCropId: CropSelection;
  selectedCrop: ReturnType<typeof getCropById>;
  setSelectedCropId: (cropId: CropSelection) => void;
  productionUnits: ProductionUnit[];
  cultivationCycles: CultivationCycle[];
  harvestRecords: HarvestRecord[];
  shipmentRecords: ShipmentRecord[];
  workLogs: WorkLog[];
  environmentLogs: EnvironmentLog[];
  diseaseIncidents: DiseaseIncident[];
  materialLots: MaterialLot[];
  workMaterialUsages: WorkMaterialUsage[];
  addProductionUnit: (input: ProductionUnitInput) => void;
  addCultivationCycle: (input: CultivationCycleInput) => void;
  addHarvestRecord: (input: HarvestRecordInput) => void;
  addShipmentRecord: (input: ShipmentRecordInput) => void;
  addWorkLog: (input: WorkLogInput, usages?: WorkMaterialUsageInput[]) => void;
  addEnvironmentLog: (input: EnvironmentLogInput) => void;
  addDiseaseIncident: (input: DiseaseIncidentInput) => void;
  toggleProductionUnitActive: (unitId: string) => void;
  resolveDiseaseIncident: (incidentId: string) => void;
  getUnitById: (unitId: string) => ProductionUnit | undefined;
  getCycleById: (cycleId: string) => CultivationCycle | undefined;
  getCyclesForUnit: (unitId: string) => CultivationCycle[];
  getCurrentCycleForUnit: (unitId: string) => CultivationCycle | undefined;
  getMaterialLotById: (lotId: string) => MaterialLot | undefined;
  matchesSelectedCrop: (cropId: CropId) => boolean;
};

const AgriAppContext = createContext<AgriAppContextValue | null>(null);

export function AgriAppProvider({ children }: { children: ReactNode }) {
  const [selectedCropId, setSelectedCropState] = useState<CropSelection>("all");
  const [productionUnits, setProductionUnits] = useState(initialProductionUnits);
  const [cultivationCycles, setCultivationCycles] = useState(initialCultivationCycles);
  const [harvestRecords, setHarvestRecords] = useState(initialHarvestRecords);
  const [shipmentRecords, setShipmentRecords] = useState(initialShipmentRecords);
  const [workLogs, setWorkLogs] = useState(initialWorkLogs);
  const [environmentLogs, setEnvironmentLogs] = useState(initialEnvironmentLogs);
  const [diseaseIncidents, setDiseaseIncidents] = useState(initialDiseaseIncidents);
  const [materialLots] = useState(initialMaterialLots);
  const [workMaterialUsages, setWorkMaterialUsages] = useState(initialWorkMaterialUsages);

  const setSelectedCropId = (cropId: CropSelection) => {
    startTransition(() => setSelectedCropState(cropId));
  };

  const selectedCrop = getCropById(selectedCropId);
  const matchesSelectedCrop = (cropId: CropId) => selectedCropId === "all" || selectedCropId === cropId;

  const getUnitById = (unitId: string) => productionUnits.find((unit) => unit.id === unitId);
  const getCycleById = (cycleId: string) => cultivationCycles.find((cycle) => cycle.id === cycleId);
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

  const addProductionUnit = (input: ProductionUnitInput) => {
    setProductionUnits((current) => [
      {
        id: createMockId("pu"),
        isActive: true,
        ...input,
      },
      ...current,
    ]);
  };

  const addCultivationCycle = (input: CultivationCycleInput) => {
    setCultivationCycles((current) => [
      {
        id: createMockId("cycle"),
        status: "active",
        ...input,
      },
      ...current,
    ]);
  };

  const addHarvestRecord = (input: HarvestRecordInput) => {
    setHarvestRecords((current) => [{ id: createMockId("harv"), ...input }, ...current]);
  };

  const addShipmentRecord = (input: ShipmentRecordInput) => {
    setShipmentRecords((current) => [{ id: createMockId("ship"), ...input }, ...current]);
  };

  const addWorkLog = (input: WorkLogInput, usages: WorkMaterialUsageInput[] = []) => {
    const createdUsageIds = usages.map(() => createMockId("usage"));
    if (usages.length > 0) {
      setWorkMaterialUsages((current) => [
        ...createdUsageIds.map((id, index) => ({ id, ...usages[index]! })),
        ...current,
      ]);
    }
    setWorkLogs((current) => [
      {
        id: createMockId("work"),
        ...input,
        materialUsageIds: createdUsageIds.length > 0 ? createdUsageIds : input.materialUsageIds,
      },
      ...current,
    ]);
  };

  const addEnvironmentLog = (input: EnvironmentLogInput) => {
    setEnvironmentLogs((current) => [{ id: createMockId("env"), ...input }, ...current]);
  };

  const addDiseaseIncident = (input: DiseaseIncidentInput) => {
    setDiseaseIncidents((current) => [{ id: createMockId("dis"), ...input }, ...current]);
  };

  const toggleProductionUnitActive = (unitId: string) => {
    setProductionUnits((current) =>
      current.map((unit) => (unit.id === unitId ? { ...unit, isActive: !unit.isActive } : unit))
    );
  };

  const resolveDiseaseIncident = (incidentId: string) => {
    const resolvedOn = new Date().toISOString().split("T")[0];
    setDiseaseIncidents((current) =>
      current.map((incident) =>
        incident.id === incidentId ? { ...incident, resolvedOn } : incident
      )
    );
  };

  return (
    <AgriAppContext.Provider
      value={{
        crops: cropOptions,
        selectedCropId,
        selectedCrop,
        setSelectedCropId,
        productionUnits,
        cultivationCycles,
        harvestRecords,
        shipmentRecords,
        workLogs,
        environmentLogs,
        diseaseIncidents,
        materialLots,
        workMaterialUsages,
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
        getCyclesForUnit,
        getCurrentCycleForUnit,
        getMaterialLotById,
        matchesSelectedCrop,
      }}
    >
      {children}
    </AgriAppContext.Provider>
  );
}

export function useAgriApp() {
  const context = useContext(AgriAppContext);
  if (!context) {
    throw new Error("useAgriApp must be used within AgriAppProvider");
  }
  return context;
}
