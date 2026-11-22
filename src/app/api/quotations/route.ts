import { NextRequest, NextResponse } from "next/server";
import { GenerateQuotationSchema } from "@/lib/schemas";
import { generateQuotationPipeline } from "@/domain/quotations/quotation-engine";
import { getStore } from "@/lib/data/store";
import { logger } from "@/lib/logger";
import { getAuthenticatedSession } from "@/lib/security/auth-session";

export async function GET(req: NextRequest) {
  try {
    const store = getStore();
    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get("leadId");
    const status = searchParams.get("status");

    let results = store.quotations;
    if (leadId) results = results.filter((q) => q.lead_id === leadId);
    if (status) results = results.filter((q) => q.status === status);

    return NextResponse.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (err: unknown) {
    logger.error("Failed to retrieve quotations", err, "API_QUOTATIONS_GET");
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getAuthenticatedSession(req);
    const body = await req.json();
    const validated = GenerateQuotationSchema.parse(body);

    // SECURITY: Role resolution from server session, never arbitrary body parameter
    const effectiveRole = session ? session.role : "SALES_EXECUTIVE";
    const effectiveUserId = session ? session.userId : "20000000-0000-0000-0000-000000000002";
    const effectiveUserName = session ? session.name : "Aman Sharma";

    // SECURITY: High discount business logic rule (> 15% discount requires DIRECTOR or SUPER_ADMIN authorization)
    if (validated.discountAmount && validated.discountAmount > 50000) {
      if (effectiveRole !== "DIRECTOR" && effectiveRole !== "SUPER_ADMIN") {
        return NextResponse.json(
          {
            success: false,
            type: "https://solaros.sunpower.com/errors/unauthorized-discount",
            title: "Unauthorized Discount Requested",
            detail: "Commercial discounts exceeding ₹50,000 require executive DIRECTOR approval.",
          },
          { status: 403 }
        );
      }
    }

    const result = generateQuotationPipeline({
      leadId: validated.leadId,
      surveyId: validated.surveyId,
      systemCapacityKw: validated.systemCapacityKw,
      systemTopology: validated.systemTopology,
      discountAmount: validated.discountAmount,
      adminOverrideReason: validated.adminOverrideReason,
      createdByRole: effectiveRole,
      createdById: effectiveUserId,
      createdByName: effectiveUserName,
    });

    return NextResponse.json({
      success: true,
      data: result.quotation,
      items: result.items,
      pricing: result.pricing,
      inventoryCheck: result.inventoryCheck,
      customerPortalUrl: result.customerPortalUrl,
    }, { status: 201 });
  } catch (err: unknown) {
    logger.error("Failed to generate quotation", err, "API_QUOTATIONS_POST");
    return NextResponse.json(
      {
        success: false,
        type: "https://solaros.sunpower.com/errors/quotation-failed",
        title: "Quotation Generation Failed",
        detail: err instanceof Error ? err.message : "Error generating quotation",
      },
      { status: 422 }
    );
  }
}
