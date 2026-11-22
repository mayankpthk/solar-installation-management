import { NextRequest, NextResponse } from "next/server";
import { ProcessRefundSchema } from "@/lib/schemas";
import { processRefund } from "@/domain/payments/payment-processor";
import { getStore } from "@/lib/data/store";
import { logger } from "@/lib/logger";
import { getAuthenticatedSession, requireRole } from "@/lib/security/auth-session";

export async function GET(req: NextRequest) {
  try {
    const store = getStore();
    return NextResponse.json({ success: true, count: store.refunds.length, data: store.refunds });
  } catch (err: unknown) {
    logger.error("Failed to list refunds", err, "API_REFUNDS_GET");
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // SECURITY: Strictly enforce authenticated role verification for financial outflows
    const session = getAuthenticatedSession(req);
    const user = requireRole(session, ["FINANCE_MANAGER", "DIRECTOR", "SUPER_ADMIN"]);

    const body = await req.json();
    const validated = ProcessRefundSchema.parse(body);

    const refund = processRefund({
      paymentId: validated.paymentId,
      amount: validated.amount,
      reason: validated.reason,
      processedBy: user.name,
      userRole: user.role,
    });

    return NextResponse.json({
      success: true,
      data: refund,
      message: `Refund of ₹${refund.amount.toLocaleString("en-IN")} processed under reference ${refund.refund_reference}.`,
    }, { status: 201 });
  } catch (err: unknown) {
    logger.error("Refund processing failed", err, "API_REFUNDS_POST");
    const isAuthError = err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError");
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Error processing refund",
      },
      { status: isAuthError ? 403 : 422 }
    );
  }
}
