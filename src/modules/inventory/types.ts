export type StockMovementType =
  | 'receipt'
  | 'issue'
  | 'transfer'
  | 'adjustment'
  | 'return';

export const STOCK_MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  receipt: 'Receipt',
  issue: 'Issue',
  transfer: 'Transfer',
  adjustment: 'Adjustment',
  return: 'Return',
};

export const STOCK_MOVEMENT_TYPE_COLORS: Record<StockMovementType, string> = {
  receipt: 'green',
  issue: 'red',
  transfer: 'blue',
  adjustment: 'orange',
  return: 'purple',
};
