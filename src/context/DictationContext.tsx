import { createContext,useContext,useState,type ReactNode } from 'react'
import type { DictationResult,DictationSession } from '../domain/dictation'
import type { LoadedVocabulary } from '../domain/vocabulary'
type Value={session:DictationSession|null;start:(cards:LoadedVocabulary[])=>void;addResult:(result:DictationResult)=>void}
const Context=createContext<Value|null>(null)
export function DictationProvider({children}:{children:ReactNode}){const [session,setSession]=useState<DictationSession|null>(null);return <Context.Provider value={{session,start:cards=>setSession({id:crypto.randomUUID(),cards,results:[]}),addResult:result=>setSession(current=>current?{...current,results:[...current.results,result]}:current)}}>{children}</Context.Provider>}
export function useDictation(){const value=useContext(Context);if(!value)throw new Error('DictationProvider missing');return value}

