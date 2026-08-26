import { BookOpen,Brain,House,LogOut,Upload } from 'lucide-react'
import { NavLink,Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
export function AppShell(){const {user,signOut}=useAuth();return <div className="app"><header><NavLink to="/" className="brand"><span className="brand-mark">R</span><span>Recall</span></NavLink><nav><NavLink to="/"><House size={18}/>首页</NavLink><NavLink to="/vocabulary"><BookOpen size={18}/>词库</NavLink><NavLink to="/upload"><Upload size={18}/>我的词库</NavLink><NavLink to="/mistakes"><Brain size={18}/>易错词</NavLink></nav><div className="account"><span title={user?.email}>{user?.email?.split('@')[0]}</span><button onClick={()=>void signOut()} title="退出登录"><LogOut size={17}/></button></div></header><main><Outlet/></main></div>}
