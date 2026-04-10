type DateFormatPreset = "short" | "full";

type DateFormatterOptions = {
  preset?: DateFormatPreset;
  fallback?: string;
};

const DATE_FORMAT_OPTIONS: Record<DateFormatPreset, Intl.DateTimeFormatOptions> = {
  short: {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  },
  full: {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
};

export function formatDatePtBr(value: string | null, options?: DateFormatterOptions) {
  const preset = options?.preset ?? "short";
  const fallback = options?.fallback ?? "-";

  if (!value) return fallback;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;

  return parsed.toLocaleString("pt-BR", DATE_FORMAT_OPTIONS[preset]);
}
