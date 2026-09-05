import vocabulary from '../data/vocabulary_source.json'
import singularPlural from '../data/单复数.json'
import participles from '../data/分词形式.json'
import writing from '../data/写作常用.json'
import writingSingularPlural from '../data/写作-单复数.json'
import task2CoreConcepts from '../data/task2-底层概念.json'
import type { Dataset, LoadedVocabulary, VocabularySource } from '../domain/vocabulary'

type FileData={items:unknown[]}
export interface ValidationIssue { id?:string; message:string }
export interface LoadResult { items:LoadedVocabulary[]; issues:ValidationIssue[] }
const isString=(v:unknown):v is string => typeof v==='string' && v.trim().length>0
export function loadVocabulary():LoadResult {
  const files:[Dataset,FileData][]=[['vocabulary',vocabulary],['singular-plural',singularPlural],['participles',participles],['writing',writing],['writing-singular-plural',writingSingularPlural],['task2-core-concepts',task2CoreConcepts]]
  const ids=new Set<string>(), issues:ValidationIssue[]=[], items:LoadedVocabulary[]=[]
  for(const [dataset,file] of files) for(const raw of file.items) {
    const c=raw as Partial<VocabularySource>
    let message=''
    if(!isString(c.id)) message='id 为空'
    else if(ids.has(c.id)) message='id 重复'
    else if(!isString(c.sentence)) message='sentence 为空'
    else if(!isString(c.answer)) message='answer 为空'
    else if(c.targetType!=='word' && c.targetType!=='phrase') message='targetType 非法'
    else if(!c.sentence.toLowerCase().includes(c.answer.toLowerCase())) message='sentence 不包含 answer'
    else if(c.aliases && (!Array.isArray(c.aliases)||c.aliases.some(a=>!isString(a)))) message='alias 非法'
    if(message){ issues.push({id:c.id,message}); continue }
    ids.add(c.id!); items.push({...c,dataset} as LoadedVocabulary)
  }
  if(issues.length) console.warn(`[VocabularyDataLoader] skipped ${issues.length} invalid cards`,issues)
  return {items,issues}
}
