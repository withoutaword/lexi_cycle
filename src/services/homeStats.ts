import type { LearningProgress } from '../domain/learningProgress'
import type { LoadedVocabulary } from '../domain/vocabulary'

export interface HomeStats {
  dueToday: number
  learning: number
  newCount: number
  mastered: number
}

export function endOfLocalDay(now:number):number {
  const end=new Date(now)
  end.setHours(23,59,59,999)
  return end.getTime()
}

export function getHomeStats(cards:LoadedVocabulary[],progress:Record<string,LearningProgress>,now=Date.now()):HomeStats {
  const cardIds=new Set(cards.map(card=>card.id))
  const active=Object.values(progress).filter(item=>cardIds.has(item.vocabularyId))
  const endOfToday=endOfLocalDay(now)
  return {
    dueToday:active.filter(item=>item.nextReviewAt!==undefined&&item.nextReviewAt<=endOfToday).length,
    learning:active.filter(item=>item.status==='learning'||item.status==='review').length,
    newCount:cards.filter(card=>progress[card.id]===undefined).length,
    mastered:active.filter(item=>item.status==='mastered').length,
  }
}
