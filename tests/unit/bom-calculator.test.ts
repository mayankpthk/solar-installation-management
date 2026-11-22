import { describe, it, expect } from "vitest";
import { calculateAutomaticBOM } from "@/domain/bom/calculator";

describe("Automated BOM Resolution Engine", () => {
  it("resolves exact hardware for 3 kW On-Grid system", () => {
    const survey = {
      dcCableDistanceMeters: 25.0,
      acCableDistanceMeters: 15.0,
      roofType: "RCC_FLAT",
    };

    const bom = calculateAutomaticBOM(3.0, "ON_GRID", survey);

    // 3 kW requires 6 x 540W Mono-PERC panels (3.24 kWp nominal)
    const panels = bom.items.find((i) => i.componentCode === "PV-PANEL-540W");
    expect(panels).toBeDefined();
    expect(panels?.quantity).toBe(6);

    // 1 x 3 kW On-Grid inverter
    const inverter = bom.items.find((i) => i.componentCode === "INV-3KW-OG");
    expect(inverter).toBeDefined();
    expect(inverter?.quantity).toBe(1);

    // Dynamic DC cable: 25m * 2 * 1.15 = 57.5 -> rounded up to 58m
    const dcCable = bom.items.find((i) => i.componentCode === "CABLE-DC-4SQMM");
    expect(dcCable?.quantity).toBe(58);

    // Dynamic AC cable: 15m * 1.15 = 17.25 -> rounded up to 18m
    const acCable = bom.items.find((i) => i.componentCode === "CABLE-AC-6SQMM");
    expect(acCable?.quantity).toBe(18);

    // Chemical Earthing Rods: 2 standard
    const earthing = bom.items.find((i) => i.componentCode === "EARTH-ROD-CHEM");
    expect(earthing?.quantity).toBe(2);

    // Batteries should NOT be in on-grid
    const battery = bom.items.find((i) => i.category === "BATTERY");
    expect(battery).toBeUndefined();
  });

  it("includes lithium battery storage for 3 kW Off-Grid system", () => {
    const survey = {
      dcCableDistanceMeters: 20.0,
      acCableDistanceMeters: 10.0,
    };

    const bom = calculateAutomaticBOM(3.0, "OFF_GRID", survey);

    const battery = bom.items.find((i) => i.componentCode === "BATT-LIFEPO4-5KWH");
    expect(battery).toBeDefined();
    expect(battery?.quantity).toBe(1);

    const offGridInverter = bom.items.find((i) => i.componentCode === "INV-3KW-OFF");
    expect(offGridInverter).toBeDefined();
  });
});
