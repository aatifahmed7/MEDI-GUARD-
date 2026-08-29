import React, { useState, useEffect } from 'react';
import {
  FileCode,
  Copy,
  Check,
  Download,
  Terminal,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { fetchPythonBundle } from '../utils/api.js';

export const PythonInspectorView: React.FC = () => {
  const [files, setFiles] = useState<Record<string, string>>({});
  const [selectedFile, setSelectedFile] = useState<string>('app.py');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchPythonBundle()
      .then((data) => {
        setFiles(data);
        if (data && Object.keys(data).length > 0 && !data[selectedFile]) {
          setSelectedFile(Object.keys(data)[0]);
        }
      })
      .catch((err) => console.error('Error fetching Python bundle:', err));
  }, []);

  const handleCopy = () => {
    if (files[selectedFile]) {
      navigator.clipboard.writeText(files[selectedFile]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const fileDescriptions: Record<string, string> = {
    'app.py': 'Main Streamlit application entry point and interactive dashboard UI',
    'database.py': 'SQLite database creation, queries, and 14-day demo dataset generator',
    'ai_model.py': 'AI adherence risk scoring, pattern recognition, and predictive logic',
    'notifications.py': 'Time-aware reminder engine (Upcoming, Due Now, Delayed, Missed)',
    'qr_verification.py': 'QR & Barcode medicine verification and mismatch safety checks',
    'analytics.py': 'Plotly chart generators for trend lines, donut breakdowns, and time slots',
    'utils.py': 'Helper utilities, formatting, and color badge mappings',
    'requirements.txt': 'Python dependencies (streamlit, pandas, plotly, qrcode, etc.)',
  };

  return (
    <div id="python-inspector-view" className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-black">
            🐍
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Python & Streamlit Source Code Architecture
          </h2>
        </div>
        <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
          In addition to the high-performance React web application, MediGuard AI includes a complete standalone Python + Streamlit implementation with SQLite persistence, AI risk modeling, and QR verification.
        </p>
      </div>

      {/* Terminal Command Banner */}
      <div className="bg-[#0B1F33] rounded-2xl p-5 border border-slate-800 text-white space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
          <Terminal className="w-4 h-4" />
          <span>Quick Execution Commands for Python Prototype:</span>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl font-mono text-xs text-slate-200 border border-slate-800 space-y-1.5">
          <p className="text-slate-400"># 1. Navigate to directory and install dependencies</p>
          <p className="text-emerald-300 font-bold">cd MediGuard_AI</p>
          <p className="text-emerald-300 font-bold">pip install -r requirements.txt</p>
          <p className="text-slate-400 mt-2"># 2. Launch the Streamlit application</p>
          <p className="text-emerald-300 font-bold">streamlit run app.py</p>
        </div>
      </div>

      {/* Code Browser */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col md:flex-row min-h-[500px]">
        {/* Left Sidebar: File List */}
        <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 p-4 space-y-1">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">
            Project Modules ({Object.keys(files).length})
          </p>

          {Object.keys(files).length === 0 ? (
            <p className="text-xs text-slate-400 p-2">Loading modules...</p>
          ) : (
            Object.keys(files).map((fileName) => {
              const isSelected = selectedFile === fileName;
              return (
                <button
                  key={fileName}
                  onClick={() => setSelectedFile(fileName)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono font-medium transition-all flex items-center gap-2 ${
                    isSelected
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'text-slate-700 hover:bg-slate-200/70'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{fileName}</span>
                </button>
              );
            })
          )}
        </div>

        {/* Right Code Display */}
        <div className="flex-1 flex flex-col bg-slate-900 text-slate-100">
          {/* File Header */}
          <div className="p-3.5 px-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-mono font-bold text-teal-400">{selectedFile}</span>
              <p className="text-[11px] text-slate-400">
                {fileDescriptions[selectedFile] || 'Python source file'}
              </p>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          {/* Code Body */}
          <div className="flex-1 p-5 overflow-auto custom-scrollbar font-mono text-xs leading-relaxed text-slate-200 max-h-[600px]">
            <pre>
              <code>{files[selectedFile] || '# File empty or loading...'}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
