import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Workspace | Mutec',
  description: 'Your AI-powered workspace',
};

export const viewport: Viewport = {
  themeColor: 'black',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen">
      {children}
    </div>
  );
} 