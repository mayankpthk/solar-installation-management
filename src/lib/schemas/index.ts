import { z } from "zod";

export const CreateLeadSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100),
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, "Valid 10-15 digit phone number required"),
  alternatePhone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().min(5, "Address must be at least 5 characters"),
  city: z.string().min(2).default("Jalandhar"),
  state: z.string().min(2).default("Punjab"),
  pincode: z.string().regex(/^\d{6}$/, "Must be valid 6-digit PIN code").default("144001"),
  monthlyBillAmount: z.number().positive().optional(),
  interestedCapacityKw: z.number().min(1).max(50).default(3.0),
  systemTopology: z.enum(["ON_GRID", "OFF_GRID", "HYBRID"]).default("ON_GRID"),
  roofAvailability: z.enum(["AVAILABLE", "UNDER_CONSTRUCTION", "SHARED", "SHADED", "OTHER"]).default("AVAILABLE").or(z.string()),
  isSubsidyRequested: z.boolean().default(true),
  additionalRequirements: z.string().optional(),
  source: z.enum(["WEB_FORM", "WHATSAPP", "PHONE_INQUIRY", "WALK_IN"]).default("WEB_FORM"),
  notes: z.string().optional(),
});

export const QualifyLeadSchema = z.object({
  monthlyBillAmount: z.number().positive(),
  avgMonthlyConsumptionKwh: z.number().positive().optional(),
  shadowFreeAreaSqft: z.number().positive(),
  sanctionedLoadKw: z.number().positive(),
  gridConnectionType: z.enum(["SINGLE_PHASE", "THREE_PHASE"]).default("SINGLE_PHASE"),
  discomName: z.string().min(2),
  notes: z.string().optional(),
});

export const AssignSalespersonSchema = z.object({
  leadId: z.string(),
  salespersonId: z.string(),
  salespersonName: z.string(),
  followUpDate: z.string().optional(),
  notes: z.string().optional(),
});

export const ScheduleFollowUpSchema = z.object({
  leadId: z.string(),
  followUpDate: z.string(),
  notes: z.string().min(2, "Notes required for scheduling follow-up"),
});

export const ScheduleSurveySchema = z.object({
  leadId: z.string(),
  assignedTechnicianId: z.string(),
  assignedTechnicianName: z.string().optional(),
  scheduledDate: z.string(),
  notes: z.string().optional(),
});

export const SubmitSurveySchema = z.object({
  roofAzimuthDirection: z.enum(["NORTH", "SOUTH", "EAST", "WEST", "SOUTH_EAST", "SOUTH_WEST"]).or(z.string()),
  roofTiltAngleDeg: z.number().min(0).max(90),
  roofAreaSqft: z.number().positive().optional(),
  usableAreaSqft: z.number().positive(),
  shadowFreeAreaSqft: z.number().positive().optional(),
  roofType: z.enum(["RCC_FLAT", "TIN_SHED", "TILED", "GROUND_MOUNT"]).or(z.string()),
  structuralIntegrity: z.enum(["EXCELLENT", "ACCEPTABLE", "REINFORCEMENT_REQUIRED", "UNSUITABLE", "SOUND", "COMPROMISED"]).or(z.string()),
  structuralObservations: z.string().optional(),
  shadowObstaclesNotes: z.string().optional(),
  dcCableDistanceMeters: z.number().positive("DC cable run required"),
  acCableDistanceMeters: z.number().positive("AC cable run required").default(10),
  electricalConnectionDetails: z.string().optional(),
  gridSuitability: z.string().optional(),
  sanctionedLoadKw: z.number().positive().optional(),
  technicianNotes: z.string().optional(),
  recommendedCapacityKw: z.number().min(1).max(50),
  recommendedTopology: z.enum(["ON_GRID", "OFF_GRID", "HYBRID"]),
  photoUrls: z.array(z.string()).min(1, "At least 1 survey photograph is required"),
  feasibilityStatus: z.enum(["APPROVED", "REJECTED", "REQUIRES_REASSESSMENT"]).default("APPROVED"),
});

export const ReviewSurveySchema = z.object({
  surveyId: z.string(),
  outcome: z.enum(["APPROVED", "REJECTED", "REQUIRES_REASSESSMENT"]),
  reviewComments: z.string().min(3, "Review comments required"),
  reviewedBy: z.string(),
  reviewerRole: z.string(),
});

export const AdminOverrideSurveyGateSchema = z.object({
  surveyId: z.string(),
  quotationId: z.string().optional(),
  reason: z.string().min(10, "A documented justification of at least 10 characters is required for an administrative override"),
  adminRole: z.string(),
  adminName: z.string(),
});

export const GenerateQuotationSchema = z.object({
  leadId: z.string().min(1, "Lead ID required"),
  surveyId: z.string().min(1, "Survey ID required"),
  systemCapacityKw: z.number().min(1).max(50),
  systemTopology: z.enum(["ON_GRID", "OFF_GRID", "HYBRID"]),
  discountAmount: z.number().min(0).default(0),
  adminOverrideReason: z.string().optional(),
});

export const ReviseQuotationSchema = z.object({
  quotationId: z.string().min(1, "Quotation ID required"),
  amendmentReason: z.string().min(5, "Amendment justification required"),
  modifiedCapacityKw: z.number().min(1).max(50).optional(),
  modifiedDiscountAmount: z.number().min(0).optional(),
});

export const AcceptQuotationSchema = z.object({
  quotationIdOrToken: z.string().min(1, "Quotation reference required"),
  customerName: z.string().min(2, "Name required"),
  customerNotes: z.string().optional(),
});

export const CreateOrderSchema = z.object({
  quotationId: z.string().min(1, "Quotation ID required"),
  advancePaymentReference: z.string().min(4, "Bank UTR or transaction ID required").optional(),
  advanceAmountPaid: z.number().min(0).default(0),
  paymentMode: z.enum(["BANK_TRANSFER_NEFT", "UPI", "CHEQUE", "CASH", "ONLINE_GATEWAY"]).default("BANK_TRANSFER_NEFT"),
  idempotencyKey: z.string().min(5, "Idempotency key required"),
  minAdvancePercent: z.number().min(0).max(100).default(20),
});

export const ProcessPaymentSchema = z.object({
  orderId: z.string().min(1, "Order ID required"),
  amount: z.number().positive("Payment amount must be greater than zero"),
  milestone: z.enum(["BOOKING_ADVANCE", "PRE_DISPATCH", "DELIVERY_PROGRESS", "POST_INSTALLATION_BALANCE", "FULL_PAYMENT", "SERVICE_FEE"]),
  paymentMode: z.enum(["BANK_TRANSFER_NEFT", "UPI", "CHEQUE", "CASH", "ONLINE_GATEWAY"]),
  paymentReferenceCode: z.string().min(4, "Valid payment reference or bank UTR required"),
  idempotencyKey: z.string().optional(),
  isSimulated: z.boolean().default(false),
  notes: z.string().optional(),
});

export const ProcessRefundSchema = z.object({
  paymentId: z.string().min(1, "Payment ID required"),
  amount: z.number().positive("Refund amount must be positive"),
  reason: z.string().min(5, "Reason for refund is mandatory"),
});

export const ConfigureRecipeSchema = z.object({
  recipeId: z.string().min(1),
  defaultQuantity: z.number().min(0),
  isMandatory: z.boolean().default(true),
  notes: z.string().optional(),
});

export const ScanDispatchSerialSchema = z.object({
  dispatchId: z.string().uuid(),
  serialNumber: z.string().min(3, "Serial number required"),
});

export const CreateTicketSchema = z.object({
  orderId: z.string().uuid(),
  serialNumber: z.string().min(3),
  reportedFaultCode: z.string().optional(),
  symptomDescription: z.string().min(10, "Please describe the breakdown symptom in detail"),
});

export type CreateLeadInput = z.infer<typeof CreateLeadSchema>;
export type QualifyLeadInput = z.infer<typeof QualifyLeadSchema>;
export type SubmitSurveyInput = z.infer<typeof SubmitSurveySchema>;
export type GenerateQuotationInput = z.infer<typeof GenerateQuotationSchema>;
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type ScanDispatchSerialInput = z.infer<typeof ScanDispatchSerialSchema>;
export type CreateTicketInput = z.infer<typeof CreateTicketSchema>;
