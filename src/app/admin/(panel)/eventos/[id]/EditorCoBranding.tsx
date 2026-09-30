'use client';
import { useState } from 'react';
import type { ResultadoAccion } from '@/lib/envio';
import { FormularioAccion } from '@/components/admin/FormularioAccion';
import { EncabezadoMarcas } from '@/components/publico/EncabezadoMarcas';

interface Opcion {
  id: string;
  nombre: string;
  logoUrl: string | null;
}

export function EditorCoBranding({
  accion,
  opciones,
  iniciales,
}: {
  accion: (fd: FormData) => Promise<ResultadoAccion>;
  opciones: Opcion[];
  iniciales: { marcaId: string; orden: number; visible: boolean }[];
}) {
  const [items, setItems] = useState(() =>
    opciones
      .map((o) => {
        const i = iniciales.find((x) => x.marcaId === o.id);
        return { marcaId: o.id, visible: i?.visible ?? false, orden: i?.orden ?? 999 };
      })
      .sort((a, b) => a.orden - b.orden),
  );
  const opcion = (id: string) => opciones.find((o) => o.id === id)!;

  function mover(idx: number, delta: number) {
    setItems((prev) => {
      const j = idx + delta;
      if (j < 0 || j >= prev.length) return prev;
      const copia = [...prev];
      [copia[idx], copia[j]] = [copia[j], copia[idx]];
      return copia;
    });
  }
  function alternar(idx: number) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, visible: !it.visible } : it)));
  }

  const vista = items
    .filter((i) => i.visible)
    .map((i) => ({ nombre: opcion(i.marcaId).nombre, logoUrl: opcion(i.marcaId).logoUrl }));
  const json = JSON.stringify(items.map((it, i) => ({ marcaId: it.marcaId, orden: i + 1, visible: it.visible })));
  // Lo último guardado: si el estado actual difiere, hay cambios pendientes (marcar o reordenar).
  const [guardado, setGuardado] = useState(json);

  return (
    <FormularioAccion
      accion={accion}
      textoBoton="Guardar co-branding"
      sucio={json !== guardado}
      alGuardar={() => setGuardado(json)}
    >
      <input type="hidden" name="marcas_json" value={json} />
      <ul className="divide-y divide-linea">
        {items.map((it, idx) => (
          <li key={it.marcaId} className="flex items-center gap-3 py-2 text-sm">
            <label className="flex flex-1 items-center gap-2">
              <input type="checkbox" checked={it.visible} onChange={() => alternar(idx)} />
              {opcion(it.marcaId).nombre}
              {!opcion(it.marcaId).logoUrl && <span className="text-xs text-aviso">(sin logo)</span>}
            </label>
            <button
              type="button"
              onClick={() => mover(idx, -1)}
              aria-label={`Subir ${opcion(it.marcaId).nombre}`}
              className="px-2"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => mover(idx, 1)}
              aria-label={`Bajar ${opcion(it.marcaId).nombre}`}
              className="px-2"
            >
              ↓
            </button>
          </li>
        ))}
      </ul>
      <div className="rounded-lg border border-linea bg-white p-4">
        <p className="mb-2 text-sm text-apagado">Vista previa del encabezado</p>
        {vista.length ? <EncabezadoMarcas marcas={vista} /> : <p className="text-sm text-apagado">Sin logos visibles</p>}
      </div>
    </FormularioAccion>
  );
}
