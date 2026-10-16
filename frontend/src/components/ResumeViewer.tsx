'use client';

import React, { useState } from 'react';
import { FileText, Download, Code, ExternalLink, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { formatFileSize } from '@/lib/utils';

interface ResumeViewerProps {
  resumeId: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  extractedText?: string;
  parsingMethod?: string;
  onRetry?: () => void;
}

export const ResumeViewer: React.FC<ResumeViewerProps> = ({
  resumeId,
  originalFilename,
  fileSize,
  mimeType,
  extractedText = '',
  parsingMethod = 'PyMuPDF',
  onRetry,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'text'>('preview');
  const [isRetrying, setIsRetrying] = useState(false);

  const fileUrl = api.getResumeFileUrl(resumeId);
  const isPdf = mimeType === 'application/pdf';

  const handleRetry = async () => {
    try {
      setIsRetrying(true);
      await api.retryResume(resumeId);
      if (onRetry) onRetry();
    } catch (err) {
      alert('Error triggering retry: ' + err);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Top Header & Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/75 px-4 py-2.5">
        <div className="flex items-center gap-1.5 bg-slate-200/60 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'preview'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="h-3.5 w-3.5 text-indigo-600" />
            Original Resume
          </button>
          <button
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'text'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code className="h-3.5 w-3.5 text-indigo-600" />
            Parsed Text ({parsingMethod})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onRetry && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
              title="Re-run OCR and text extraction"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${isRetrying ? 'animate-spin' : ''}`} />
              Retry Extraction
            </button>
          )}

          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            download={originalFilename}
            className="inline-flex items-center gap-1 rounded-md bg-indigo-50 border border-indigo-200 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Download ({formatFileSize(fileSize)})
          </a>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-slate-100/50 p-3 overflow-hidden">
        {activeTab === 'preview' ? (
          isPdf ? (
            <div className="h-[650px] w-full rounded-lg bg-white shadow-inner overflow-hidden border border-slate-200">
              <iframe
                src={`${fileUrl}#toolbar=0&navpanes=0`}
                className="h-full w-full border-none"
                title="Resume PDF Document"
              />
            </div>
          ) : (
            <div className="flex h-[600px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
              <FileText className="h-12 w-12 text-slate-400" />
              <h3 className="mt-3 text-sm font-semibold text-slate-900">
                Microsoft Word Document ({originalFilename})
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm">
                Embedded browser rendering is optimized for PDFs. You can view the extracted parsed text in the next tab or download the native .docx file.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('text')}
                  className="rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm"
                >
                  View Extracted Text
                </button>
                <a
                  href={fileUrl}
                  download={originalFilename}
                  className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
                >
                  Download Original
                </a>
              </div>
            </div>
          )
        ) : (
          <div className="h-[650px] w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 font-mono text-xs leading-relaxed text-slate-800 shadow-inner whitespace-pre-wrap selection:bg-indigo-100">
            {extractedText ? (
              extractedText
            ) : (
              <span className="text-slate-400 italic">No extractable text was found in this document.</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
