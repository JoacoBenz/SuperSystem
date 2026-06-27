export type TransactionType = 'credit' | 'debit';

/**
 * Signed effect of a transaction on an account balance.
 * Credits increase the balance, debits decrease it.
 */
export function transactionDelta(amount: number, type: TransactionType): number {
  return type === 'credit' ? amount : -amount;
}

/** Balance after applying a transaction. */
export function applyTransaction(balance: number, amount: number, type: TransactionType): number {
  return balance + transactionDelta(amount, type);
}

/** Balance after reversing a previously-applied transaction (e.g. on delete/void). */
export function reverseTransaction(balance: number, amount: number, type: TransactionType): number {
  return balance - transactionDelta(amount, type);
}
