import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
export function ProtectedRoute({children}:{children:ReactNode}){const {user,loading}=useAuth();if(loading)return <div className="loading">正在载入…</div>;return user?children:<Navigate to="/login" replace/>}
