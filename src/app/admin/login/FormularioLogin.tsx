'use client';
import { useActionState } from 'react';
import { iniciarSesion } from './actions';
import { claseBoton, claseInput } from '@/components/admin/estilos';
import { CampoAdmin } from '@/components/admin/CampoAdmin';

export function FormularioLogin() {
  const [estado, accion, pendiente] = useActionState(iniciarSesion, null);
  return (
    <form action={accion} className="space-y-4">
      <CampoAdmin etiqueta="Correo">
        <input name="correo" type="email" autoComplete="username" required className={claseInput} />
      </CampoAdmin>
      <CampoAdmin etiqueta="Contraseña">
        <input name="clave" type="password" autoComplete="current-password" required className={claseInput} />
      </CampoAdmin>
      {estado?.error && (
        <p role="alert" className="text-sm text-peligro">
          {estado.error}
        </p>
      )}
      <button type="submit" disabled={pendiente} className={`${claseBoton.primario} w-full`}>
        {pendiente ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  );
}
