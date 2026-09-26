import essays from '../data/writing/essays.json'
import ideas from '../data/writing/ideas.json'
import expressions from '../data/writing/expressions.json'
import templates from '../data/writing/templates.json'
import paths from '../data/writing/paths.json'
import resources from '../data/writing/resources.json'
import { supabase } from '../lib/supabase'
export { essays, ideas, expressions, templates, paths, resources }
export type WritingTrack = 'templates' | 'ideas' | 'expressions'
export type HintLevel = 'guided' | 'recall' | 'independent'
export interface WritingDraft { fields:Record<string,string>; checks:string[]; hintLevel:HintLevel; hintViews:number; startedAt:number; updatedAt:number }
export interface WritingAttempt { id:string; workspaceId:string; track:WritingTrack; topic:string; exercise:string; draft:WritingDraft; elapsedSeconds:number; fixedCorrect?:boolean; firstTryCorrect?:boolean; submittedAt:number }
export const emptyWritingDraft=():WritingDraft=>({fields:{},checks:[],hintLevel:'independent',hintViews:0,startedAt:Date.now(),updatedAt:Date.now()})
const prefix=(userId:string)=>`lexi-writing:${encodeURIComponent(userId)}:`
export function validWritingDraft(value:unknown):value is WritingDraft {
 if(!value||typeof value!=='object')return false
 const d=value as WritingDraft
 return !!d.fields&&typeof d.fields==='object'&&!Array.isArray(d.fields)&&Object.values(d.fields).every(v=>typeof v==='string')&&Array.isArray(d.checks)&&d.checks.every(v=>typeof v==='string')&&['guided','recall','independent'].includes(d.hintLevel)&&Number.isFinite(d.startedAt)&&Number.isFinite(d.updatedAt)&&Number.isFinite(d.hintViews)
}
export function readWritingDraft(userId:string,id:string):WritingDraft {
 try { const raw=JSON.parse(localStorage.getItem(prefix(userId)+id)??'null'); if(validWritingDraft(raw))return raw }catch{ /* Recover with an empty draft. */ }
 return emptyWritingDraft()
}
export function saveWritingDraft(userId:string,id:string,draft:WritingDraft){localStorage.setItem(prefix(userId)+id,JSON.stringify(draft))}
export function readWritingAttempts(userId:string):WritingAttempt[]{try{const raw=JSON.parse(localStorage.getItem(prefix(userId)+'attempts')??'[]');return Array.isArray(raw)?raw.filter(a=>a&&typeof a.id==='string'&&validWritingDraft(a.draft)):[]}catch{return[]}}
export function saveWritingAttempt(userId:string,attempt:WritingAttempt){const previous=readWritingAttempts(userId).filter(a=>a.id!==attempt.id);localStorage.setItem(prefix(userId)+'attempts',JSON.stringify([attempt,...previous].slice(0,300)))}
export function wordCount(text:string){return (text.match(/[A-Za-z0-9]+(?:['’][A-Za-z]+)?/g)??[]).length}
export function expressionMatches(input:string,expression:{answer:string;aliases:string[]}){const normalize=(s:string)=>s.trim().toLowerCase().replace(/\s+/g,' ');return [expression.answer,...expression.aliases].some(answer=>normalize(answer)===normalize(input))}
export async function syncWritingAttempt(userId:string,attempt:WritingAttempt){if(!supabase)throw new Error('未配置云端，记录已保存在本机');const {error}=await supabase.from('writing_attempts').upsert({id:attempt.id,user_id:userId,payload:attempt},{onConflict:'id'});if(error)throw new Error('云端保存失败，记录已保存在本机。请检查 writing.sql 是否已执行，稍后重试。')}
export async function syncWritingDraft(userId:string,id:string,draft:WritingDraft){if(!supabase)throw new Error('未配置云端，草稿已保存在本机');const {error}=await supabase.from('writing_drafts').upsert({user_id:userId,workspace_id:id,payload:draft,updated_at:new Date().toISOString()},{onConflict:'user_id,workspace_id'});if(error)throw new Error('云端保存失败，草稿已保存在本机。请检查 writing.sql 是否已执行。')}
export async function recoverWritingDraft(userId:string,id:string):Promise<WritingDraft|null>{if(!supabase)throw new Error('未配置云端');const {data,error}=await supabase.from('writing_drafts').select('payload').eq('user_id',userId).eq('workspace_id',id).maybeSingle();if(error)throw new Error('读取云端草稿失败，请检查 writing.sql 是否已执行');if(data?.payload&&!validWritingDraft(data.payload))throw new Error('云端草稿格式异常，本机内容已保留');return data?.payload??null}
export async function loadWritingHistory(userId:string):Promise<WritingAttempt[]>{if(!supabase)return[];const {data,error}=await supabase.from('writing_attempts').select('payload').eq('user_id',userId).order('created_at',{ascending:false}).limit(300);if(error)throw new Error('读取云端记录失败，本机记录仍可查看');return (data??[]).map(row=>row.payload as WritingAttempt).filter(a=>a&&typeof a.id==='string'&&validWritingDraft(a.draft))}
