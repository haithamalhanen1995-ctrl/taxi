// ============================================================================
// TAKSATI CUSTOMER E-WALLET & QI / RAFIDAIN MASTER CARD STORE (BRIDGED)
// ============================================================================

import {
  getUserWalletBalance,
  getUserWalletTransactions,
  topUpCustomerWalletUnified,
  deductCustomerWalletUnified,
  WalletTransaction as UnifiedTx,
} from './unifiedWalletStore';

export interface WalletTransaction {
  id: string;
  type: 'topup' | 'ride_payment' | 'food_payment';
  amount: number; // IQD
  title: string;
  date: string;
  paymentMethod?: 'qi_rafidain' | 'mastercard' | 'wallet';
  cardNumberOrBarcode?: string;
}

/**
 * Get customer E-Wallet balance
 */
export function getCustomerWalletBalance(customerId?: string): number {
  return getUserWalletBalance(customerId || 'user-seed-1', 'customer');
}

/**
 * Get customer E-Wallet transaction history
 */
export function getCustomerWalletTransactions(customerId?: string): WalletTransaction[] {
  const txs = getUserWalletTransactions(customerId || 'user-seed-1');
  return txs.map((t) => ({
    id: t.id,
    type: (t.type === 'topup' ? 'topup' : t.type === 'food_payment' ? 'food_payment' : 'ride_payment') as any,
    amount: Math.abs(t.amount),
    title: t.title,
    date: t.date,
    paymentMethod: t.paymentMethod as any,
    cardNumberOrBarcode: t.cardNumberOrBarcode,
  }));
}

/**
 * Top up E-Wallet via Qi Card / Rafidain Master Card
 */
export function topUpCustomerWallet(params: {
  customerId?: string;
  amount: number;
  paymentMethod: 'qi_rafidain' | 'mastercard';
  cardNumberOrBarcode: string;
}): { newBalance: number; tx: WalletTransaction } {
  const id = params.customerId || 'user-seed-1';
  const res = topUpCustomerWalletUnified({
    userId: id,
    userName: id,
    amount: params.amount,
    paymentMethod: params.paymentMethod,
    cardNumberOrBarcode: params.cardNumberOrBarcode,
  });

  const tx: WalletTransaction = {
    id: res.tx.id,
    type: 'topup',
    amount: res.tx.amount,
    title: res.tx.title,
    date: res.tx.date,
    paymentMethod: params.paymentMethod,
    cardNumberOrBarcode: params.cardNumberOrBarcode,
  };

  return { newBalance: res.newBalance, tx };
}

/**
 * Deduct amount from customer E-Wallet
 */
export function deductCustomerWallet(params: {
  customerId?: string;
  amount: number;
  title: string;
  type?: 'ride_payment' | 'food_payment';
}): { success: boolean; newBalance: number; errorMsg?: string } {
  const id = params.customerId || 'user-seed-1';
  return deductCustomerWalletUnified({
    userId: id,
    userName: id,
    amount: params.amount,
    title: params.title,
    type: params.type,
  });
}
