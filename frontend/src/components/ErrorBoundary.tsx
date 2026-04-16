import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-navy-950 p-6 font-sans text-text-primary">
          <div className="max-w-md w-full bg-navy-800 border border-gold-500/40 p-8 rounded-xl shadow-[0_0_24px_-8px_rgba(201,169,97,0.25)]">
            <div className="flex items-center gap-3 mb-5">
              <span className="inline-flex w-10 h-10 rounded-full bg-status-error/15 text-status-error items-center justify-center">
                <AlertTriangle className="w-5 h-5" aria-hidden />
              </span>
              <h2 className="font-serif text-2xl font-semibold text-gold-400">
                Đã có lỗi xảy ra
              </h2>
            </div>
            <p className="text-text-muted mb-5 leading-relaxed">
              Hệ thống gặp sự cố không mong muốn. Vui lòng tải lại trang hoặc
              thử lại sau.
            </p>
            <div className="bg-navy-900 border border-navy-700 p-4 rounded-lg text-xs text-status-error font-mono break-words overflow-auto max-h-48">
              {this.state.error?.message}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 w-full h-11 inline-flex items-center justify-center rounded-lg bg-gold-500 text-navy-950 font-semibold hover:bg-gold-400 transition-colors active:scale-[0.98]"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
