import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'ContextOS — Turn Your AI History into Usable Context',
  description:
    'Turn your AI history into usable context. Import your Gemini activity, search with grounded provenance, track decisions over time, and generate durable context packages.',
  keywords: [
    'ContextOS',
    'Gemini AI',
    'Context Compression',
    'AI Memory System',
    'Grounded Retrieval',
    'Portable Context Packages',
    'Takeout Import',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var saved = localStorage.getItem('contextos_theme');
                if (saved === 'dark') {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
