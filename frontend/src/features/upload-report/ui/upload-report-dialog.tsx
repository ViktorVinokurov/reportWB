"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, UploadIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { OwnerSelect } from "@/entities/owner";
import { getApiErrorMessage, getApiFieldErrors } from "@/shared/api";
import { formatIsoDate } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

import { useUploadReportMutation } from "../api/upload-report-api";
import { uploadReportSchema, type UploadReportValues } from "../model/schema";
import { FileDropzone } from "./file-dropzone";

/** Имена полей DRF → имена полей формы. */
const SERVER_FIELDS: Record<string, keyof UploadReportValues> = {
  owner_id: "ownerId",
  files: "files",
  report_date: "reportDate",
  advertising: "advertising",
  storage: "storage",
};

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

/** defaultOwnerId — ИП, который подставляется в форму при открытии. */
export function UploadReportDialog({ defaultOwnerId }: { defaultOwnerId?: string }) {
  const [open, setOpen] = useState(false);
  const [uploadReport, { isLoading }] = useUploadReportMutation();
  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<UploadReportValues>({ resolver: zodResolver(uploadReportSchema) });

  const onSubmit = async (values: UploadReportValues) => {
    const result = await uploadReport(values);
    if ("error" in result) {
      const fieldErrors = Object.entries(getApiFieldErrors(result.error));
      for (const [field, message] of fieldErrors) {
        const formField = SERVER_FIELDS[field];
        if (formField) setError(formField, { message });
      }
      if (!fieldErrors.some(([field]) => field in SERVER_FIELDS)) {
        toast.error(getApiErrorMessage(result.error));
      }
      return;
    }
    toast.success(`Отчёт на ${formatIsoDate(values.reportDate)} загружен`);
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) reset({ ownerId: defaultOwnerId });
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button aria-label="Загрузить отчёт" className="max-md:w-9 max-md:has-[>svg]:px-0">
          <UploadIcon /> <span className="max-md:hidden">Загрузить отчёт</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Загрузка отчёта</DialogTitle>
            <DialogDescription>
              Еженедельный детализированный отчёт Wildberries. Если WB разбил отчёт на несколько
              файлов, добавьте их все — они объединятся в один отчёт. Если у ИП уже есть отчёт на
              эту дату, он будет заменён.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="report-owner">ИП</Label>
            <Controller
              control={control}
              name="ownerId"
              render={({ field }) => (
                <OwnerSelect
                  id="report-owner"
                  value={field.value}
                  onValueChange={field.onChange}
                  invalid={Boolean(errors.ownerId)}
                  className="w-full"
                />
              )}
            />
            <FieldError message={errors.ownerId?.message} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="report-files">Файлы отчёта</Label>
            <Controller
              control={control}
              name="files"
              render={({ field }) => (
                <FileDropzone
                  id="report-files"
                  value={field.value}
                  onChange={field.onChange}
                  invalid={Boolean(errors.files)}
                />
              )}
            />
            <FieldError message={errors.files?.message} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="report-date">Дата отчёта</Label>
            <Input
              id="report-date"
              type="date"
              aria-invalid={Boolean(errors.reportDate)}
              {...register("reportDate")}
            />
            <FieldError message={errors.reportDate?.message} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid content-start gap-2">
              <Label htmlFor="report-advertising">Реклама</Label>
              <Input
                id="report-advertising"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0"
                aria-invalid={Boolean(errors.advertising)}
                {...register("advertising", { valueAsNumber: true })}
              />
              <FieldError message={errors.advertising?.message} />
            </div>
            <div className="grid content-start gap-2">
              <Label htmlFor="report-storage">Хранение</Label>
              <Input
                id="report-storage"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0"
                aria-invalid={Boolean(errors.storage)}
                {...register("storage", { valueAsNumber: true })}
              />
              <FieldError message={errors.storage?.message} />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Отмена
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2Icon className="animate-spin" />}
              Загрузить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
