import type { LoadedVocabulary } from '../domain/vocabulary'
import type { ReviewResult } from '../domain/reviewResult'
import { isCorrectAnswer } from './answerValidator'
export interface CardAttemptState { wrongAttempts:number; attempts:number; reveal:boolean; complete:boolean }
export const initialAttemptState=():CardAttemptState=>({wrongAttempts:0,attempts:0,reveal:false,complete:false})
export function submitAttempt(card:LoadedVocabulary,state:CardAttemptState,input:string):CardAttemptState {
 const attempts=state.attempts+1
 if(isCorrectAnswer(input,card)) return {...state,attempts,complete:true,reveal:false}
 const wrongAttempts=state.wrongAttempts+1
 return {attempts,wrongAttempts,reveal:wrongAttempts>=3,complete:false}
}
export const hideReveal=(state:CardAttemptState):CardAttemptState=>({...state,reveal:false})
export function toReviewResult(card:LoadedVocabulary,state:CardAttemptState,reviewedAt=Date.now()):ReviewResult{return{vocabularyId:card.id,attempts:state.attempts,wrongAttempts:state.wrongAttempts,firstTryCorrect:state.attempts===1&&state.wrongAttempts===0,eventuallyCorrect:state.complete,reviewedAt}}
