export interface BudgetLine {
  plannedAmount: number;
  actualAmount: number;
}

/** actual − planned. Positive means over budget, negative means under budget. */
export function variance(plannedAmount: number, actualAmount: number): number {
  return actualAmount - plannedAmount;
}

/** True when actual spend has exceeded the planned amount. */
export function isOverBudget(plannedAmount: number, actualAmount: number): boolean {
  return actualAmount > plannedAmount;
}

/**
 * Fraction of the planned amount that has been spent (e.g. 0.5 = 50%).
 * Returns 0 when nothing is planned, to avoid division by zero.
 */
export function utilization(plannedAmount: number, actualAmount: number): number {
  if (plannedAmount <= 0) return 0;
  return actualAmount / plannedAmount;
}

/** Roll a set of budget lines up into planned/actual totals and their variance. */
export function summarizeBudgetItems(items: BudgetLine[]): {
  totalPlanned: number;
  totalActual: number;
  variance: number;
  overBudget: boolean;
} {
  const totalPlanned = items.reduce((sum, i) => sum + i.plannedAmount, 0);
  const totalActual = items.reduce((sum, i) => sum + i.actualAmount, 0);
  return {
    totalPlanned,
    totalActual,
    variance: variance(totalPlanned, totalActual),
    overBudget: isOverBudget(totalPlanned, totalActual),
  };
}
