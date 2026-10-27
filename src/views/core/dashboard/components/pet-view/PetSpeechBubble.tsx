"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface PetSpeechBubbleProps {
  message: string;
  isVisible: boolean;
}

export function PetSpeechBubble({ message, isVisible }: PetSpeechBubbleProps) {
  const [renderMessage, setRenderMessage] = useState(message);

  useEffect(() => {
    if (isVisible) {
      setRenderMessage(message);
    }
  }, [isVisible, message]);

  return (
    <div
      className={cn(
        "absolute bottom-full mb-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none transition-all duration-300 ease-in-out origin-bottom",
        isVisible
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 translate-y-2 scale-95",
      )}
    >
      <div className="bg-background border border-border text-foreground text-xs font-medium px-3 py-2 rounded-2xl shadow-lg w-max max-w-50 text-center relative wrap-break-word">
        {renderMessage}
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-background border-b border-r border-border rotate-45"></div>
      </div>
    </div>
  );
}
