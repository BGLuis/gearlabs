import type { Metadata } from 'next';
import './globals.css';
import { GearProvider } from '@/context/GearContext';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'GearLabs — Silent Gear Builder & Optimizer',
  description: 'Simulador interativo, catálogo de materiais e otimizador combinatório para Silent Gear (Minecraft).',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-mc-bg text-mc-text antialiased flex flex-col">
        <GearProvider>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
            {children}
          </main>
          <footer className="border-t border-mc-border/60 py-6 px-4 text-center text-xs text-mc-muted font-mono">
            <p>GearLabs · Feito para a comunidade de Silent Gear & Minecraft Modded</p>
          </footer>
        </GearProvider>
      </body>
    </html>
  );
}
