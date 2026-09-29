const TONOS = {
  info: 'border-slate-400 bg-slate-50',
  exito: 'border-green-700 bg-green-50',
  error: 'border-red-700 bg-red-50',
} as const;

export function MensajeEstado({
  tono = 'info',
  titulo,
  texto,
}: {
  tono?: keyof typeof TONOS;
  titulo: string;
  texto: string;
}) {
  return (
    <div role={tono === 'error' ? 'alert' : 'status'} className={`rounded-lg border-l-4 p-4 ${TONOS[tono]}`}>
      <p className="font-semibold text-slate-900">{titulo}</p>
      <p className="mt-1 text-slate-700">{texto}</p>
    </div>
  );
}
