import { Component, ErrorInfo, ReactNode } from 'react';

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
    error: null
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
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border border-red-100">
            <h2 className="text-2xl font-semibold text-red-600 mb-4">Đã có lỗi xảy ra</h2>
            <p className="text-gray-600 mb-4">
              Hệ thống gặp sự cố không mong muốn. Vui lòng tải lại trang hoặc thử lại sau.
            </p>
            <div className="bg-red-50 p-4 rounded-md text-sm text-red-800 font-mono break-words overflow-auto max-h-48">
              {this.state.error?.message}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 w-full bg-slate-900 text-white py-2 px-4 rounded-md hover:bg-slate-800 transition-colors"
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
