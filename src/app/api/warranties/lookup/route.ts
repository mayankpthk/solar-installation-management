import { NextRequest, NextResponse } from "next/server";
import { evaluateWarrantyClaim } from "@/domain/warranty/checker";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query")?.trim();

  if (!query) {
    return NextResponse.json(
      {
        type: "https://solaros.sunpower.com/errors/invalid-parameter",
        title: "Missing Query Parameter",
        status: 400,
        detail: "Please provide a serial number, customer phone, or order ID.",
      },
      { status: 400 }
    );
  }

  // Simulated instant lookup from seed data:
  // If query matches Harpreet Bajwa / INV-2024-884912 -> Active warranty
  // If query matches Jaswant Rai / INV-2023-112490 -> Expired warranty
  const isHistoricActive = query.includes("884912") || query.toLowerCase().includes("harpreet");
  const isHistoricExpired = query.includes("112490") || query.toLowerCase().includes("jaswant");

  const today = new Date();

  let startDate: Date;
  let endDate: Date;
  let customerName: string;
  let phone: string;
  let serialNumber: string;

  if (isHistoricExpired) {
    customerName = "Jaswant Rai";
    phone = "+919872200004";
    serialNumber = "INV-2023-112490";
    startDate = new Date(today.getTime());
    startDate.setMonth(startDate.getMonth() - 30); // 30 months ago
    endDate = new Date(startDate.getTime());
    endDate.setMonth(endDate.getMonth() + 24); // Expired 6 months ago
  } else {
    // Default to Scene 5 Active Breakdown case
    customerName = "Harpreet Bajwa";
    phone = "+919872200003";
    serialNumber = "INV-2024-884912";
    startDate = new Date(today.getTime());
    startDate.setMonth(startDate.getMonth() - 18); // 18 months ago
    endDate = new Date(startDate.getTime());
    endDate.setMonth(endDate.getMonth() + 24); // Active for 6 more months
  }

  const evaluation = evaluateWarrantyClaim(startDate, endDate, today);

  logger.info("Warranty lookup executed", "API_WARRANTY", {
    query,
    serialNumber,
    isCovered: evaluation.isCovered,
    classification: evaluation.billingClassification,
  });

  return NextResponse.json({
    found: true,
    customer: {
      name: customerName,
      phone,
      address: "Green Avenue, Civil Lines, Jalandhar",
    },
    hardware: {
      itemCode: "INV-3KW-OG",
      itemName: "3 kW Single-Phase Grid-Tied Inverter",
      serialNumber,
    },
    warranty: {
      status: evaluation.isCovered ? "ACTIVE" : "EXPIRED",
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      remainingDays: evaluation.remainingDays,
      isCovered: evaluation.isCovered,
      billingClassification: evaluation.billingClassification,
      reason: evaluation.reason,
    },
  });
}
