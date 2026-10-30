"use client";

import { FileSpreadsheetIcon, UploadIcon, XIcon } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

const ACCEPT = ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

interface FileDropzoneProps {
  id?: string;
  value: File[] | undefined;
  onChange: (files: File[]) => void;
  invalid?: boolean;
}

export function FileDropzone({ id, value = [], onChange, invalid }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Новые файлы добавляются к выбранным; файл с тем же именем заменяется.
  const addFiles = (added: FileList | null) => {
    if (!added?.length) return;
    const addedFiles = Array.from(added);
    const names = new Set(addedFiles.map((file) => file.name));
    onChange([...value.filter((file) => !names.has(file.name)), ...addedFiles]);
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    addFiles(event.dataTransfer.files);
  };

  return (
    <>
      <button
        id={id}
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center text-sm transition-colors outline-none",
          "hover:bg-accent/50 focus-visible:ring-[3px] focus-visible:ring-ring/50",
          isDragOver && "border-primary bg-accent",
          invalid && "border-destructive",
        )}
      >
        <UploadIcon className="size-8 text-muted-foreground" />
        <span className="font-medium">
          {value.length ? "Добавить ещё части отчёта" : "Перетащите файлы отчёта сюда"}
        </span>
        <span className="text-muted-foreground">
          или нажмите, чтобы выбрать .xlsx — можно несколько
        </span>
      </button>
      {value.length > 0 && (
        <ul className="grid gap-1">
          {value.map((file) => (
            <li key={file.name} className="flex items-center gap-2 text-sm">
              <FileSpreadsheetIcon className="size-4 shrink-0 text-positive" />
              <span className="flex-1 break-all">{file.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`Убрать ${file.name}`}
                onClick={() => onChange(value.filter((f) => f !== file))}
              >
                <XIcon />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(event) => {
          addFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </>
  );
}
