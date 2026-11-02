import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'Terjadi gangguan tak terduga pada aplikasi.',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught application error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let parsedDetail = this.state.errorMessage;
      try {
        const parsed = JSON.parse(this.state.errorMessage);
        if (parsed && parsed.error) {
          parsedDetail = `${parsed.error} (Operasi: ${parsed.operationType || '-'}, Path: ${parsed.path || '-'})`;
        }
      } catch {
        // Plain text message
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#071318] p-6">
          <div className="max-w-lg w-full bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/50 rounded-2xl p-8">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Gangguan Sinkronisasi Halaman
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6 break-words">
              {parsedDetail}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Muat Ulang Portal
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
