import { ZONA_HORARIA } from './constantes';

const DESFASE_MS = 5 * 3600_000; // Bogotá = UTC−5 todo el año

export function aInputLocal(d: Date): string {
  return new Date(d.getTime() - DESFASE_MS).toISOString().slice(0, 16);
}

export function fechaHoraBogota(fecha: string, hora: string): Date | null {
  let iso = fecha.trim();
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(iso);
  if (dmy) iso = `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const hm = /^(\d{1,2}):(\d{2})$/.exec(hora.trim());
  if (!hm) return null;
  const h = Number(hm[1]);
  const m = Number(hm[2]);
  if (h > 23 || m > 59) return null;
  const d = new Date(`${iso}T${String(h).padStart(2, '0')}:${hm[2]}:00-05:00`);
  if (Number.isNaN(d.getTime())) return null;
  if (aInputLocal(d).slice(0, 10) !== iso) return null; // p. ej. 2026-02-31 se desborda a marzo
  return d;
}

export function desdeInputLocal(valor: string): Date | null {
  const [fecha, hora] = valor.split('T');
  if (!fecha || !hora) return null;
  return fechaHoraBogota(fecha, hora.slice(0, 5));
}

export function formatearFechaHora(d: Date | string): string {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: ZONA_HORARIA,
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(d));
}
