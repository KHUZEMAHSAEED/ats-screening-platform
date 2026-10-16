'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Job } from '@/lib/types';
import { formatFileSize } from '@/lib/utils';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export default function ResumeUploadPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    api.getJobs().then((data) => {
      setJobs(data.items);
      if (data.items.length > 0) {
        setSelectedJobId(data.items[0].id);
      }
    }).catch(console.error);
  }, []);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (files: File[]) => {
    const valid = files.filter((f) => {
      const ext = f.name.toLowerCase();
      return ext.endsWith('.pdf') || ext.endsWith('.docx');
    });

    if (valid.length < files.length) {
      alert('Only .pdf and .docx documents are accepted.');
    }

    setSelectedFiles((prev) => [...prev, ...valid]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!selectedJobId) {
      alert('Please select a target job opening.');
      return;
    }
    if (selectedFiles.length === 0) {
      alert('Please select at least one resume file to upload.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadResult(null);
      const res = await api.uploadResumes(selectedJobId, selectedFiles);
      setUploadResult(res);
      setSelectedFiles([]);
    } catch (err: any) {
      alert('Upload failed: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Resume Upload & Bulk Processing
        </h1>
        <p className="text-xs text-slate-500">
          Upload PDF or Microsoft Word DOCX resumes for automated fact extraction and explainable matching.
        </p>
      </div>

      {/* Target Job Selector */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
          1. Select Target Job Opening *
        </label>
        <select
          value={selectedJobId}
          onChange={(e) => setSelectedJobId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-900 focus:border-indigo-600"
        >
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title} — {job.department} ({job.applications_count} current applicants)
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-400">
          Candidates will be evaluated deterministically against the screening criteria configured for this opening.
        </p>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleFileDrop}
        className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
          isDragging
            ? 'border-indigo-600 bg-indigo-50/50'
            : 'border-slate-300 bg-white hover:border-slate-400'
        }`}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 mb-3">
          <UploadCloud className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-900">
          Drag and drop candidate resumes here
        </h3>
        <p className="mt-1 text-xs text-slate-500 max-w-sm">
          Supports single or bulk uploads in PDF or DOCX format (up to 15MB per file). Magic bytes & duplicate detection enforced.
        </p>

        <label className="mt-4 cursor-pointer rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors">
          Browse Local Files
          <input
            type="file"
            multiple
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileInput}
            className="hidden"
          />
        </label>
      </div>

      {/* Selected Files Queue */}
      {selectedFiles.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-600">
            <span>Selected Documents Queue ({selectedFiles.length})</span>
            <button
              onClick={() => setSelectedFiles([])}
              className="text-slate-400 hover:text-rose-600 font-semibold"
            >
              Clear All
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
            {selectedFiles.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 text-xs">
                <div className="flex items-center gap-2 truncate pr-4">
                  <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span className="font-medium text-slate-800 truncate">{file.name}</span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    ({formatFileSize(file.size)})
                  </span>
                </div>
                <button
                  onClick={() => removeFile(idx)}
                  className="text-slate-400 hover:text-rose-600 p-1"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Ready to process against selected opening.
            </span>
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50"
            >
              <ShieldCheck className="h-4 w-4" />
              {isUploading ? 'Screening Resumes...' : `Process ${selectedFiles.length} Resumes`}
            </button>
          </div>
        </div>
      )}

      {/* Upload Results Summary Card */}
      {uploadResult && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Bulk Processing Results (Batch #{uploadResult.task_id.slice(0, 8)})
            </h3>
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              View in Dashboard
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Metric Pills */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-center">
              <div className="text-lg font-bold text-emerald-800">{uploadResult.queued_files}</div>
              <div className="text-[11px] font-semibold text-emerald-600">Successfully Queued</div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-center">
              <div className="text-lg font-bold text-amber-800">{uploadResult.duplicates_detected}</div>
              <div className="text-[11px] font-semibold text-amber-600">Duplicates Detected</div>
            </div>

            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 text-center">
              <div className="text-lg font-bold text-rose-800">{uploadResult.failed_files}</div>
              <div className="text-[11px] font-semibold text-rose-600">Invalid / Failed</div>
            </div>
          </div>

          {/* Items breakdown */}
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
            {uploadResult.items.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-white">
                <span className="font-medium text-slate-900 truncate pr-3">{item.filename}</span>
                <div>
                  {item.status === 'queued' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" /> Queued & Screening
                    </span>
                  )}
                  {item.status === 'duplicate' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                      <AlertTriangle className="h-3 w-3" /> Duplicate Resume
                    </span>
                  )}
                  {item.status === 'failed' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">
                      <XCircle className="h-3 w-3" /> {item.error || 'Failed'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
