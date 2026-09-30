const TONOS = {
  info: 'border-linea bg-papel/60',
  exito: 'border-exito bg-exito-suave',
  error: 'border-peligro bg-peligro-suave',
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
    <div role={tono === 'error' ? 'alert' : 'status'} className={`rounded-lg border-l-4 px-4 py-3.5 ${TONOS[tono]}`}>
      <p className="font-semibold text-tinta">{titulo}</p>
      <p className="mt-1 text-[0.9375rem] text-apagado">{texto}</p>
    </div>
  );
}
