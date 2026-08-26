import type { User } from '@supabase/supabase-js'
import { createContext,useContext,useEffect,useState,type ReactNode } from 'react'
import { isSupabaseConfigured,supabase } from '../lib/supabase'
type Value={user:User|null;loading:boolean;signIn:(email:string,password:string)=>Promise<string|undefined>;signUp:(email:string,password:string)=>Promise<string|undefined>;signOut:()=>Promise<void>}
const Context=createContext<Value|null>(null)
export function AuthProvider({children}:{children:ReactNode}){const [user,setUser]=useState<User|null>(null),[loading,setLoading]=useState(isSupabaseConfigured)
 useEffect(()=>{if(!supabase)return;supabase.auth.getUser().then(({data})=>{setUser(data.user);setLoading(false)});const {data}=supabase.auth.onAuthStateChange((_event,session)=>{setUser(session?.user??null);setLoading(false)});return()=>data.subscription.unsubscribe()},[])
 const signIn=async(email:string,password:string)=>{if(!supabase)return '尚未配置 Supabase';const {error}=await supabase.auth.signInWithPassword({email,password});return error?.message}
 const signUp=async(email:string,password:string)=>{if(!supabase)return '尚未配置 Supabase';const {data,error}=await supabase.auth.signUp({email,password});if(error)return error.message;if(!data.session)return '注册成功，请检查邮箱并完成验证';return undefined}
 const signOut=async()=>{await supabase?.auth.signOut()}
 return <Context.Provider value={{user,loading,signIn,signUp,signOut}}>{children}</Context.Provider>}
export function useAuth(){const v=useContext(Context);if(!v)throw new Error('AuthProvider missing');return v}
export {isSupabaseConfigured}
