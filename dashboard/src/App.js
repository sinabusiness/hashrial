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

export default function App() {
  return (
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
  );
}
