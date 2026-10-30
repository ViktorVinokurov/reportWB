import { z } from "zod";

const amount = z
  .number({ error: "Введите число" })
  .min(0, "Не может быть отрицательным")
  .max(999_999_999_999, "Слишком большое значение");

export const uploadReportSchema = z.object({
  ownerId: z.string({ error: "Выберите ИП" }).min(1, "Выберите ИП"),
  files: z
    .array(z.instanceof(File), { error: "Выберите файлы отчёта" })
    .min(1, "Выберите файлы отчёта")
    .refine(
      (files) => files.every((file) => file.name.toLowerCase().endsWith(".xlsx")),
      "Нужны файлы в формате .xlsx",
    ),
  reportDate: z.iso.date({ error: "Укажите дату отчёта" }),
  advertising: amount,
  storage: amount,
});

export type UploadReportValues = z.infer<typeof uploadReportSchema>;
