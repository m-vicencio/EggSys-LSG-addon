"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MonthPicker } from "@/components/ui/MonthPicker";
import { MonthYearLabel } from "@/components/ui/MonthYearLabel";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { accountsApi } from "@/lib/api";
import { transactionsApi } from "@/lib/api/transactions";
import { useAccountStore } from "@/store/accountStore";

import { useAccounts } from "@/views/core/dashboard/hooks/useAccounts";
import { useTransactions } from "@/views/core/dashboard/hooks/useTransactions";
import { useTransfers } from "@/views/core/dashboard/hooks/useTransfers";
import type { Transaction } from "@/views/core/dashboard/interfaces/dashboard";

import { StandardDashboard } from "./components/personal-view/PersonalDashboard";
import { PetDashboard } from "./components/pet-view/PetDashboard";

import { AccountSelector } from "./components/shared/AccountSelector";
import { AddTransactionPopover } from "./components/shared/AddTransactionPopover";
import { TransactionSheet } from "./components/shared/TransactionSheet";
import { TransferSheet } from "./components/shared/TransferSheet";

export function DashboardView() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetType, setSheetType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [sheetDefaultAccountId, setSheetDefaultAccountId] = useState<
    string | null
  >(null);
  const [transferSheetOpen, setTransferSheetOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const { status } = useSession();

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [calendarOpen, setCalendarOpen] = useState(false);

  const [year, month] = selectedMonth.split("-").map(Number);
  const calendarYear = year;
  const calendarMonth = month - 1;

  const {
    accounts,
    selectedAccountId,
    setSelectedAccountId,
    isLoading: loadingAccounts,
  } = useAccounts();

  const queryClient = useQueryClient();
  const setAccounts = useAccountStore((s) => s.setAccounts);
  const adjustBalance = useAccountStore((s) => s.adjustBalance);

  const setDefaultMutation = useMutation({
    mutationFn: (id: string | null) =>
      id ? accountsApi.setDefault(id) : accountsApi.unsetDefault(),
    onMutate: (id: string | null) => {
      if (id) {
        setAccounts(accounts.map((a) => ({ ...a, isDefault: a.id === id })));
      } else {
        setAccounts(accounts.map((a) => ({ ...a, isDefault: false })));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });

  const {
    transactions,
    isLoading: loadingTx,
    income,
    expenses,
    chartData: expensesByCategory,
  } = useTransactions(selectedAccountId, selectedMonth);

  const { transfers } = useTransfers(selectedAccountId);

  const handleEdit = async (tx: Transaction) => {
    try {
      const fullTx = await transactionsApi.getById(tx.id);
      setEditTx({
        ...fullTx,
        categoryId: fullTx.categoryId ?? tx.categoryId,
        accountId: fullTx.accountId ?? tx.accountId,
        tags: Array.isArray(fullTx.tags) ? fullTx.tags : [],
        comment: fullTx.comment ?? "",
      });
    } catch {
      setEditTx({
        ...tx,
        tags: Array.isArray(tx.tags) ? tx.tags : [],
        comment: tx.comment ?? "",
      });
    }
    setSheetOpen(true);
  };

  const handleOpenTransactionSheet = (
    type: "EXPENSE" | "INCOME",
    originAccountId?: string | null,
  ) => {
    setEditTx(null);
    setSheetType(type);
    setSheetDefaultAccountId(originAccountId ?? null);
    setSheetOpen(true);
  };

  const handleDelete = async (tx: Transaction) => {
    try {
      await transactionsApi.delete(tx.id);

      const amount = Number(tx.amount) || 0;
      const delta = tx.type === "INCOME" ? -amount : amount;
      adjustBalance(tx.accountId, delta);

      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["pet", tx.accountId] });

      if (editTx?.id === tx.id) {
        setSheetOpen(false);
        setEditTx(null);
      }

      toast.success("Transacción eliminada");
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? (error as { message?: string }).message
          : "Error al eliminar la transacción";
      toast.error(message);
    }
  };

  useEffect(() => {
    const handler = () => setTransferSheetOpen(true);
    window.addEventListener("openTransferSheet", handler);
    return () => window.removeEventListener("openTransferSheet", handler);
  }, []);

  if (status === "loading" || loadingAccounts) {
    return (
      <div className="flex min-h-screen items-center justify-center flex-col gap-2">
        <Loader2Icon className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">
          Cargando tus finanzas...
        </p>
      </div>
    );
  }

  return (
    <>
      <Tabs
        value={selectedAccountId ?? ""}
        onValueChange={setSelectedAccountId}
      >
        <div className="flex flex-col gap-2 mb-3">
          <div className="w-full">
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-center">
                  <MonthYearLabel year={calendarYear} month={calendarMonth} />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="p-0">
                <MonthPicker
                  year={calendarYear}
                  month={calendarMonth}
                  onChange={(newYear, newMonth) => {
                    const formattedMonth = String(newMonth + 1).padStart(
                      2,
                      "0",
                    );
                    setSelectedMonth(`${newYear}-${formattedMonth}`);
                    setCalendarOpen(false);
                  }}
                  onCurrentMonth={() => {
                    const now = new Date();
                    const formattedMonth = String(now.getMonth() + 1).padStart(
                      2,
                      "0",
                    );
                    setSelectedMonth(`${now.getFullYear()}-${formattedMonth}`);
                    setCalendarOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="w-full">
            <AccountSelector
              accounts={accounts}
              selectedAccountId={selectedAccountId}
              onSelect={setSelectedAccountId}
              onSetDefault={(id) => setDefaultMutation.mutateAsync(id)}
            />
          </div>
        </div>

        {accounts.map((acc) => (
          <TabsContent key={acc.id} value={acc.id} className="mt-0">
            {acc.isSavings ? (
              <PetDashboard
                account={acc}
                transactions={transactions}
                transfers={transfers}
                isLoading={loadingTx}
                selectedMonth={selectedMonth}
                onAddTransaction={handleOpenTransactionSheet}
                onEditTransaction={handleEdit}
                onDeleteTransaction={handleDelete}
              />
            ) : (
              <StandardDashboard
                account={acc}
                income={income}
                expenses={expenses}
                chartData={expensesByCategory}
                transactions={transactions}
                transfers={transfers}
                isLoading={loadingTx}
                selectedMonth={selectedMonth}
                onAddTransaction={handleOpenTransactionSheet}
                onEditTransaction={handleEdit}
                onDeleteTransaction={handleDelete}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>

      <TransactionSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setSheetDefaultAccountId(null);
        }}
        accounts={accounts}
        defaultAccountId={sheetDefaultAccountId ?? selectedAccountId ?? null}
        onSuccess={() => setEditTx(null)}
        transaction={editTx ?? undefined}
        forcedType={editTx ? undefined : sheetType}
      />
      <TransferSheet
        open={transferSheetOpen}
        onOpenChange={setTransferSheetOpen}
        accounts={accounts}
        defaultAccountId={selectedAccountId ?? null}
        onSuccess={() => {}}
      />

      <AddTransactionPopover
        currentAccountId={selectedAccountId}
        onAddTransaction={(type, originAccountId) =>
          handleOpenTransactionSheet(type, originAccountId ?? selectedAccountId)
        }
        onTransfer={() => setTransferSheetOpen(true)}
      />
    </>
  );
}
