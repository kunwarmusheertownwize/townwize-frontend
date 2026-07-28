import { Component } from "react";

/**
 * Catches render errors so a single bad value cannot blank the whole app.
 *
 * This matters most in the native builds: on the web a crash is a refresh away
 * from recovery, but inside the APK an unhandled render error leaves a white
 * screen with no address bar and no way back except force-closing the app —
 * potentially in the middle of a trip.
 *
 * Props:
 *   title      Heading shown to the user.
 *   message    Explanatory line.
 *   onReset    Optional. Called by "Try again" instead of reloading the page —
 *              use for boundaries around a screen rather than the whole app.
 *   homePath   Where the secondary button navigates. Defaults to the app root.
 */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Kept as console output deliberately: there is no error-reporting service
    // wired up yet, and swallowing this silently is how the original white
    // screen went undiagnosed.
    console.error("[ErrorBoundary]", error, info?.componentStack);
  }

  handleRetry = () => {
    if (this.props.onReset) {
      this.setState({ error: null });
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  handleHome = () => {
    window.location.href = this.props.homePath || "/";
  };

  render() {
    if (!this.state.error) return this.props.children;

    const {
      title = "Something went wrong",
      message = "This screen ran into a problem. Your trip and payment details are safe.",
    } = this.props;

    return (
      <div
        role="alert"
        className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 py-10 text-center"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-900/30">
          <span className="text-2xl" aria-hidden="true">⚠️</span>
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            {message}
          </p>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={this.handleRetry}
            className="rounded-xl bg-townwize-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-townwize-accent"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={this.handleHome}
            className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-townwize-accent dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Go home
          </button>
        </div>

        {import.meta.env.DEV && (
          <pre className="mt-4 max-w-full overflow-x-auto rounded-lg bg-gray-100 p-3 text-left text-[11px] text-red-700 dark:bg-gray-800 dark:text-red-300">
            {String(this.state.error?.stack || this.state.error)}
          </pre>
        )}
      </div>
    );
  }
}
