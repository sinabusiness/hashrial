import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing      from "./pages/Landing";
import Login        from "./pages/Login";
import Register     from "./pages/Register";
import Dashboard    from "./pages/Dashboard";
import Workers      from "./pages/Workers";
import WorkerDetail from "./pages/WorkerDetail";
import Earnings     from "./pages/Earnings";
import Connect      from "./pages/Connect";
import Settings     from "./pages/Settings";
import Notifications from "./pages/Notifications";
import Layout       from "./components/Layout";

function PrivateRoute({ children }) {
  const token = localStorage.getItem("hashrial_token");
  return token ? children : <Navigate to="/login" replace />;
}

function ErrorFallback({ error }) {
  return (
    <div style={{
      minHeight: "100vh", background: "#080b10", color: "#e6edf3",
      padding: 60, fontFamily: "monospace",
    }}>
      <h1 style={{ color: "#f85149", fontSize: 28, marginBottom: 16 }}>Something went wrong</h1>
      <div style={{
        background: "rgba(248,81,73,0.1)", border: "1px solid rgba(248,81,73,0.2)",
        borderRadius: 10, padding: 20, marginBottom: 20,
        fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-all",
        maxHeight: 400, overflow: "auto",
      }}>
        {error?.message}
        {"\n\n"}
        {error?.stack}
      </div>
      <button onClick={() => window.location.reload()} style={{
        padding: "12px 28px", background: "#f7931a", color: "#000",
        border: "none", borderRadius: 10, fontWeight: 600, cursor: "pointer", fontSize: 14,
        fontFamily: "inherit",
      }}>
        Reload Page
      </button>
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("App Error:", error, errorInfo);
  }
  render() {
    if (this.state.error) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/"         element={<Landing />} />
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index                    element={<Dashboard />} />
            <Route path="workers"           element={<Workers />} />
            <Route path="workers/:name"     element={<WorkerDetail />} />
            <Route path="earnings"          element={<Earnings />} />
            <Route path="connect"           element={<Connect />} />
            <Route path="notifications"     element={<Notifications />} />
            <Route path="settings"          element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
