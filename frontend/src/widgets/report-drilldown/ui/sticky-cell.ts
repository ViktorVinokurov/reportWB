// Разделитель — псевдоэлемент: при border-collapse граница и тень ячейки не едут вместе со sticky.
// На телефоне длинные названия переносятся, иначе колонка закрывает собой показатели.
export const stickyCell =
  "sticky left-0 z-10 bg-card max-md:after:absolute max-md:after:inset-y-0 max-md:after:right-0 max-md:after:w-px max-md:after:bg-border max-sm:min-w-32 max-sm:whitespace-normal";
