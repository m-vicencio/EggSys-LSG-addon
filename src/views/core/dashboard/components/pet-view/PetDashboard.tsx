"use client";

import { formatCurrency } from "@/lib/utils";
import type {
  AppAccount,
  Transaction,
  Transfer,
} from "@/views/core/dashboard/interfaces/dashboard";
import { TransactionList } from "../shared/TransactionList";
import { PetEgg } from "./PetEgg";

interface PetDashboardProps {
  account: AppAccount;
  transactions: Transaction[];
  transfers: Transfer[];
  isLoading: boolean;
  selectedMonth: string;
  onAddTransaction: (
    type: "EXPENSE" | "INCOME",
    originAccountId?: string,
  ) => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (tx: Transaction) => void;
}

export function PetDashboard({
  account,
  transactions,
  transfers,
  isLoading,
  selectedMonth,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
}: PetDashboardProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-500">
      <div className="lg:col-span-7 xl:col-span-8 order-2 lg:order-1 min-w-0">
        <TransactionList
          transactions={transactions}
          transfers={transfers}
          viewingAccountId={account.id}
          isLoading={isLoading}
          onEdit={onEditTransaction}
          onDelete={onDeleteTransaction}
          onCreateFirst={() => onAddTransaction("EXPENSE", account.id)}
          selectedMonth={selectedMonth}
        />
      </div>

      <div className="lg:col-span-5 xl:col-span-4 order-1 lg:order-2 min-w-0 lg:sticky lg:top-6">
        <PetEgg
          account={account}
          saldo={formatCurrency(account.balance, account.currency)}
        />
      </div>
    </div>
  );
}
