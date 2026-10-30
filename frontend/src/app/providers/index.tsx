"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

import { Toaster } from "@/shared/ui/sonner";

import { StoreProvider } from "./store-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <StoreProvider>
        {children}
        <Toaster richColors position="top-right" />
      </StoreProvider>
    </ThemeProvider>
  );
}
