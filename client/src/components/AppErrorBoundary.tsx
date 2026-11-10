import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { failed: boolean; }

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application render failure', error, info);
  }

  render() {
    if (this.state.failed) {
      return (
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#0e1011', color: '#f0f3f4', fontFamily: 'system-ui, sans-serif' }}>
          <section style={{ maxWidth: 440, padding: 28, border: '1px solid #2a2e30', borderRadius: 16, background: '#17191a' }}>
            <h1 style={{ marginTop: 0 }}>Не удалось открыть кабинет</h1>
            <p style={{ color: '#aab3b6', lineHeight: 1.5 }}>Обновите страницу. Если проблема повторяется, обратитесь в поддержку.</p>
            <button type="button" onClick={() => window.location.reload()} style={{ padding: '10px 14px', border: 0, borderRadius: 9, background: '#77cee8', color: '#102126', cursor: 'pointer', fontWeight: 700 }}>Обновить страницу</button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}
