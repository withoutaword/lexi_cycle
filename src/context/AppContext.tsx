import { createContext, useContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { LearningProgress } from '../domain/learningProgress'
import type { LoadedVocabulary } from '../domain/vocabulary'
import type { ReviewResult } from '../domain/reviewResult'
import { loadVocabulary, type ValidationIssue } from '../services/vocabularyLoader'
import { SpacedRepetitionScheduler } from '../services/spacedRepetition'
import { loadCloudProgress,loadUserVocabulary,recordPracticeEvent,saveCloudProgress } from '../services/cloudRepository'
import { useAuth } from './AuthContext'
type AppValue={cards:LoadedVocabulary[];issues:ValidationIssue[];progress:Record<string,LearningProgress>;loading:boolean;error?:string;record:(r:ReviewResult)=>void;refresh:()=>Promise<void>}
const Context=createContext<AppValue|null>(null)
const loaded=loadVocabulary(),scheduler=new SpacedRepetitionScheduler()
export function AppProvider({children}:{children:ReactNode}){const {user}=useAuth(),[custom,setCustom]=useState<LoadedVocabulary[]>([]),[progress,setProgress]=useState<Record<string,LearningProgress>>({}),[loading,setLoading]=useState(false),[error,setError]=useState<string>()
 const refresh=useCallback(async()=>{if(!user){setCustom([]);setProgress({});return}setLoading(true);setError(undefined);try{const [v,p]=await Promise.all([loadUserVocabulary(),loadCloudProgress()]);setCustom(v);setProgress(p)}catch(e){setError(e instanceof Error?e.message:'云端数据加载失败')}finally{setLoading(false)}},[user])
 useEffect(()=>{queueMicrotask(()=>void refresh())},[refresh])
 const value=useMemo(()=>({cards:[...loaded.items,...custom],issues:loaded.issues,progress,loading,error,refresh,record:(r:ReviewResult)=>{if(!user)return;setProgress(current=>{const previous=current[r.vocabularyId],next=scheduler.schedule(previous,r),becameMastered=previous?.status!=='mastered'&&next.status==='mastered';void Promise.all([saveCloudProgress(user,next),recordPracticeEvent(r,becameMastered)]).catch(e=>setError(e instanceof Error?e.message:'进度保存失败'));return{...current,[r.vocabularyId]:next}})}}),[custom,progress,loading,error,refresh,user]);return <Context.Provider value={value}>{children}</Context.Provider>}
export function useApp(){const value=useContext(Context);if(!value)throw new Error('AppProvider missing');return value}
