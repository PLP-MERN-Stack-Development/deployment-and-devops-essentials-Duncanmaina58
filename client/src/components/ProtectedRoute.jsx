// src/components/PrivateRoute.jsx
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

const PrivateRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  // ✅ Show a loading state while checking auth
  if (loading) {
    return <div className="text-center mt-10">Loading...</div>;
  }

  // ✅ If logged in, render children; otherwise redirect
  return user ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;
