"use client";

import { ImportWbReportDialog } from "@/features/import-wb-report";
import { useSelectedOwnerId } from "@/features/select-owner";
import { ThemeToggle } from "@/features/toggle-theme";
import { UploadReportDialog } from "@/features/upload-report";

import { SettingsMenu } from "./settings-menu";

export function AppHeader() {
  const ownerId = useSelectedOwnerId();

  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between gap-4 px-4 sm:px-6">
        <h1 className="text-lg font-semibold">Сводный отчёт WB</h1>
        <div className="flex items-center gap-2">
          <ImportWbReportDialog defaultOwnerId={ownerId} />
          <UploadReportDialog defaultOwnerId={ownerId} />
          <ThemeToggle />
          <SettingsMenu ownerId={ownerId} />
        </div>
      </div>
    </header>
  );
}
