import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Workspace | Aether AI',
  description: 'Your Aether AI-powered workspace for visual conversations',
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