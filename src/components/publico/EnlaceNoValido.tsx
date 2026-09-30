export function EnlaceNoValido() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="font-serif text-2xl font-semibold text-tinta">Enlace no válido</h1>
      <p className="mt-3 text-apagado">
        Este código QR no corresponde a una sesión disponible. Escanee de nuevo el código impreso o consulte con el
        organizador de la capacitación.
      </p>
    </main>
  );
}
