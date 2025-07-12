import { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./components/home";
import Login from "./components/Login";
import Signup from "./components/Signup";
import ModuleView from "./pages/ModuleView";
import ExamView from "./pages/ExamView";
import routes from "tempo-routes";
import ProtectedRoute from "./components/ProtectedRoute";
import LoadingSpinner from "./components/ui/LoadingSpinner";
import Unauthorized from "./pages/Unauthorized";

function App() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    }>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Home />} />
          <Route path="/module/:moduleId" element={<ModuleView />} />
          <Route path="/exam/:moduleId" element={<ExamView />} />
        </Route>

        {/* Admin-only routes example */}
        <Route element={<ProtectedRoute requiredRole="admin" />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>

        {/* 404 fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

// Placeholder components
function AdminDashboard() {
  return <div>Admin Dashboard</div>;
}

function NotFound() {
  return <div>Page Not Found</div>;
}

export default App;