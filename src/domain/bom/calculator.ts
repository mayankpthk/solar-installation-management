// Domain Engine: Automated Bill of Materials (BOM) Resolution (Single Source of Truth)

import { SystemTopology } from "@/lib/types/database";

export interface SurveyDimensions {
  dcCableDistanceMeters: number;
  acCableDistanceMeters: number;
  roofType?: string;
}

export interface ResolvedBOMItem {
  componentCode: string;
  name: string;
  category: "PANEL" | "INVERTER" | "BATTERY" | "STRUCTURE" | "CABLE" | "SAFETY";
  unitOfMeasure: string;
  quantity: number;
  isSerialTracked: boolean;
  unitCost: number;
  unitPrice: number;
  totalCost: number;
  totalPrice: number;
}

export interface ResolvedBOM {
  capacityKw: number;
  topology: SystemTopology;
  items: ResolvedBOMItem[];
  hardwareTotalCost: number;
  hardwareTotalPrice: number;
}

export function calculateAutomaticBOM(
  capacityKw: number,
  topology: SystemTopology,
  survey: SurveyDimensions
): ResolvedBOM {
  // 1. Calculate Solar Panels: 540W Mono-PERC Panels
  // Formula: Math.ceil((kW * 1000) / 540)
  const panelCount = Math.ceil((capacityKw * 1000) / 540);
  const panelUnitCost = 13500;
  const panelUnitPrice = 16500;

  const items: ResolvedBOMItem[] = [
    {
      componentCode: "PV-PANEL-540W",
      name: "540W Mono-PERC Solar PV Module",
      category: "PANEL",
      unitOfMeasure: "PIECE",
      quantity: panelCount,
      isSerialTracked: true,
      unitCost: panelUnitCost,
      unitPrice: panelUnitPrice,
      totalCost: panelCount * panelUnitCost,
      totalPrice: panelCount * panelUnitPrice,
    },
  ];

  // 2. Inverter Resolution
  let inverterCode = `INV-${Math.round(capacityKw)}KW-OG`;
  let inverterName = `${capacityKw} kW Grid-Tied String Inverter`;
  let inverterCost = 32000;
  let inverterPrice = 39000;

  if (topology === "OFF_GRID") {
    inverterCode = `INV-${Math.round(capacityKw)}KW-OFF`;
    inverterName = `${capacityKw} kW Off-Grid Solar Hybrid Inverter`;
    inverterCost = 42000;
    inverterPrice = 51000;
  } else if (capacityKw >= 5) {
    inverterCode = "INV-5KW-OG";
    inverterName = "5 kW Three-Phase Grid-Tied Inverter";
    inverterCost = 52000;
    inverterPrice = 62000;
  } else if (capacityKw <= 1) {
    inverterCode = "INV-1KW-OG";
    inverterName = "1 kW Grid-Tied Inverter";
    inverterCost = 18000;
    inverterPrice = 22000;
  } else if (capacityKw <= 2) {
    inverterCode = "INV-2KW-OG";
    inverterName = "2 kW Grid-Tied Inverter";
    inverterCost = 24000;
    inverterPrice = 29000;
  }

  items.push({
    componentCode: inverterCode,
    name: inverterName,
    category: "INVERTER",
    unitOfMeasure: "PIECE",
    quantity: 1,
    isSerialTracked: true,
    unitCost: inverterCost,
    unitPrice: inverterPrice,
    totalCost: inverterCost,
    totalPrice: inverterPrice,
  });

  // 3. Off-Grid Battery Storage (if OFF_GRID)
  if (topology === "OFF_GRID") {
    const batteryCount = capacityKw >= 4 ? 2 : 1;
    const battCost = 85000;
    const battPrice = 105000;
    items.push({
      componentCode: "BATT-LIFEPO4-5KWH",
      name: "5.12 kWh LiFePO4 Lithium Battery Storage Bank",
      category: "BATTERY",
      unitOfMeasure: "PIECE",
      quantity: batteryCount,
      isSerialTracked: true,
      unitCost: battCost,
      unitPrice: battPrice,
      totalCost: batteryCount * battCost,
      totalPrice: batteryCount * battPrice,
    });
  }

  // 4. Mounting Structures
  const structureCost = 4000 * capacityKw;
  const structurePrice = 5500 * capacityKw;
  items.push({
    componentCode: `STR-GI-${Math.round(capacityKw)}KW`,
    name: `Hot Dip Galvanized Mounting Structure (${capacityKw} kW)`,
    category: "STRUCTURE",
    unitOfMeasure: "SET",
    quantity: 1,
    isSerialTracked: false,
    unitCost: structureCost,
    unitPrice: structurePrice,
    totalCost: structureCost,
    totalPrice: structurePrice,
  });

  // 5. Dynamic DC Cable: (Survey Distance * 2 strings * 1.15 safety margin)
  const dcLength = Math.ceil(survey.dcCableDistanceMeters * 2 * 1.15);
  items.push({
    componentCode: "CABLE-DC-4SQMM",
    name: "Solar DC Cable 4 sq mm UV-Resistant",
    category: "CABLE",
    unitOfMeasure: "METER",
    quantity: dcLength,
    isSerialTracked: false,
    unitCost: 45,
    unitPrice: 65,
    totalCost: dcLength * 45,
    totalPrice: dcLength * 65,
  });

  // 6. Dynamic AC Cable: (Survey Distance * 1.15 safety margin)
  const acLength = Math.ceil(survey.acCableDistanceMeters * 1.15);
  items.push({
    componentCode: "CABLE-AC-6SQMM",
    name: "3-Core Copper AC Cable 6 sq mm",
    category: "CABLE",
    unitOfMeasure: "METER",
    quantity: acLength,
    isSerialTracked: false,
    unitCost: 95,
    unitPrice: 135,
    totalCost: acLength * 95,
    totalPrice: acLength * 135,
  });

  // 7. Balance of System Electrical Protection
  items.push({
    componentCode: "DCDB-1IN-1OUT",
    name: "DC Distribution Box with 1000V SPD",
    category: "SAFETY",
    unitOfMeasure: "PIECE",
    quantity: 1,
    isSerialTracked: false,
    unitCost: 3200,
    unitPrice: 4200,
    totalCost: 3200,
    totalPrice: 4200,
  });

  items.push({
    componentCode: "ACDB-1PH",
    name: "Single-Phase AC Distribution Box with SPD",
    category: "SAFETY",
    unitOfMeasure: "PIECE",
    quantity: 1,
    isSerialTracked: false,
    unitCost: 2800,
    unitPrice: 3800,
    totalCost: 2800,
    totalPrice: 3800,
  });

  // 8. Chemical Safety Earthing (2 sets standard, 3 for >= 5kW)
  const earthingCount = capacityKw >= 5 ? 3 : 2;
  items.push({
    componentCode: "EARTH-ROD-CHEM",
    name: "Chemical Earthing Rod Kit with Compound",
    category: "SAFETY",
    unitOfMeasure: "SET",
    quantity: earthingCount,
    isSerialTracked: false,
    unitCost: 1800,
    unitPrice: 2400,
    totalCost: earthingCount * 1800,
    totalPrice: earthingCount * 2400,
  });

  const hardwareTotalCost = items.reduce((sum, item) => sum + item.totalCost, 0);
  const hardwareTotalPrice = items.reduce((sum, item) => sum + item.totalPrice, 0);

  return {
    capacityKw,
    topology,
    items,
    hardwareTotalCost,
    hardwareTotalPrice,
  };
}
