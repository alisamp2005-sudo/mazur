import { useState } from "react";

export interface Toast {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}

export function useToast() {
  const [, setToasts] = useState<Toast[]>([]);

  const toast = (props: Toast) => {
    setToasts((prev) => [...prev, props]);
    // Simple console log for now
    console.log(`[Toast] ${props.title}:`, props.description);
  };

  return { toast };
}
