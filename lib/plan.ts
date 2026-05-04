import { Plan, PlanType } from "@/types/traffic";

export const PLANS: Record<PlanType, Plan> = {
  FREE: { type: "FREE", locationLimit: 2 },
  PRO: { type: "PRO", locationLimit: 10 },
};

export function canAddDestination(currentCount: number, plan: Plan) {
  return currentCount < plan.locationLimit;
}
