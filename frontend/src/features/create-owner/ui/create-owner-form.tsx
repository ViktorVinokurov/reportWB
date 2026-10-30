"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { getApiErrorMessage, getApiFieldErrors } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

import { useCreateOwnerMutation } from "../api/create-owner-api";

const createOwnerSchema = z.object({
  owner: z.string().trim().min(1, "Введите название ИП").max(255, "Слишком длинное название"),
});

type CreateOwnerValues = z.infer<typeof createOwnerSchema>;

export function CreateOwnerForm() {
  const [createOwner, { isLoading }] = useCreateOwnerMutation();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateOwnerValues>({
    resolver: zodResolver(createOwnerSchema),
    defaultValues: { owner: "" },
  });

  const onSubmit = async (values: CreateOwnerValues) => {
    const result = await createOwner(values);
    if ("error" in result) {
      const message = getApiFieldErrors(result.error).owner;
      if (message) setError("owner", { message });
      else toast.error(getApiErrorMessage(result.error));
      return;
    }
    toast.success(`${result.data.owner} добавлен`);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-2">
      <Label htmlFor="owner-name">Добавить ИП</Label>
      <div className="flex gap-2">
        <Input
          id="owner-name"
          placeholder="ИП Иванов И. И."
          autoComplete="off"
          aria-invalid={Boolean(errors.owner)}
          {...register("owner")}
        />
        <Button type="submit" size="icon" disabled={isLoading} aria-label="Добавить ИП">
          {isLoading ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
        </Button>
      </div>
      {errors.owner && <p className="text-sm text-destructive">{errors.owner.message}</p>}
    </form>
  );
}
