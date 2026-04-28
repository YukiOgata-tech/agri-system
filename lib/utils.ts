import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const APP_TIME_ZONE = "Asia/Tokyo";
const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function pad2(value: number) {
  return value.toString().padStart(2, "0");
}

function getZonedDateParts(date: Date, timeZone = APP_TIME_ZONE) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  return {
    year: parts.find((part) => part.type === "year")?.value ?? "0000",
    month: parts.find((part) => part.type === "month")?.value ?? "01",
    day: parts.find((part) => part.type === "day")?.value ?? "01",
    hour: parts.find((part) => part.type === "hour")?.value ?? "00",
    minute: parts.find((part) => part.type === "minute")?.value ?? "00",
  };
}

function formatDateInputFromUtcDate(date: Date) {
  return [
    date.getUTCFullYear(),
    pad2(date.getUTCMonth() + 1),
    pad2(date.getUTCDate()),
  ].join("-");
}

function isDateInputValue(value: string) {
  return DATE_INPUT_PATTERN.test(value);
}

function isDateTimeInputValue(value: string) {
  return DATE_TIME_INPUT_PATTERN.test(value);
}

export function toDateInputValue(date: Date | string, timeZone = APP_TIME_ZONE): string {
  if (typeof date === "string") {
    if (isDateInputValue(date)) return date;
    if (isDateTimeInputValue(date)) return date.slice(0, 10);
  }

  const value = typeof date === "string" ? new Date(date) : date;
  const parts = getZonedDateParts(value, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function toDateTimeInputValue(date: Date | string, timeZone = APP_TIME_ZONE): string {
  if (typeof date === "string" && isDateTimeInputValue(date)) {
    return date.slice(0, 16);
  }
  if (typeof date === "string" && isDateInputValue(date)) {
    return `${date}T00:00`;
  }

  const value = typeof date === "string" ? new Date(date) : date;
  const parts = getZonedDateParts(value, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function getCurrentDateInputValue(date = new Date(), timeZone = APP_TIME_ZONE) {
  return toDateInputValue(date, timeZone);
}

export function getCurrentDateTimeInputValue(date = new Date(), timeZone = APP_TIME_ZONE) {
  return toDateTimeInputValue(date, timeZone);
}

export function addDaysToDateInputValue(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateInputFromUtcDate(date);
}

export function getRecentDateInputValues(length: number, anchorDate = new Date()) {
  const today = getCurrentDateInputValue(anchorDate);
  return Array.from({ length }, (_, index) => addDaysToDateInputValue(today, index - (length - 1)));
}

export function dateTimeInputValueToIsoString(value: string) {
  if (value.endsWith("Z")) return value;
  const normalized = value.length === 16 ? `${value}:00` : value;
  return new Date(normalized).toISOString();
}

export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  if (!options && typeof date === "string") {
    if (isDateInputValue(date)) {
      return date.replaceAll("-", "/");
    }
    if (isDateTimeInputValue(date)) {
      return date.slice(0, 10).replaceAll("-", "/");
    }
  }

  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ja-JP", {
    timeZone: APP_TIME_ZONE,
    ...(options ?? { year: "numeric", month: "2-digit", day: "2-digit" }),
  });
}

export function formatDateTime(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  if (!options && typeof date === "string" && isDateTimeInputValue(date)) {
    const normalized = date.slice(0, 16);
    return `${normalized.slice(0, 10).replaceAll("-", "/")} ${normalized.slice(11, 16)}`;
  }

  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("ja-JP", {
    timeZone: APP_TIME_ZONE,
    ...(options ?? {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }),
  });
}

export function formatTime(date: Date | string, options?: Intl.DateTimeFormatOptions) {
  if (!options && typeof date === "string" && isDateTimeInputValue(date)) {
    return date.slice(11, 16);
  }

  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("ja-JP", {
    timeZone: APP_TIME_ZONE,
    ...(options ?? { hour: "2-digit", minute: "2-digit" }),
  });
}

export function formatNumber(value: number | null | undefined, decimals = 1): string {
  if (value == null) return "-";
  return value.toFixed(decimals);
}

export function formatCurrency(value: number | null | undefined) {
  if (value == null) return "-";
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(value);
}
