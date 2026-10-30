import { z } from "zod";

const MAX_AMOUNT = 999_999_999_999;

const weekSchema = z
  .object({
    dateFrom: z.iso.date(),
    selected: z.boolean(),
    // Пусто (NaN) — реклама берётся из отчёта WB. У невыбранной недели поле заблокировано,
    // и react-hook-form отдаёт undefined.
    advertising: z.union([z.number(), z.nan()]).optional(),
  })
  .superRefine((week, ctx) => {
    const value = week.advertising;
    if (!week.selected || value === undefined || Number.isNaN(value)) return;
    let message: string | null = null;
    if (value < 0) message = "Не может быть отрицательным";
    else if (value > MAX_AMOUNT) message = "Слишком большое значение";
    if (message) ctx.addIssue({ code: "custom", path: ["advertising"], message });
  });

export const importWbReportSchema = z.object({
  ownerId: z.string({ error: "Выберите ИП" }).min(1, "Выберите ИП"),
  weeks: z
    .array(weekSchema)
    .refine((weeks) => weeks.some((week) => week.selected), "Выберите хотя бы одну неделю"),
});

export type ImportWbReportValues = z.infer<typeof importWbReportSchema>;
