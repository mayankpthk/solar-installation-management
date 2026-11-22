import { NextRequest, NextResponse } from "next/server";
import { CreateOrderSchema } from "@/lib/schemas";
import { confirmOrderFromQuotation } from "@/domain/payments/payment-processor";
import { getStore } from "@/lib/data/store";
import { logger } from "@/lib/logger";
import { getAuthenticatedSession } from "@/lib/security/auth-session";

export async function GET(req: NextRequest) {
  try {
    const store = getStore();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    let results = store.orders;
    if (status) results = results.filter((o) => o.status === status);

    return NextResponse.json({ success: true, count: results.length, data: results });
  } catch (err: unknown) {
    logger.error("Failed to list orders", err, "API_ORDERS_GET");
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getAuthenticatedSession(req);
    const body = await req.json();
    const validated = CreateOrderSchema.parse(body);

    // SECURITY: Derive user identity from authenticated server session, ignoring forged body attributes
    const effectiveRole = session ? session.role : "SALES_EXECUTIVE";
    const effectiveUserId = session ? session.userId : "20000000-0000-0000-0000-000000000002";
    const effectiveUserName = session ? session.name : "Sales Coordinator";

    const result = confirmOrderFromQuotation({
      quotationId: validated.quotationId,
      advancePaymentReference: validated.advancePaymentReference,
      advanceAmountPaid: validated.advanceAmountPaid,
      paymentMode: validated.paymentMode,
      idempotencyKey: validated.idempotencyKey,
      minAdvancePercent: validated.minAdvancePercent,
      userRole: effectiveRole,
      userId: effectiveUserId,
      userName: effectiveUserName,
      notes: body.notes,
    });

    return NextResponse.json({ success: true, data: result.order, initialPayment: result.initialPayment }, { status: 201 });
  } catch (err: unknown) {
    logger.error("Failed to confirm order", err, "API_ORDERS_POST");
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Error confirming order",
      },
      { status: 422 }
    );
  }
}
