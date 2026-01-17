export type SubsidySlug = "huurtoeslag" | "zorgtoeslag" | "kgb" | "kot";

export type SubsidyStatus =
  | "draft"
  | "eligible_checked"
  | "paid"
  | "waiting_user"
  | "under_review"
  | "submitted"
  | "decision"
  | "done"
  | "cancelled";

import type { BenefitEstimate } from "./calculators/types";

export type EligibilityResult = {
  eligible: boolean;
  reasons: string[];
  blockingReasons: string[];
  benefitEstimate?: BenefitEstimate;
};

export type SubsidyApplication = {
  id: string;
  userId: string;
  slug: SubsidySlug;
  status: SubsidyStatus;
  eligibilitySnapshot: EligibilityResult | null;
  intakeData: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  paidAt?: string | null;
  stripeCheckoutSessionId?: string | null;
  stripePaymentIntentId?: string | null;
};

export type SubsidyDocumentStatus = "missing" | "uploaded" | "approved" | "rejected";

export type SubsidyDocument = {
  id: string;
  applicationId: string;
  docKey: string;
  filePath: string | null;
  status: SubsidyDocumentStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SubsidyAdminNote = {
  id: string;
  applicationId: string;
  authorUserId: string;
  message: string;
  createdAt: string;
};
