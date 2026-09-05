export type Dataset = 'vocabulary' | 'singular-plural' | 'participles' | 'writing' | 'writing-singular-plural' | 'task2-core-concepts' | 'custom'
export interface VocabularySource { id:string; category:string; categoryZh?:string; conceptGroup?:string; lemma:string; sentence:string; translation:string; answer:string; targetType:'word'|'phrase'; aliases?:string[]; confusionGroup?:string; tags?:string[]; difficulty?:number; needsReview?:boolean }
export interface LoadedVocabulary extends VocabularySource { dataset:Dataset }
export const DATASET_NAMES: Record<Dataset,string> = { vocabulary:'普通词汇', 'singular-plural':'单复数', participles:'分词形式', writing:'写作常用', 'writing-singular-plural':'写作-单复数', 'task2-core-concepts':'task2-底层概念', custom:'我的词库' }
