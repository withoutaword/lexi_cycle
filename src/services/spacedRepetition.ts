import { newProgress, type LearningProgress } from '../domain/learningProgress'
import type { ReviewResult } from '../domain/reviewResult'
const MINUTE=60_000, DAY=86_400_000
const INTERVALS=[10*MINUTE,DAY,3*DAY,7*DAY,14*DAY,30*DAY,60*DAY,90*DAY]
export const MASTERY_STREAK=3
export class SpacedRepetitionScheduler {
  schedule(previous:LearningProgress|undefined,result:ReviewResult):LearningProgress {
    const p=previous ?? newProgress(result.vocabularyId), clean=result.firstTryCorrect && result.wrongAttempts===0
    const due=!p.lastReviewedAt||p.nextReviewAt===undefined||result.reviewedAt>=p.nextReviewAt
    const qualifyingClean=clean&&due
    const streak=qualifyingClean?p.streak+1:clean?p.streak:0
    const factor=result.wrongAttempts===0?1:result.wrongAttempts===1?.7:result.wrongAttempts===2?.4:.1
    const interval=qualifyingClean?INTERVALS[Math.min(streak-1,INTERVALS.length-1)]:clean?Math.max(MINUTE,(p.nextReviewAt??result.reviewedAt+MINUTE)-result.reviewedAt):INTERVALS[0]*factor
    const total=p.totalReviews+1, first=p.firstTryCorrectCount+(result.firstTryCorrect?1:0)
    return {...p,status:result.wrongAttempts>=3?'learning':streak>=MASTERY_STREAK?'mastered':'review',totalReviews:total,correctCount:p.correctCount+(result.eventuallyCorrect?1:0),incorrectCount:p.incorrectCount+result.wrongAttempts,firstTryCorrectCount:first,streak,lastReviewedAt:result.reviewedAt,nextReviewAt:clean&&!due?p.nextReviewAt:result.reviewedAt+interval,lastWrongAttempts:result.wrongAttempts,ease:first/total}
  }
}
