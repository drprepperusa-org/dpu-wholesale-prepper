import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error('React error boundary caught:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return React.createElement('div', { style: { padding: 40, fontFamily: 'sans-serif' } },
        React.createElement('h1', null, 'Something went wrong'),
        React.createElement('pre', { style: { color: 'red', whiteSpace: 'pre-wrap' } }, String(this.state.error))
      )
    }
    return this.props.children
  }
}

const root = ReactDOM.createRoot(document.getElementById('app'))
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)
