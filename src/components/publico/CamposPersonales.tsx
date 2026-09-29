'use client';
import { useState } from 'react';
import { correoFueraDeDominio } from '@/lib/domain/correo';
import { Campo, Texto } from './campos';

export function CamposPersonales({
  errores,
  dominioCorreo,
}: {
  errores: Record<string, string>;
  dominioCorreo: string | null;
}) {
  const [correo, setCorreo] = useState('');
  const fueraDeDominio = correo.includes('@') && correoFueraDeDominio(correo, dominioCorreo);
  const dominio = dominioCorreo?.replace(/^@/, '');
  return (
    <>
      <Campo etiqueta="Nombres" error={errores.nombres}>
        <Texto name="nombres" autoComplete="given-name" required error={errores.nombres} />
      </Campo>
      <Campo etiqueta="Apellidos" error={errores.apellidos}>
        <Texto name="apellidos" autoComplete="family-name" required error={errores.apellidos} />
      </Campo>
      <Campo
        etiqueta="Correo institucional"
        error={errores.correo}
        aviso={fueraDeDominio ? `Verifique: se esperaba un correo @${dominio}` : undefined}
      >
        <Texto
          name="correo"
          type="email"
          autoComplete="email"
          required
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          error={errores.correo}
        />
      </Campo>
      <Campo etiqueta="Dependencia" error={errores.dependencia}>
        <Texto name="dependencia" autoComplete="organization" required error={errores.dependencia} />
      </Campo>
      <Campo etiqueta="Cargo" error={errores.cargo}>
        <Texto name="cargo" autoComplete="organization-title" required error={errores.cargo} />
      </Campo>
    </>
  );
}
