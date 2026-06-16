import { Navigate } from "react-router-dom"
import { useAuthStore } from "../../store/authStore"

export default function ProtectedRoute({ children, role }) {
  const user = useAuthStore(s => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (role === "admin" && user.role !== "admin") return <Navigate to="/team" replace />
  return children
}