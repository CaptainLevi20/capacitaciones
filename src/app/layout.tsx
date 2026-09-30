import type { Metadata, Viewport } from 'next';
import { Public_Sans, Source_Serif_4 } from 'next/font/google';
import './globals.css';

const texto = Public_Sans({ subsets: ['latin'], variable: '--fuente-texto', display: 'swap' });
const titulos = Source_Serif_4({ subsets: ['latin'], variable: '--fuente-titulos', display: 'swap' });

export const metadata: Metadata = {
  title: 'Registro de capacitaciones',
  description: 'Registro de asistencia y evaluación de capacitaciones de Avance Jurídico',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#1a2433' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${texto.variable} ${titulos.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
