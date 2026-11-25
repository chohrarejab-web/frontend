import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    const msg = error?.message || String(error);
    if (/failed to fetch dynamically imported module/i.test(msg)) {
      const reloaded = sessionStorage.getItem('sahatn_dyn_import_reloaded');
      if (!reloaded) {
        sessionStorage.setItem('sahatn_dyn_import_reloaded', 'true');
        window.location.reload();
        return;
      }
    }
    try {
      sessionStorage.setItem('sahatn_last_error', JSON.stringify({
        message: error?.message || String(error),
        stack: error?.stack || '',
        componentStack: errorInfo?.componentStack || '',
        time: new Date().toISOString()
      }));
    } catch (e) {}
  }

  handleReset = () => {
    sessionStorage.removeItem('sahatn_dyn_import_reloaded');
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[70vh] bg-slate-50 dark:bg-[#071322] flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white dark:bg-[#0c1a2e] rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-800 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-500 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-2xl mx-auto font-black shadow-inner">
              ⚠️
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
              Une erreur inattendue est survenue
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              La page a rencontré un problème temporaire d'affichage. Vous pouvez recharger la page ou revenir à l'accueil.
            </p>

            {this.state.error && (
              <div className="text-left bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-3.5 space-y-2">
                <div className="text-xs font-mono font-bold text-rose-800 dark:text-rose-200 break-words">
                  {this.state.error.name ? `${this.state.error.name}: ` : ''}{this.state.error.message || String(this.state.error)}
                </div>
                {this.state.errorInfo?.componentStack && (
                  <details className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                    <summary className="cursor-pointer font-bold text-teal-600 dark:text-teal-400 select-none">
                      Détails de la pile du composant
                    </summary>
                    <pre className="mt-2 p-2 bg-slate-900 text-slate-100 rounded-lg overflow-x-auto text-[10px] leading-tight max-h-48 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-5 py-2.5 rounded-xl bg-[#0086cd] hover:bg-[#0074b3] text-white text-xs sm:text-sm font-bold shadow-md cursor-pointer transition-all active:scale-95"
              >
                Recharger la page
              </button>
              <a
                href="/"
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold transition-all"
              >
                Retour à l'accueil
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

