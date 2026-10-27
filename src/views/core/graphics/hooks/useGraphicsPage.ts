import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { graphicsApi } from "@/lib/api";
import { useAccounts } from "@/views/core/dashboard/hooks/useAccounts";

export function useGraphicsPage() {
  const now = new Date();
  const { accounts, isLoading: isLoadingAccounts } = useAccounts();

  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [date, setDate] = useState(now);

  const calendarYear = date.getFullYear();
  const calendarMonth = date.getMonth();

  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current && accounts.length > 0) {
      initialized.current = true;
      const def = accounts.find((a) => a.isDefault) ?? accounts[0];
      if (def) setSelectedAccountId(def.id);
    }
  }, [accounts]);

  const isCurrentMonth =
    calendarYear === now.getFullYear() && calendarMonth === now.getMonth();

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  // AQUÍ ESTÁ LA MAGIA CORREGIDA
  const {
    data: dailySummary = [],
    isLoading: isLoadingDailySummary,
    isError: isErrorDailySummary,
  } = useQuery({
    queryKey: [
      "cumulativeSpend", // <-- Cambiamos la key para no chocar la caché
      selectedAccountId,
      calendarMonth,
      calendarYear,
    ],
    queryFn: () =>
      graphicsApi.getCumulativeSpend(
        // <-- Llamamos al endpoint correcto
        selectedAccountId || undefined,
        // react-query stores month as 0-based in this hook; API expects 1-12
        calendarMonth + 1,
        calendarYear,
      ),
    enabled: !!selectedAccountId && !isLoadingAccounts,
  });

  // Lógica de cambio de mes
  const handleMonthChange = (newDate: Date) => {
    setDate(newDate);
    setCalendarOpen(false);
  };

  const handleCurrentMonth = () => {
    setDate(new Date());
  };

  // Lógica de cambio de cuenta
  const handleAccountChange = (accountId: string) => {
    setSelectedAccountId(accountId);
  };

  return {
    // Estado y manejadores para el header
    accounts,
    isLoadingAccounts,
    selectedAccountId,
    handleAccountChange,
    calendarOpen,
    setCalendarOpen,
    date,
    calendarYear,
    calendarMonth,
    isCurrentMonth,
    handleMonthChange,
    handleCurrentMonth,
    selectedAccount,

    // Datos para los gráficos
    dailySummary,
    isLoadingDailySummary,
    isErrorDailySummary,
  };
}
