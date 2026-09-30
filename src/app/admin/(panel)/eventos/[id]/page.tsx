import { notFound } from 'next/navigation';
import { requerirAdmin } from '@/lib/auth/admin';
import { obtenerEvento } from '@/lib/repo/eventos';
import { listarMarcas } from '@/lib/repo/marcas';
import { urlLogo } from '@/lib/storage';
import { HABEAS_PENDIENTE, ETIQUETA_EVENTO } from '@/lib/domain/constantes';
import { ETIQUETA_TIPO_PREGUNTA } from '@/lib/domain/encuesta';
import { formatearFechaHora } from '@/lib/domain/fechas';
import { FormularioAccion } from '@/components/admin/FormularioAccion';
import { CampoAdmin } from '@/components/admin/CampoAdmin';
import { CamposEvento } from '@/components/admin/CamposEvento';
import { EncabezadoEvento } from '@/components/admin/EncabezadoEvento';
import { claseInput, claseTarjeta } from '@/components/admin/estilos';
import { EditorCoBranding } from './EditorCoBranding';
import {
  cambiarEstadoAccion,
  duplicarAccion,
  guardarCoBrandingAccion,
  guardarDatosAccion,
  guardarHabeasAccion,
  guardarPreguntasAccion,
} from './actions';

export default async function PaginaEvento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = await requerirAdmin();
  const [evento, marcas] = await Promise.all([obtenerEvento(db, id), listarMarcas(db)]);
  if (!evento) notFound();
  const vigente = evento.habeas[0];

  return (
    <div className="space-y-6">
      <EncabezadoEvento evento={evento} actual="configuracion" />

      <section className={claseTarjeta} data-testid="seccion-estado">
        <h2 className="mb-2 font-serif text-xl font-semibold text-tinta">Estado</h2>
        <p className="mb-3 text-sm text-tinta">
          Estado actual: <strong>{ETIQUETA_EVENTO[evento.estado]}</strong>. Solo los eventos activos aceptan registros.
        </p>
        {vigente.texto.includes(HABEAS_PENDIENTE) && (
          <p className="mb-4 rounded-lg border-l-4 border-aviso bg-aviso-suave px-4 py-3 text-sm text-aviso">
            Falta la cláusula oficial de Habeas Data: el evento no se puede activar todavía.
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          {evento.estado !== 'activo' && (
            <FormularioAccion accion={cambiarEstadoAccion.bind(null, id, 'activo')} textoBoton="Activar evento" className="" />
          )}
          {evento.estado !== 'borrador' && (
            <FormularioAccion
              accion={cambiarEstadoAccion.bind(null, id, 'borrador')}
              textoBoton="Volver a borrador"
              variante="secundario"
              className=""
            />
          )}
          {evento.estado !== 'archivado' && (
            <FormularioAccion
              accion={cambiarEstadoAccion.bind(null, id, 'archivado')}
              textoBoton="Archivar"
              variante="secundario"
              confirmar="¿Archivar este evento? Sus QR dejarán de aceptar registros."
              className=""
            />
          )}
          <FormularioAccion
            accion={duplicarAccion.bind(null, id)}
            textoBoton="Duplicar evento"
            variante="secundario"
            className=""
          />
        </div>
      </section>

      <section className={claseTarjeta} data-testid="seccion-datos">
        <h2 className="mb-3 font-serif text-xl font-semibold text-tinta">Datos generales</h2>
        <FormularioAccion accion={guardarDatosAccion.bind(null, id)} textoBoton="Guardar datos">
          <CamposEvento evento={evento} />
        </FormularioAccion>
      </section>

      <section className={claseTarjeta} data-testid="seccion-cobranding">
        <h2 className="mb-3 font-serif text-xl font-semibold text-tinta">Co-branding</h2>
        <EditorCoBranding
          accion={guardarCoBrandingAccion.bind(null, id)}
          opciones={marcas
            .filter((m) => m.activa)
            .map((m) => ({ id: m.id, nombre: m.nombre, logoUrl: m.logo_path ? urlLogo(m.logo_path) : null }))}
          iniciales={evento.marcas.map((m) => ({ marcaId: m.marca_id, orden: m.orden, visible: m.visible }))}
        />
      </section>

      <section className={claseTarjeta} data-testid="seccion-habeas">
        <h2 className="mb-1 font-serif text-xl font-semibold text-tinta">Autorización de datos personales</h2>
        <p className="mb-3 text-sm text-apagado">
          Es el texto que acompaña la casilla obligatoria de los formularios. Versión vigente: {vigente.version}. Cada
          cambio crea una versión nueva; los registros conservan la versión que aceptaron.
        </p>
        <FormularioAccion accion={guardarHabeasAccion.bind(null, id)} textoBoton="Guardar nueva versión">
          <CampoAdmin etiqueta="Texto de la casilla de autorización">
            <input
              name="texto"
              required
              maxLength={300}
              defaultValue={vigente.texto}
              placeholder="Autorizo el tratamiento de datos personales."
              className={claseInput}
            />
          </CampoAdmin>
        </FormularioAccion>
        {evento.habeas.length > 1 && (
          <details className="mt-3 text-sm text-apagado">
            <summary>Historial ({evento.habeas.length} versiones)</summary>
            <ol className="mt-2 list-inside list-disc">
              {evento.habeas.map((h) => (
                <li key={h.id}>
                  Versión {h.version} · {formatearFechaHora(h.created_at)}
                </li>
              ))}
            </ol>
          </details>
        )}
      </section>

      <section className={claseTarjeta} data-testid="seccion-encuesta">
        <h2 className="mb-3 font-serif text-xl font-semibold text-tinta">Encuesta de salida</h2>
        <FormularioAccion accion={guardarPreguntasAccion.bind(null, id)} textoBoton="Guardar encuesta">
          {evento.preguntas.map((p) => (
            <div key={p.clave} className="flex items-center gap-3">
              <input
                type="checkbox"
                name={`activa_${p.clave}`}
                defaultChecked={p.activa}
                aria-label={`Activar pregunta ${p.clave}`}
              />
              <input
                name={`texto_${p.clave}`}
                defaultValue={p.texto}
                aria-label={`Texto de la pregunta ${p.clave}`}
                className={`${claseInput} mt-0`}
              />
              <span className="w-44 shrink-0 text-xs text-apagado">{ETIQUETA_TIPO_PREGUNTA[p.tipo]}</span>
            </div>
          ))}
        </FormularioAccion>
      </section>
    </div>
  );
}
