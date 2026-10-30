"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CloudDownloadIcon, Loader2Icon } from "lucide-react";
import { useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { OwnerSelect, useGetOwnersQuery } from "@/entities/owner";
import { useGetSummaryQuery } from "@/entities/report";
import { getApiErrorMessage, getApiFieldErrors } from "@/shared/api";
import { formatIsoDate } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
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

import { useImportWbReportMutation } from "../api/import-wb-report-api";
import { importWbReportSchema, type ImportWbReportValues } from "../model/schema";
import {
  addDays,
  FIRST_WEEK,
  lastCompletedWeek,
  reportDateOf,
  WEEKS_PAGE,
  weeksFrom,
} from "../model/weeks";

type WeekValues = ImportWbReportValues["weeks"][number];

const ROW = "grid grid-cols-[1fr_8rem] gap-2";

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

function toWeeks(mondays: string[]): WeekValues[] {
  return mondays.map((dateFrom) => ({ dateFrom, selected: false }));
}

/** «2026-10-19» → «19.10–25.10.2026». */
function formatWeek(monday: string): string {
  return `${formatIsoDate(monday).slice(0, 5)}–${formatIsoDate(addDays(monday, 6))}`;
}

/** defaultOwnerId — ИП, который подставляется в форму при открытии. */
export function ImportWbReportDialog({ defaultOwnerId }: { defaultOwnerId?: string }) {
  const [open, setOpen] = useState(false);
  const { data: owners = [] } = useGetOwnersQuery();
  const [importWbReport, { isLoading }] = useImportWbReportMutation();
  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ImportWbReportValues>({ resolver: zodResolver(importWbReportSchema) });
  const { fields, append } = useFieldArray({ control, name: "weeks" });

  const [ownerId, weeks = []] = useWatch({ control, name: ["ownerId", "weeks"] });
  const owner = owners.find((item) => item.id === ownerId);
  const noToken = owner !== undefined && !owner.has_token;
  // Загруженные недели — те, у которых уже есть отчёт на день после воскресенья.
  const { data: rows = [] } = useGetSummaryQuery(
    { ownerId: ownerId ?? "", names: null },
    { skip: !ownerId },
  );
  const loadedDates = new Set(rows.map((row) => row.report_date));
  const oldestWeek = fields.at(-1)?.dateFrom;
  const canShowMore = oldestWeek !== undefined && oldestWeek > FIRST_WEEK;
  const selectedCount = weeks.filter((week) => week.selected).length;

  const onSubmit = async (values: ImportWbReportValues) => {
    const result = await importWbReport({
      ownerId: values.ownerId,
      weeks: values.weeks
        .filter((week) => week.selected)
        // Пустое поле — реклама из отчёта WB.
        .map(({ dateFrom, advertising }) => ({
          dateFrom,
          advertising: advertising === undefined || Number.isNaN(advertising) ? null : advertising,
        })),
    });
    if ("error" in result) {
      const ownerError = getApiFieldErrors(result.error).owner_id;
      if (ownerError) setError("ownerId", { message: ownerError });
      else toast.error(getApiErrorMessage(result.error));
      return;
    }
    const { reports, missing_weeks: missing } = result.data;
    toast.success(`Загружено отчётов из WB: ${reports.length}`);
    if (missing.length > 0) {
      toast.warning(`В WB нет отчётов за недели: ${missing.map(formatWeek).join(", ")}`);
    }
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          const weeks = toWeeks(weeksFrom(lastCompletedWeek(), WEEKS_PAGE));
          reset({ ownerId: defaultOwnerId, weeks });
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <CloudDownloadIcon /> Загрузить из WB
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Загрузка отчётов из WB</DialogTitle>
            <DialogDescription>
              Еженедельные детализированные отчёты загружаются из WB API по токену ИП. Отчёт за
              неделю сохраняется на следующий после неё день. Если у ИП уже есть отчёт на эту
              дату, он будет заменён. Хранение берётся из отчёта, реклама — тоже (удержания «WB
              Продвижение»), если не ввести её вручную: например, когда рекламу оплачивали
              картой.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="wb-report-owner">ИП</Label>
            <Controller
              control={control}
              name="ownerId"
              render={({ field }) => (
                <OwnerSelect
                  id="wb-report-owner"
                  value={field.value}
                  onValueChange={field.onChange}
                  invalid={Boolean(errors.ownerId) || noToken}
                  className="w-full"
                />
              )}
            />
            <FieldError
              message={
                errors.ownerId?.message ??
                (noToken ? "Сохраните токен WB для этого ИП в настройках" : undefined)
              }
            />
          </div>

          <div className="grid gap-2">
            <div className={`${ROW} px-1 text-sm font-medium`}>
              <span>Недели</span>
              <span>Реклама</span>
            </div>
            <div className="grid max-h-80 gap-1 overflow-y-auto rounded-md border p-1">
              {fields.map((field, index) => {
                const selected = weeks[index]?.selected ?? false;
                const reportDate = reportDateOf(field.dateFrom);
                const week = formatWeek(field.dateFrom);
                const weekErrors = errors.weeks?.[index];
                return (
                  <div key={field.id} className={`${ROW} items-start rounded-sm px-1 py-1`}>
                    <label className="flex cursor-pointer items-start gap-2 pt-2 text-sm">
                      <Controller
                        control={control}
                        name={`weeks.${index}.selected`}
                        render={({ field: checkbox }) => (
                          <Checkbox
                            checked={checkbox.value}
                            onCheckedChange={(checked) => checkbox.onChange(checked === true)}
                          />
                        )}
                      />
                      <span className="grid gap-0.5">
                        <span>{week}</span>
                        <span className="text-xs text-muted-foreground">
                          на {formatIsoDate(reportDate)}
                          {loadedDates.has(reportDate) && " · загружен"}
                        </span>
                      </span>
                    </label>
                    <div className="grid gap-1">
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        placeholder="из отчёта"
                        aria-label={`Реклама за ${week}`}
                        aria-invalid={Boolean(weekErrors?.advertising)}
                        {...register(`weeks.${index}.advertising`, {
                          valueAsNumber: true,
                          disabled: !selected,
                        })}
                      />
                      {weekErrors?.advertising && (
                        <p className="text-xs text-destructive">{weekErrors.advertising.message}</p>
                      )}
                    </div>
                  </div>
                );
              })}
              {canShowMore && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => append(toWeeks(weeksFrom(addDays(oldestWeek, -7), WEEKS_PAGE)))}
                >
                  Показать ещё {WEEKS_PAGE} недель
                </Button>
              )}
            </div>
            <FieldError message={errors.weeks?.root?.message ?? errors.weeks?.message} />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Отмена
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading || noToken}>
              {isLoading && <Loader2Icon className="animate-spin" />}
              Загрузить{selectedCount > 0 && ` (${selectedCount})`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
