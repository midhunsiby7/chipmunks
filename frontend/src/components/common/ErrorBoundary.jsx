import React from 'react';
import ErrorState from '../ui/ErrorState';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Brightloop ErrorBoundary] Caught render error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <ErrorState
            title="Application Error"
            message={
              this.state.error?.message ||
              'A critical error occurred while rendering this view. Please refresh the page.'
            }
            onRetry={this.handleReset}
            actionText="Reload View"
          />
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
