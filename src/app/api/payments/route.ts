import { NextRequest, NextResponse } from "next/server";
import { ProcessPaymentSchema } from "@/lib/schemas";
import { processPayment } from "@/domain/payments/payment-processor";
import { getStore } from "@/lib/data/store";
import { logger } from "@/lib/logger";
import { getAuthenticatedSession } from "@/lib/security/auth-session";

export async function GET(req: NextRequest) {
  try {
    const store = getStore();
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");

    let results = store.payments;
    if (orderId) results = results.filter((p) => p.order_id === orderId);

    return NextResponse.json({ success: true, count: results.length, data: results });
  } catch (err: unknown) {
    logger.error("Failed to list payments", err, "API_PAYMENTS_GET");
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getAuthenticatedSession(req);
    const body = await req.json();
    const validated = ProcessPaymentSchema.parse(body);

    // SECURITY: Client-supplied roles in the request body are NEVER trusted.
    // The role is derived strictly from the server-validated session.
    // If an unauthenticated customer initiates an online booking payment, their role is strictly CUSTOMER.
    const effectiveRole = session ? session.role : "CUSTOMER";
    const effectiveVerifier = session ? session.name : (validated.isSimulated ? "customer_gateway_checkout" : undefined);

    const payment = processPayment({
      orderId: validated.orderId,
      amount: validated.amount,
      milestone: validated.milestone,
      paymentMode: validated.paymentMode,
      paymentReferenceCode: validated.paymentReferenceCode,
      idempotencyKey: validated.idempotencyKey,
      isSimulated: validated.isSimulated,
      notes: validated.notes,
      userRole: effectiveRole,
      verifiedBy: effectiveVerifier,
    });

    return NextResponse.json({
      success: true,
      data: payment,
      receiptNumber: payment.receipt_number,
      message: `Payment of ₹${payment.amount.toLocaleString("en-IN")} confirmed against receipt ${payment.receipt_number}.`,
    }, { status: 201 });
  } catch (err: unknown) {
    logger.error("Payment processing failed", err, "API_PAYMENTS_POST");
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Error processing payment",
      },
      { status: 422 }
    );
  }
}
