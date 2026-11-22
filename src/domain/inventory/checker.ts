// Domain Engine: Inventory Availability Verification & Reservation Pre-Flight
// Ensures Quotations and Orders never confirm hardware that does not exist in stock.

import { InventoryItem, ProductComponent } from "@/lib/types/database";
import { CalculatedBOMItem } from "@/domain/products/recipe-engine";

export interface StockShortage {
  componentId: string;
  componentCode: string;
  name: string;
  requiredQuantity: number;
  quantityOnHand: number;
  quantityReserved: number;
  availableQuantity: number;
  shortageQuantity: number;
  isMandatory: boolean;
}

export interface InventoryCheckResult {
  isAvailable: boolean;
  status: "FULL_STOCK" | "PARTIAL_STOCK" | "OUT_OF_STOCK";
  totalRequiredComponents: number;
  itemsInStockCount: number;
  itemsShortCount: number;
  shortages: StockShortage[];
  summaryMessage: string;
}

/**
 * Checks warehouse inventory availability for a list of BOM items.
 */
export function verifyInventoryAvailability({
  items,
  inventoryItems,
  componentsCatalog,
}: {
  items: (CalculatedBOMItem | { componentId?: string; componentCode: string; name: string; quantity: number; isMandatory?: boolean })[];
  inventoryItems: InventoryItem[];
  componentsCatalog: ProductComponent[];
}): InventoryCheckResult {
  const shortages: StockShortage[] = [];
  let itemsInStockCount = 0;

  for (const item of items) {
    // Skip labor / service items
    if ((item as CalculatedBOMItem).category === "SERVICE") {
      itemsInStockCount++;
      continue;
    }

    // Match component
    const component = componentsCatalog.find(
      (c) => c.id === item.componentId || c.component_code === item.componentCode
    );

    const compId = component?.id || item.componentId;
    const inv = inventoryItems.find((i) => i.component_id === compId);

    const quantityOnHand = inv ? inv.quantity_on_hand : 0;
    const quantityReserved = inv ? inv.quantity_reserved : 0;
    const availableQuantity = Math.max(0, quantityOnHand - quantityReserved);
    const required = item.quantity;
    const isMandatory = item.isMandatory !== false;

    if (availableQuantity >= required) {
      itemsInStockCount++;
    } else {
      const shortageQuantity = required - availableQuantity;
      shortages.push({
        componentId: compId || "unknown",
        componentCode: item.componentCode,
        name: item.name,
        requiredQuantity: required,
        quantityOnHand,
        quantityReserved,
        availableQuantity,
        shortageQuantity,
        isMandatory,
      });
    }
  }

  const itemsShortCount = shortages.length;
  let status: "FULL_STOCK" | "PARTIAL_STOCK" | "OUT_OF_STOCK" = "FULL_STOCK";
  let isAvailable = true;
  let summaryMessage = "All required components are in stock and ready for allocation.";

  if (itemsShortCount > 0) {
    const hasCriticalShortage = shortages.some(
      (s) => s.isMandatory && s.availableQuantity === 0
    );

    if (hasCriticalShortage) {
      status = "OUT_OF_STOCK";
      isAvailable = false;
      summaryMessage = `Critical stock shortage: ${shortages.length} mandatory component(s) are completely out of unreserved stock.`;
    } else {
      status = "PARTIAL_STOCK";
      isAvailable = false;
      summaryMessage = `Partial inventory shortage: ${shortages.length} item(s) require procurement before installation dispatch.`;
    }
  }

  return {
    isAvailable,
    status,
    totalRequiredComponents: items.length,
    itemsInStockCount,
    itemsShortCount,
    shortages,
    summaryMessage,
  };
}
