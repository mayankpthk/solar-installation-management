// Domain Engine: Configurable Product Recipe & Bill of Materials (BOM) Resolution
// Conforms to SunPower Solutions operational specs (1-5 kW On-Grid, 1-5 kW Off-Grid, Panel Sets, Installation)

import { SystemTopology, ProductRecipe, ProductComponent, UserRole } from "@/lib/types/database";

export interface SurveyDimensions {
  dcCableDistanceMeters: number;
  acCableDistanceMeters: number;
  roofType?: string;
}

export interface CalculatedBOMItem {
  componentId: string;
  componentCode: string;
  name: string;
  category: ProductComponent["category"];
  unitOfMeasure: string;
  quantity: number;
  isMandatory: boolean;
  isSerialTracked: boolean;
  unitCost: number;
  unitPrice: number;
  totalCost: number;
  totalPrice: number;
  formulaDescription: string;
}

export interface ResolvedRecipeBOM {
  productId: string;
  productName: string;
  capacityKw: number;
  topology: SystemTopology;
  items: CalculatedBOMItem[];
  hardwareTotalCost: number;
  hardwareTotalPrice: number;
  installationServiceCost: number;
  installationServicePrice: number;
  totalBOMCost: number;
  totalBOMPrice: number;
}

/**
 * Standard Company Recipe Templates for SunPower Solutions
 */
export const DEFAULT_RECIPE_TEMPLATES: Omit<ProductRecipe, "id" | "product_id">[] = [
  // 1. Solar Panels: 540W Mono PERC
  {
    component_id: "50000000-0000-0000-0000-000000000001",
    component_code: "PV-PANEL-540W",
    component_name: "540W Mono-PERC Solar PV Module",
    unit_of_measure: "PIECE",
    default_quantity: 0, // dynamically resolved via PANEL_CALC
    quantity_rule: "PANEL_CALC",
    is_mandatory: true,
    applicable_system_type: "ALL",
    is_dynamic_cable: false,
    notes: "Capacity (kW) * 1000 / 540W ceiling rounded",
  },
  // 2. Solar Inverter: Grid-Tied or Off-Grid
  {
    component_id: "50000000-0000-0000-0000-000000000004",
    component_code: "INV-INVERTER",
    component_name: "Solar String / Hybrid Inverter",
    unit_of_measure: "PIECE",
    default_quantity: 1,
    quantity_rule: "FIXED",
    is_mandatory: true,
    applicable_system_type: "ALL",
    is_dynamic_cable: false,
    notes: "1 unit matched to capacity kW and topology",
  },
  // 3. Lithium Storage Bank (Off-Grid mandatory, On-Grid N/A)
  {
    component_id: "50000000-0000-0000-0000-000000000007",
    component_code: "BATT-5KWH",
    component_name: "5.12 kWh LiFePO4 Lithium Battery Bank",
    unit_of_measure: "PIECE",
    default_quantity: 1,
    quantity_rule: "BATTERY_CALC",
    is_mandatory: true,
    applicable_system_type: "OFF_GRID",
    is_dynamic_cable: false,
    notes: "1 unit for 1-3 kW; 2 units for 4-5 kW systems",
  },
  // 4. Hot Dip Galvanized Mounting Structure
  {
    component_id: "50000000-0000-0000-0000-000000000010",
    component_code: "STR-GI-MODULAR",
    component_name: "Hot Dip Galvanized Mounting Structure Module",
    unit_of_measure: "SET",
    default_quantity: 1,
    quantity_rule: "PER_KW",
    quantity_multiplier: 1,
    is_mandatory: true,
    applicable_system_type: "ALL",
    is_dynamic_cable: false,
    notes: "1 structural mount set per kW capacity",
  },
  // 5. UV-Resistant Solar DC Cable (4 sq mm)
  {
    component_id: "50000000-0000-0000-0000-000000000011",
    component_code: "CABLE-DC-4SQMM",
    component_name: "Solar DC Cable 4 sq mm UV-Resistant",
    unit_of_measure: "METER",
    default_quantity: 40,
    quantity_rule: "DYNAMIC_SURVEY",
    is_mandatory: true,
    applicable_system_type: "ALL",
    is_dynamic_cable: true,
    notes: "Survey distance * 2 strings * 1.15 safety routing factor",
  },
  // 6. AC Heavy Duty Copper Armoured Cable (6 sq mm)
  {
    component_id: "50000000-0000-0000-0000-000000000012",
    component_code: "CABLE-AC-6SQMM",
    component_name: "3-Core Copper AC Cable 6 sq mm",
    unit_of_measure: "METER",
    default_quantity: 15,
    quantity_rule: "DYNAMIC_SURVEY",
    is_mandatory: true,
    applicable_system_type: "ALL",
    is_dynamic_cable: true,
    notes: "Survey AC distance * 1.15 routing factor",
  },
  // 7. DC Distribution Box (DCDB)
  {
    component_id: "50000000-0000-0000-0000-000000000013",
    component_code: "DCDB-1IN-1OUT",
    component_name: "DC Distribution Box with 1000V Surge Protection",
    unit_of_measure: "PIECE",
    default_quantity: 1,
    quantity_rule: "FIXED",
    is_mandatory: true,
    applicable_system_type: "ALL",
    is_dynamic_cable: false,
    notes: "1 unit with 1000V DC SPD and fuse protection",
  },
  // 8. AC Distribution Box (ACDB)
  {
    component_id: "50000000-0000-0000-0000-000000000014",
    component_code: "ACDB-1PH",
    component_name: "Single-Phase AC Distribution Box with SPD & MCB",
    unit_of_measure: "PIECE",
    default_quantity: 1,
    quantity_rule: "FIXED",
    is_mandatory: true,
    applicable_system_type: "ALL",
    is_dynamic_cable: false,
    notes: "1 unit with AC SPD and isolation breakers",
  },
  // 9. Chemical Earthing Kits
  {
    component_id: "50000000-0000-0000-0000-000000000008",
    component_code: "EARTH-ROD-CHEM",
    component_name: "Chemical Earthing Rod Kit with Backfill Compound",
    unit_of_measure: "SET",
    default_quantity: 2,
    quantity_rule: "EARTHING_CALC",
    is_mandatory: true,
    applicable_system_type: "ALL",
    is_dynamic_cable: false,
    notes: "2 sets for <5kW; 3 sets for 5kW systems (MNRE compliance)",
  },
  // 10. Installation Service (Labor & Commissioning)
  {
    component_id: "50000000-0000-0000-0000-000000000020",
    component_code: "SRV-INSTALL-STD",
    component_name: "Rooftop Mechanical & Electrical Installation Service",
    unit_of_measure: "KW",
    default_quantity: 1,
    quantity_rule: "PER_KW",
    quantity_multiplier: 1,
    is_mandatory: true,
    applicable_system_type: "ALL",
    is_dynamic_cable: false,
    notes: "Certified installation by SunPower qualified technicians",
  },
];

/**
 * Resolves full recipe Bill of Materials (BOM) based on system configuration and site survey.
 */
export function resolveConfiguredBOM({
  capacityKw,
  topology,
  surveyDimensions,
  customRecipes,
  componentsCatalog,
}: {
  capacityKw: number;
  topology: SystemTopology;
  surveyDimensions?: SurveyDimensions;
  customRecipes?: ProductRecipe[];
  componentsCatalog: ProductComponent[];
}): ResolvedRecipeBOM {
  const dcDistance = surveyDimensions?.dcCableDistanceMeters ?? 20;
  const acDistance = surveyDimensions?.acCableDistanceMeters ?? 10;

  // Use custom recipe rules if passed, else fallback to templates
  const recipesToApply = customRecipes && customRecipes.length > 0
    ? customRecipes
    : DEFAULT_RECIPE_TEMPLATES;

  const items: CalculatedBOMItem[] = [];

  for (const recipe of recipesToApply) {
    // Filter out if not applicable to topology
    if (
      recipe.applicable_system_type &&
      recipe.applicable_system_type !== "ALL" &&
      recipe.applicable_system_type !== topology
    ) {
      continue;
    }

    // Determine quantity based on rule
    let quantity = recipe.default_quantity;
    let formulaDescription = "Standard approved company quota";

    switch (recipe.quantity_rule) {
      case "PANEL_CALC": {
        // 540W modules: Math.ceil((capacityKw * 1000) / 540)
        quantity = Math.ceil((capacityKw * 1000) / 540);
        formulaDescription = `ceil((${capacityKw} kW * 1000) / 540W) = ${quantity} panels`;
        break;
      }
      case "BATTERY_CALC": {
        quantity = capacityKw >= 4 ? 2 : 1;
        formulaDescription = capacityKw >= 4 ? "4-5 kW requires 2x 5.12kWh BESS (10.24 kWh)" : "1-3 kW requires 1x 5.12kWh BESS";
        break;
      }
      case "EARTHING_CALC": {
        quantity = capacityKw >= 5 ? 3 : 2;
        formulaDescription = capacityKw >= 5 ? "5 kW requires 3 earthing pits (Inverter, DC, Lightning)" : "1-4 kW requires 2 earthing pits";
        break;
      }
      case "PER_KW": {
        const mult = recipe.quantity_multiplier ?? 1;
        quantity = Math.round(capacityKw * mult * 10) / 10;
        formulaDescription = `${mult} per kW * ${capacityKw} kW = ${quantity} units`;
        break;
      }
      case "DYNAMIC_SURVEY": {
        if (recipe.component_code === "CABLE-DC-4SQMM") {
          quantity = Math.ceil(dcDistance * 2 * 1.15);
          formulaDescription = `(${dcDistance}m survey distance * 2 strings * 1.15 routing factor) = ${quantity}m`;
        } else if (recipe.component_code === "CABLE-AC-6SQMM") {
          quantity = Math.ceil(acDistance * 1.15);
          formulaDescription = `(${acDistance}m survey distance * 1.15 routing factor) = ${quantity}m`;
        }
        break;
      }
      case "FIXED":
      default: {
        quantity = recipe.default_quantity || 1;
        formulaDescription = "Fixed unit allocation";
        break;
      }
    }

    // Lookup component pricing
    const comp = componentsCatalog.find(
      (c) => c.id === recipe.component_id || c.component_code === recipe.component_code
    );

    const unitCost = comp?.unit_cost ?? 1000;
    const unitPrice = comp?.base_selling_price ?? Math.round(unitCost * 1.25);
    const category = comp?.category ?? "SAFETY";
    const name = comp?.name ?? recipe.component_name ?? "Solar Component";
    const componentCode = comp?.component_code ?? recipe.component_code ?? "COMP";
    const unitOfMeasure = comp?.unit_of_measure ?? recipe.unit_of_measure ?? "PIECE";
    const isSerialTracked = comp?.is_serial_tracked ?? false;

    items.push({
      componentId: comp?.id ?? recipe.component_id,
      componentCode,
      name,
      category,
      unitOfMeasure,
      quantity,
      isMandatory: recipe.is_mandatory ?? true,
      isSerialTracked,
      unitCost,
      unitPrice,
      totalCost: Math.round(quantity * unitCost),
      totalPrice: Math.round(quantity * unitPrice),
      formulaDescription,
    });
  }

  // Calculate totals
  const hardwareItems = items.filter((i) => i.category !== "SERVICE");
  const serviceItems = items.filter((i) => i.category === "SERVICE");

  const hardwareTotalCost = hardwareItems.reduce((acc, i) => acc + i.totalCost, 0);
  const hardwareTotalPrice = hardwareItems.reduce((acc, i) => acc + i.totalPrice, 0);
  const installationServiceCost = serviceItems.reduce((acc, i) => acc + i.totalCost, 0);
  const installationServicePrice = serviceItems.reduce((acc, i) => acc + i.totalPrice, 0);

  return {
    productId: `prod-${capacityKw}kw-${topology.toLowerCase()}`,
    productName: `${capacityKw} kW ${topology === "OFF_GRID" ? "Off-Grid Solar System with Lithium BESS" : "Residential On-Grid Solar System"}`,
    capacityKw,
    topology,
    items,
    hardwareTotalCost,
    hardwareTotalPrice,
    installationServiceCost,
    installationServicePrice,
    totalBOMCost: hardwareTotalCost + installationServiceCost,
    totalBOMPrice: hardwareTotalPrice + installationServicePrice,
  };
}

/**
 * Validates whether user has role authority to modify approved product recipes.
 */
export function canConfigureProductRecipe(role: UserRole): boolean {
  return role === "SUPER_ADMIN" || role === "DIRECTOR" || role === "SALES_MANAGER";
}
