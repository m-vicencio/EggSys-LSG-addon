"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useAppStore } from "@/store/useAppStore";

export function NetworkStatus() {
  const setIsOnline = useAppStore((state) => state.setIsOnline);

  useEffect(() => {
    const handleOffline = () => {
      toast.error("Estás sin conexión a internet", {
        description:
          "Algunas funciones de EggSys podrían no estar disponibles.",
        duration: Infinity,
        id: "offline-toast",
      });
      setIsOnline(false);
    };

    const handleOnline = () => {
      toast.dismiss("offline-toast");
      toast.success("¡Conexión recuperada!", {
        description: "Todo ha vuelto a la normalidad.",
        duration: 3000,
      });
      setIsOnline(true);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [setIsOnline]);

  return null; // No renderiza nada visual, solo maneja la lógica
}
