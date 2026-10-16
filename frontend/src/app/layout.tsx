import '@/styles/globals.css';
import React from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';

export const metadata = {
  title: 'ATS Resume Screening & Candidate Governance System',
  description: 'AI-Powered Applicant Tracking System with Explainable Scoring & Human-in-the-Loop Governance',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-slate-50 text-slate-900 antialiased">
        <Header />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
