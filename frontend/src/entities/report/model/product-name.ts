/** У строк хранения, удержаний и т. п. колонка «Название» пустая. */
export function formatProductName(name: string): string {
  return name || "(без названия)";
}

export function formatSize(size: string): string {
  return size || "(без размера)";
}
