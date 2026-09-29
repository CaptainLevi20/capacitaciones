// Honeypot: invisible para las personas; los bots suelen llenarlo.
export function CampoTrampa() {
  return (
    <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
      <input type="text" name="sitio_web" tabIndex={-1} autoComplete="off" />
    </div>
  );
}
