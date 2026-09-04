import type { LearningProgress } from '../domain/learningProgress'
import type { Dataset, LoadedVocabulary } from '../domain/vocabulary'
export type PracticeMode='mixed'|Dataset|'mistakes'
export interface SelectOptions { mode:PracticeMode; limit?:number; now?:number; excludeIds?:string[]; random?:()=>number }
export const NEW_CARD_RATIO=.8
const errorRate=(p?:LearningProgress)=>p&&p.totalReviews?p.incorrectCount/(p.totalReviews+p.incorrectCount):0
export function selectCards(cards:LoadedVocabulary[],progress:Record<string,LearningProgress>,options:SelectOptions):LoadedVocabulary[]{
 const now=options.now??Date.now(), excluded=new Set(options.excludeIds??[]), random=options.random??Math.random
 let pool=cards.filter(c=>!excluded.has(c.id) && (options.mode==='mixed'||options.mode==='mistakes'||c.dataset===options.mode))
 if(options.mode==='mistakes') pool=pool.filter(c=>(progress[c.id]?.incorrectCount??0)>0)
 const recentlyWrongGroups=new Set(pool.filter(c=>(progress[c.id]?.lastWrongAttempts??0)>0).map(c=>c.confusionGroup).filter(Boolean))
 const limit=options.limit??20
 const score=(c:LoadedVocabulary)=>{const p=progress[c.id];if(errorRate(p)>0)return 700+errorRate(p)*100;if(c.confusionGroup&&recentlyWrongGroups.has(c.confusionGroup))return 500;if(p?.lastReviewedAt)return 200+Math.min(100,(now-p.lastReviewedAt)/86_400_000);return 100}
 const rank=(items:LoadedVocabulary[])=>items.map(c=>({c,s:score(c)+random()})).sort((a,b)=>b.s-a.s).map(item=>item.c)
 if(options.mode==='mistakes')return rank(pool).slice(0,limit)
 const fresh=rank(pool.filter(c=>!progress[c.id]))
 const newTarget=Math.min(Math.ceil(limit*NEW_CARD_RATIO),fresh.length)
 const reviewTarget=limit-newTarget
 const overdue=rank(pool.filter(c=>progress[c.id]?.nextReviewAt!==undefined&&progress[c.id].nextReviewAt!<=now))
 const selected=overdue.slice(0,reviewTarget),selectedIds=new Set(selected.map(c=>c.id))
 const chosenNew=fresh.splice(0,newTarget)
 selected.push(...chosenNew);chosenNew.forEach(c=>selectedIds.add(c.id))
 const reviews=rank(pool.filter(c=>progress[c.id]&&progress[c.id].status!=='mastered'&&!selectedIds.has(c.id)))
 const mastered=rank(pool.filter(c=>progress[c.id]?.status==='mastered'&&!selectedIds.has(c.id)))
 selected.push(...reviews.splice(0,limit-selected.length))
 selected.push(...fresh.splice(0,limit-selected.length))
 selected.push(...mastered.splice(0,limit-selected.length))
 return selected
}
