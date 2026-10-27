export interface AppAccount {
  id: string;
  name: string;
  balance: number;
  currency: string;
  isSavings: boolean;
  savingGoal?: number;
  isDefault: boolean;
}
export interface Transaction {
  id: string;
  name: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  date: string;
  createdAt?: string;
  category: Category;
  accountId: string;
  categoryId: string;
  tags: string[];
  comment?: string;
}
export interface Category {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  iconName?: string | null;
  color?: string | null;
  isActive?: boolean;
  isDefault?: boolean;
  userId?: string | null;
}

export interface Budget {
  id: string;
  name: string;
  categoryId: string;
  accountId: string;
  idealAmount: number;
  currency?: string;
  category?: Category;
}

export interface Spent {
  categoryId: string;
  amount: number;
}

export interface Transfer {
  id: string;
  amount: number;
  date: string;
  comment?: string;
  fromAccountId: string;
  toAccountId: string;
  fromAccount: { id: string; name: string };
  toAccount: { id: string; name: string };
  userId: string;
  createdAt: string;
}

export type AccountDraft = {
  uid?: string;
  name: string;
  balance: string;
  currency: string;
  isSavings?: boolean;
  savingGoal?: string;
};

export type Step = "welcome" | "accounts" | "done";

export interface CategoryPieData {
  name: string;
  value: number;
  fill?: string;
}

export interface DashboardPieChartProps {
  data: CategoryPieData[];
  saldo: string;
  ingresos: string;
  gastos: string;
  saldoValue: number;
  ingresosValue: number;
  gastosValue: number;
}
