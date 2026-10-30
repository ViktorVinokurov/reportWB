"use client";

import { Loader2Icon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/shared/api";
import { formatIsoDate } from "@/shared/lib/format";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";

import { useDeleteReportMutation } from "../api/delete-report-api";

interface DeleteReportButtonProps {
  ownerId: string;
  reportDate: string;
}

export function DeleteReportButton({ ownerId, reportDate }: DeleteReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [deleteReport, { isLoading }] = useDeleteReportMutation();
  const date = formatIsoDate(reportDate);

  const handleDelete = async () => {
    const result = await deleteReport({ ownerId, reportDate });
    if ("error" in result) {
      toast.error(getApiErrorMessage(result.error));
      return;
    }
    toast.success(`Отчёт на ${date} удалён`);
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => !isLoading && setOpen(next)}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-destructive"
          aria-label={`Удалить отчёт на ${date}`}
        >
          <Trash2Icon />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить отчёт на {date}?</AlertDialogTitle>
          <AlertDialogDescription>
            Строка исчезнет из таблицы и графика. Восстановить её можно, только загрузив файл
            заново.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Отмена</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isLoading}
            onClick={(event) => {
              // Не закрываем диалог сразу — ждём ответа сервера.
              event.preventDefault();
              void handleDelete();
            }}
          >
            {isLoading && <Loader2Icon className="animate-spin" />}
            Удалить
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
