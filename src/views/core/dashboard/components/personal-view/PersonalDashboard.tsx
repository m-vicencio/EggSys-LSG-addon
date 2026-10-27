"use client";

import { formatCurrency } from "@/lib/utils";
import type {
  AppAccount,
  CategoryPieData,
  Transaction,
  Transfer,
} from "@/views/core/dashboard/interfaces/dashboard";
import { TransactionList } from "../shared/TransactionList";
import { DashboardPieChart } from "./DashboardPieChart";

interface StandardDashboardProps {
  account: AppAccount;
  income: number;
  expenses: number;
  chartData: CategoryPieData[];
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

export function StandardDashboard({
  account,
  income,
  expenses,
  chartData,
  transactions,
  transfers,
  isLoading,
  selectedMonth,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
}: StandardDashboardProps) {
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
        <DashboardPieChart
          data={chartData}
          saldo={formatCurrency(account.balance, account.currency)}
          ingresos={formatCurrency(income, account.currency)}
          gastos={formatCurrency(expenses, account.currency)}
          saldoValue={account.balance}
          ingresosValue={income}
          gastosValue={expenses}
        />
      </div>
    </div>
  );
}
