import type { LoadedVocabulary } from './vocabulary'

export type DictationSubmissionType='initial'|'skipped'
export type WordDifferenceType='missing'|'extra'|'replaced'
export interface WordDifference { type:WordDifferenceType;expected?:string;actual?:string }
export interface DictationResult { vocabularyId:string;submittedAnswer:string;isCorrect:boolean;accuracy:number;wordDifferences:WordDifference[];submissionType:DictationSubmissionType;submittedAt:string }
export interface DictationSession { id:string;cards:LoadedVocabulary[];results:DictationResult[] }
export interface DictationAttempt extends DictationResult { id:number;dataset:string;sentence:string;translation:string;attemptNumber:number }
