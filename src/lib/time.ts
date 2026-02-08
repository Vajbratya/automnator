export function nowIso(): string {
  return new Date().toISOString();
}

export function parseIsoDate(value: string): Date | null {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

