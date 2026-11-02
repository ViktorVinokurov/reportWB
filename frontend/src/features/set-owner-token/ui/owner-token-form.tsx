"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { useGetOwnersQuery } from "@/entities/owner";
import { getApiErrorMessage, getApiFieldErrors } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

import { useSetOwnerTokenMutation } from "../api/set-owner-token-api";

const ownerTokenSchema = z.object({
  token: z.string().trim().min(1, "Вставьте токен"),
});

type OwnerTokenValues = z.infer<typeof ownerTokenSchema>;

/** Токен WB API для активного ИП. Без ИП поле недоступно. */
export function OwnerTokenForm({ ownerId }: { ownerId: string | undefined }) {
  const { data: owners = [] } = useGetOwnersQuery();
  const owner = owners.find((item) => item.id === ownerId);
  const [setOwnerToken, { isLoading }] = useSetOwnerTokenMutation();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<OwnerTokenValues>({
    resolver: zodResolver(ownerTokenSchema),
    defaultValues: { token: "" },
  });

  const onSubmit = async ({ token }: OwnerTokenValues) => {
    if (!owner) return;
    const result = await setOwnerToken({ ownerId: owner.id, token });
    if ("error" in result) {
      const message = getApiFieldErrors(result.error).token;
      if (message) setError("token", { message });
      else toast.error(getApiErrorMessage(result.error));
      return;
    }
    toast.success(`Токен WB для ${owner.owner} сохранён`);
    reset();
  };

  let hint = "Сначала добавьте ИП";
  if (owner) hint = owner.has_token ? `${owner.owner}: токен сохранён` : `${owner.owner}: токена нет`;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-2">
      <Label htmlFor="owner-token">Токен WB</Label>
      <div className="flex gap-2">
        <Input
          id="owner-token"
          type="password"
          placeholder={owner?.has_token ? "Новый токен" : "Токен категорий «Финансы» и «Контент»"}
          autoComplete="off"
          disabled={!owner}
          aria-invalid={Boolean(errors.token)}
          {...register("token")}
        />
        <Button type="submit" disabled={!owner || isLoading}>
          {isLoading && <Loader2Icon className="animate-spin" />}
          Сохранить
        </Button>
      </div>
      {errors.token ? (
        <p className="text-sm text-destructive">{errors.token.message}</p>
      ) : (
        <p className="text-sm text-muted-foreground">{hint}</p>
      )}
    </form>
  );
}
