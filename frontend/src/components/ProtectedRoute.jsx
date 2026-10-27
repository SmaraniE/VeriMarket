import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function ProtectedRoute({ children }) {
  const { user, token } = useSelector((s) => s.auth);
  const location = useLocation();

  if (!token) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (!user) return <p className="p-10 text-center text-mute">Loading your account...</p>;
  return children;
}
