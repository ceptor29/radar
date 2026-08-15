import { Component, type ReactNode } from "react";

export default class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
          <div className="bg-white rounded-2xl shadow-md ring-1 ring-slate-200 p-8 max-w-lg w-full">
            <p className="text-lg font-bold text-slate-900">Something went wrong</p>
            <pre className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg p-3 overflow-auto whitespace-pre-wrap">
              {this.state.error.message}
            </pre>
            <button
              onClick={() => {
                this.setState({ error: null });
                window.location.reload();
              }}
              className="mt-4 rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm hover:bg-indigo-700"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}