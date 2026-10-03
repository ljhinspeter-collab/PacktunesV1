import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
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
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] p-6 text-center bg-gray-800/60 rounded-xl border border-gray-700 max-w-lg mx-auto my-8">
          <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-3 text-xl font-bold">
            !
          </div>
          <h3 className="text-xl font-bold text-white mb-1">
            {this.props.fallbackTitle || 'Something went wrong'}
          </h3>
          <p className="text-sm text-gray-400 mb-4 max-w-md">
            This view encountered an issue while loading data.
          </p>
          <button
            onClick={this.handleReset}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md font-semibold text-sm transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
