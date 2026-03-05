import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface ApprovalStep {
  approver_role: AppRole;
  sequence_order: number;
  is_active: boolean;
}

export function getApprovalChain(amount: number): ApprovalStep[] {
  if (amount < 1000) {
    return [{ approver_role: "accounts", sequence_order: 1, is_active: true }];
  }
  if (amount <= 10000) {
    return [
      { approver_role: "accounts", sequence_order: 1, is_active: true },
      { approver_role: "manager", sequence_order: 2, is_active: false },
    ];
  }
  return [
    { approver_role: "accounts", sequence_order: 1, is_active: true },
    { approver_role: "manager", sequence_order: 2, is_active: false },
    { approver_role: "md", sequence_order: 3, is_active: false },
  ];
}

export function getApprovalThresholdLabel(amount: number): string {
  if (amount < 1000) return "Accounts Only";
  if (amount <= 10000) return "Accounts → Manager";
  return "Accounts → Manager → MD";
}
