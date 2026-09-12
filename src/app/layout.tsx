import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: {
    default: 'ContextOS — Turn Your AI History into Usable Context',
    template: '%s | ContextOS',
  },
  description:
    'Turn your AI history into usable context. Import your Gemini activity, search with grounded provenance, track decisions over time, and generate durable context packages.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
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
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
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
