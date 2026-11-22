import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/data/store";
import {
  createQuotationRevision,
  acceptCustomerQuotation,
  rejectCustomerQuotation,
} from "@/domain/quotations/quotation-engine";
import { ReviseQuotationSchema, AcceptQuotationSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const store = getStore();
    const quotation = store.quotations.find(
      (q) => q.id === params.id || q.quotation_number === params.id || q.customer_acceptance_token === params.id
    );

    if (!quotation) {
      return NextResponse.json({ success: false, error: "Quotation not found" }, { status: 404 });
    }

    const items = store.quotationItems.filter((i) => i.quotation_id === quotation.id);
    const lead = store.leads.find((l) => l.id === quotation.lead_id);
    const survey = store.surveys.find((s) => s.id === quotation.survey_id);

    // Get revision history
    const baseNumber = quotation.quotation_number.split("-R")[0];
    const revisions = store.quotations
      .filter((q) => q.quotation_number.startsWith(baseNumber))
      .sort((a, b) => a.version - b.version);

    return NextResponse.json({
      success: true,
      data: {
        quotation,
        items,
        lead,
        survey,
        revisions,
      },
    });
  } catch (err: unknown) {
    logger.error("Failed to fetch quotation details", err, "API_QUOTATION_DETAIL");
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const action = body.action;

    if (action === "REVISE") {
      const validated = ReviseQuotationSchema.parse({
        ...body,
        quotationId: params.id,
      });

      const result = createQuotationRevision({
        quotationId: validated.quotationId,
        amendmentReason: validated.amendmentReason,
        modifiedCapacityKw: validated.modifiedCapacityKw,
        modifiedDiscountAmount: validated.modifiedDiscountAmount,
        userRole: body.userRole || "SALES_MANAGER",
        userId: body.userId,
        userName: body.userName,
      });

      return NextResponse.json({ success: true, data: result.quotation, items: result.items });
    }

    if (action === "ACCEPT") {
      const validated = AcceptQuotationSchema.parse({
        ...body,
        quotationIdOrToken: params.id,
      });

      const updated = acceptCustomerQuotation({
        quotationIdOrToken: validated.quotationIdOrToken,
        customerIdentifier: validated.customerName,
        customerIp: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });

      return NextResponse.json({ success: true, data: updated, message: "Quotation accepted successfully" });
    }

    if (action === "REJECT") {
      const reason = body.reason || "Customer declined quotation";
      const updated = rejectCustomerQuotation({
        quotationIdOrToken: params.id,
        rejectionReason: reason,
        customerIdentifier: body.customerName,
      });

      return NextResponse.json({ success: true, data: updated, message: "Quotation rejected" });
    }

    return NextResponse.json({ success: false, error: "Invalid action. Supported: REVISE, ACCEPT, REJECT" }, { status: 400 });
  } catch (err: unknown) {
    logger.error("Quotation action failed", err, "API_QUOTATION_PATCH");
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Error executing quotation action",
      },
      { status: 422 }
    );
  }
}
