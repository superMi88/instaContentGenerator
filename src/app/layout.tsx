import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'InstaCarousel Studio | Automatisierter 2-Slide Karussell Generator',
  description:
    'Vollautomatisierte Erstellung und Veröffentlichung von Instagram-Karussell-Posts mit Gemini KI, Satori 1080x1350 Rendering und Graph API Scheduling.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className="dark">
      <body className="min-h-screen bg-[#090D16] text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
