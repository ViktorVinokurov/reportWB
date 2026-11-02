"use client";

import { SettingsIcon } from "lucide-react";

import { CreateOwnerForm } from "@/features/create-owner";
import { OwnerTokenForm } from "@/features/set-owner-token";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Separator } from "@/shared/ui/separator";

export function SettingsMenu({ ownerId }: { ownerId: string | undefined }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Настройки">
          <SettingsIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        collisionPadding={16}
        className="grid w-80 max-w-[calc(100vw-2rem)] gap-4"
      >
        <CreateOwnerForm />
        <Separator />
        {/* key: при смене ИП форма токена начинается с чистого поля. */}
        <OwnerTokenForm key={ownerId} ownerId={ownerId} />
      </PopoverContent>
    </Popover>
  );
}
