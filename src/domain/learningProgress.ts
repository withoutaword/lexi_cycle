export type LearningStatus = 'new'|'learning'|'review'|'mastered'
export interface LearningProgress { vocabularyId:string; status:LearningStatus; totalReviews:number; correctCount:number; incorrectCount:number; firstTryCorrectCount:number; streak:number; lastReviewedAt?:number; nextReviewAt?:number; lastWrongAttempts?:number; ease?:number }
export const newProgress = (id:string):LearningProgress => ({ vocabularyId:id,status:'new',totalReviews:0,correctCount:0,incorrectCount:0,firstTryCorrectCount:0,streak:0 })
