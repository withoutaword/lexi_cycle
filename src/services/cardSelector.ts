import type { LearningProgress } from '../domain/learningProgress'
import type { Dataset, LoadedVocabulary } from '../domain/vocabulary'
export type PracticeMode='mixed'|Dataset|'mistakes'
export interface SelectOptions { mode:PracticeMode; limit?:number; now?:number; excludeIds?:string[]; random?:()=>number }
const errorRate=(p?:LearningProgress)=>p&&p.totalReviews?p.incorrectCount/(p.totalReviews+p.incorrectCount):0
export function selectCards(cards:LoadedVocabulary[],progress:Record<string,LearningProgress>,options:SelectOptions):LoadedVocabulary[]{
 const now=options.now??Date.now(), excluded=new Set(options.excludeIds??[]), random=options.random??Math.random
 let pool=cards.filter(c=>!excluded.has(c.id) && (options.mode==='mixed'||options.mode==='mistakes'||c.dataset===options.mode))
 if(options.mode==='mistakes') pool=pool.filter(c=>(progress[c.id]?.incorrectCount??0)>0)
 const recentlyWrongGroups=new Set(pool.filter(c=>(progress[c.id]?.lastWrongAttempts??0)>0).map(c=>c.confusionGroup).filter(Boolean))
 const score=(c:LoadedVocabulary)=>{const p=progress[c.id]; if(p?.nextReviewAt!==undefined&&p.nextReviewAt<=now)return 1000+errorRate(p)*100; if(errorRate(p)>0)return 700+errorRate(p)*100; if(c.confusionGroup&&recentlyWrongGroups.has(c.confusionGroup))return 500; if(p?.lastReviewedAt)return 300+Math.min(100,(now-p.lastReviewedAt)/86_400_000); return 100}
 return pool.map(c=>({c,s:score(c)+random()})).sort((a,b)=>b.s-a.s).slice(0,options.limit??20).map(x=>x.c)
}
