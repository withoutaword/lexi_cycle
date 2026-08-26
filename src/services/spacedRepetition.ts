import { newProgress, type LearningProgress } from '../domain/learningProgress'
import type { ReviewResult } from '../domain/reviewResult'
const MINUTE=60_000, DAY=86_400_000
const INTERVALS=[10*MINUTE,DAY,3*DAY,7*DAY,14*DAY,30*DAY,60*DAY,90*DAY]
export class SpacedRepetitionScheduler {
  schedule(previous:LearningProgress|undefined,result:ReviewResult):LearningProgress {
    const p=previous ?? newProgress(result.vocabularyId), clean=result.firstTryCorrect && result.wrongAttempts===0
    const streak=clean?p.streak+1:result.wrongAttempts>=3?0:Math.max(0,p.streak-1)
    const factor=result.wrongAttempts===0?1:result.wrongAttempts===1?.7:result.wrongAttempts===2?.4:.1
    const interval=INTERVALS[Math.min(clean?streak-1:Math.max(0,streak),INTERVALS.length-1)]*factor
    const total=p.totalReviews+1, first=p.firstTryCorrectCount+(result.firstTryCorrect?1:0)
    return {...p,status:result.wrongAttempts>=3?'learning':streak>=6?'mastered':'review',totalReviews:total,correctCount:p.correctCount+(result.eventuallyCorrect?1:0),incorrectCount:p.incorrectCount+result.wrongAttempts,firstTryCorrectCount:first,streak,lastReviewedAt:result.reviewedAt,nextReviewAt:result.reviewedAt+interval,lastWrongAttempts:result.wrongAttempts,ease:first/total}
  }
}
