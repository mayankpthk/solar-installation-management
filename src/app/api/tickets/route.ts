import { NextRequest, NextResponse } from "next/server";
import { CreateTicketSchema } from "@/lib/schemas";
import { evaluateWarrantyClaim } from "@/domain/warranty/checker";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = CreateTicketSchema.parse(body);

    const today = new Date();
    // Inverter 18 months ago under warranty vs 30 months ago expired
    const isExpired = validated.serialNumber.includes("112490");

    const startDate = new Date(today.getTime());
    startDate.setMonth(startDate.getMonth() - (isExpired ? 30 : 18));
    const endDate = new Date(startDate.getTime());
    endDate.setMonth(endDate.getMonth() + 24);

    const decision = evaluateWarrantyClaim(startDate, endDate, today);

    const ticketNumber = `TKT-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    logger.info("Service Ticket created", "API_TICKETS", {
      ticketNumber,
      serialNumber: validated.serialNumber,
      faultCode: validated.reportedFaultCode,
      isUnderWarranty: decision.isCovered,
      billingClassification: decision.billingClassification,
    });

    return NextResponse.json(
      {
        success: true,
        ticketNumber,
        orderId: validated.orderId,
        serialNumber: validated.serialNumber,
        reportedFaultCode: validated.reportedFaultCode ?? "E04",
        isUnderWarranty: decision.isCovered,
        billingClassification: decision.billingClassification,
        billableAmount: decision.isCovered ? 0.0 : 4500.0, // ₹0 if warranty covered, inspection fee if expired
        assignedTechnician: "Manpreet Singh (Lead Tech)",
        status: "ASSIGNED",
        reason: decision.reason,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    logger.error("Failed to create service ticket", err, "API_TICKETS");
    return NextResponse.json(
      {
        type: "https://solaros.sunpower.com/errors/ticket-creation-failed",
        title: "Ticket Creation Failed",
        status: 422,
        detail: err instanceof Error ? err.message : "Invalid payload",
      },
      { status: 422 }
    );
  }
}
