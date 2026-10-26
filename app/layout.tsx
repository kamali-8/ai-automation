import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Intern Management Automation',
  description: 'Automated internship management, scheduling, AI task planning, and evaluation platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

