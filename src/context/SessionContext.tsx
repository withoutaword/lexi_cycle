import { createContext,useContext,useState,type ReactNode } from 'react'
import type { LoadedVocabulary } from '../domain/vocabulary'
import type { ReviewResult } from '../domain/reviewResult'
import type { PracticeMode } from '../services/cardSelector'
type Session={cards:LoadedVocabulary[];results:ReviewResult[];mode:PracticeMode}
type Value={session:Session|null;start:(cards:LoadedVocabulary[],mode:PracticeMode)=>void;addResult:(r:ReviewResult)=>void}
const Context=createContext<Value|null>(null)
export function SessionProvider({children}:{children:ReactNode}){const [session,setSession]=useState<Session|null>(null);return <Context.Provider value={{session,start:(cards,mode)=>setSession({cards,mode,results:[]}),addResult:r=>setSession(s=>s?{...s,results:[...s.results,r]}:s)}}>{children}</Context.Provider>}
export function useSession(){const v=useContext(Context);if(!v)throw new Error('SessionProvider missing');return v}
