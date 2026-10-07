import { Component, type ErrorInfo, type ReactNode } from 'react'

import { UnexpectedErrorPage } from '@/features/errors/UnexpectedErrorPage'

type ErrorBoundaryProps = {
  children: ReactNode
  fallback?: ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
}

/**
 * Catches render errors in the web tree and shows the unexpected-error page.
 * Full-page error routes for the web app.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('React error boundary', error, info.componentStack)
  }

  private handleReset = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <UnexpectedErrorPage onReset={this.handleReset} />
    }

    return this.props.children
  }
}
