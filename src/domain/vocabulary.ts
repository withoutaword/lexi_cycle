export type Dataset = 'vocabulary' | 'singular-plural' | 'participles' | 'custom'
export interface VocabularySource { id:string; category:string; categoryZh?:string; conceptGroup?:string; lemma:string; sentence:string; translation:string; answer:string; targetType:'word'|'phrase'; aliases?:string[]; confusionGroup?:string; tags?:string[]; difficulty?:number; needsReview?:boolean }
export interface LoadedVocabulary extends VocabularySource { dataset:Dataset }
export const DATASET_NAMES: Record<Dataset,string> = { vocabulary:'普通词汇', 'singular-plural':'单复数', participles:'分词形式', custom:'我的词库' }
