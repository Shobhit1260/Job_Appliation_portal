import React, { useEffect, useMemo, useState } from 'react';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  History,
  FileUp,
  X,
  Loader2,
} from 'lucide-react';
import { resumeApi } from '../api';
import { toast } from 'sonner';
import { getErrorMessage } from '../utils/errorHandler';

const initialUploadState = {
  label: '',
  commit_message: '',
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const formatFileSize = (sizeKb) => {
  if (!sizeKb && sizeKb !== 0) return '-';
  if (sizeKb < 1024) return `${sizeKb} KB`;
  return `${(sizeKb / 1024).toFixed(2)} MB`;
};

export const ResumeManager = () => {
  const [resumes, setResumes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadMeta, setUploadMeta] = useState(initialUploadState);

  const fetchResumes = async () => {
    try {
      const { data } = await resumeApi.getAll();
      setResumes(data?.resumes || []);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResumes();
  }, []);

  const activeResume = useMemo(() => {
    if (!resumes.length) return null;
    return [...resumes].sort((a, b) => (b.version || 0) - (a.version || 0))[0];
  }, [resumes]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are supported');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File must be 10MB or smaller');
      return;
    }

    setSelectedFile(file);
    if (!uploadMeta.label) {
      const defaultLabel = file.name.replace(/\.pdf$/i, '');
      setUploadMeta((prev) => ({ ...prev, label: defaultLabel }));
    }
  };

  const resetUploadState = () => {
    setSelectedFile(null);
    setUploadMeta(initialUploadState);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Select a PDF file first');
      return;
    }

    if (!uploadMeta.label.trim()) {
      toast.error('Label is required');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('label', uploadMeta.label.trim());
      if (uploadMeta.commit_message.trim()) {
        formData.append('commit_message', uploadMeta.commit_message.trim());
      }

      await resumeApi.uploadDirect(formData);

      toast.success('Resume uploaded successfully');
      setShowUploadModal(false);
      resetUploadState();
      setIsLoading(true);
      await fetchResumes();
      
      // Emit event to refresh dashboard
      window.dispatchEvent(new Event('refreshDashboard'));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this resume?')) return;

    try {
      await resumeApi.delete(id);
      toast.success('Resume deleted');
      setResumes((prev) => prev.filter((resume) => resume.id !== id));
      
      // Emit event to refresh dashboard
      window.dispatchEvent(new Event('refreshDashboard'));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleDownload = async (id) => {
    try {
      const { data } = await resumeApi.getById(id);
      if (!data?.download_url) {
        toast.error('No download URL returned by backend');
        return;
      }
      window.open(data.download_url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Resume Manager</h2>
          <p className="text-slate-500">Integrated with /resume/resumes/upload-url, /resume/confirm_upload, and /resume/resumes.</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all shadow-sm"
        >
          <Upload className="w-4 h-4" />
          Upload New Resume
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                Resume Versions
              </h3>
              <p className="text-sm text-slate-500">Loaded from backend version history.</p>
            </div>

            <div className="divide-y divide-slate-100">
              {isLoading ? (
                <div className="p-12 text-center text-slate-500">Loading resumes...</div>
              ) : resumes.length === 0 ? (
                <div className="p-12 text-center text-slate-500">No resumes uploaded yet.</div>
              ) : (
                [...resumes]
                  .sort((a, b) => (b.version || 0) - (a.version || 0))
                  .map((resume) => (
                    <div key={resume.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                          <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">{resume.label || 'Resume'}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-bold uppercase">v{resume.version}</span>
                            <span>{formatFileSize(resume.file_size_kb)}</span>
                            <span>{formatDateTime(resume.created_at)}</span>
                          </div>
                          {resume.commit_message ? (
                            <p className="text-xs text-slate-500 mt-1 truncate">{resume.commit_message}</p>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                          onClick={() => handleDownload(resume.id)}
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all"
                          onClick={() => handleDelete(resume.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-blue-600 p-6 rounded-2xl shadow-lg shadow-blue-600/20 text-white">
            <h3 className="text-lg font-bold">Active Resume</h3>
            <p className="text-blue-100 text-sm mt-1">Latest version by backend ordering.</p>

            <div className="mt-4 bg-white/10 rounded-xl p-3">
              {activeResume ? (
                <>
                  <p className="font-semibold truncate">{activeResume.label}</p>
                  <p className="text-xs text-blue-100 mt-1">Version {activeResume.version}</p>
                </>
              ) : (
                <p className="text-sm text-blue-100">No active resume yet.</p>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Upload Rules</h3>
            <ul className="mt-3 text-sm text-slate-600 space-y-2">
              <li>PDF only</li>
              <li>Maximum size 10MB</li>
              <li>Each upload creates the next version in backend</li>
            </ul>
          </div>
        </div>
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Upload Resume</h3>
              <button onClick={() => { setShowUploadModal(false); resetUploadState(); }} className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Label</label>
                <input
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  value={uploadMeta.label}
                  onChange={(e) => setUploadMeta((prev) => ({ ...prev, label: e.target.value }))}
                  placeholder="Frontend Engineer Resume"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Commit Message (optional)</label>
                <input
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  value={uploadMeta.commit_message}
                  onChange={(e) => setUploadMeta((prev) => ({ ...prev, commit_message: e.target.value }))}
                  placeholder="Added React and system design projects"
                />
              </div>

              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-8 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative group">
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".pdf" onChange={handleFileChange} />
                <FileUp className="w-12 h-12 text-slate-400 mb-4 group-hover:text-blue-600 transition-colors" />
                <p className="text-sm font-bold text-slate-700 text-center">{selectedFile ? selectedFile.name : 'Click to upload PDF'}</p>
                <p className="text-xs text-slate-500 mt-1">Max size 10MB</p>
              </label>
            </div>

            <div className="p-6 border-t bg-slate-50/50 flex gap-3">
              <button className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium" onClick={() => { setShowUploadModal(false); resetUploadState(); }}>
                Cancel
              </button>
              <button
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
              >
                {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isUploading ? 'Uploading...' : 'Confirm Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
