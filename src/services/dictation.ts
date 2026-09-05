import type { LoadedVocabulary } from '../domain/vocabulary'
import type { WordDifference } from '../domain/dictation'
import dictationData from '../data/句子默写.json'

export const DICTATION_REVEAL_SECONDS=8
export const canRevealDictationAnswer=(draft:string,seconds:number)=>draft.trim().length>0&&seconds===0
export const DICTATION_CARDS=dictationData.items.map(card=>({...card,dataset:'dictation' as const})) as LoadedVocabulary[]
export const normalizeSentence=(value:string)=>value.trim().toLowerCase().replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/\s+/g,' ')
const words=(value:string)=>normalizeSentence(value).match(/[a-z0-9]+(?:'[a-z]+)?|[^\s\w]/g)??[]
const lexicalWords=(value:string)=>value.match(/[A-Za-z0-9]+(?:['’][A-Za-z]+)?/g)??[]
export function sentenceAccuracy(submitted:string,correct:string){const a=words(submitted),b=words(correct);if(!b.length)return 100;const row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let previous=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const saved=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,previous+(a[i-1]===b[j-1]?0:1));previous=saved}}return Math.max(0,Math.round((1-row[b.length]/Math.max(a.length,b.length))*100))}
export const isExactSentence=(submitted:string,correct:string)=>normalizeSentence(submitted)===normalizeSentence(correct)
export function sentenceDifferences(submitted:string,correct:string):WordDifference[]{const actual=lexicalWords(submitted),expected=lexicalWords(correct),a=actual.map(word=>normalizeSentence(word)),b=expected.map(word=>normalizeSentence(word)),matrix=Array.from({length:a.length+1},()=>Array<number>(b.length+1).fill(0));for(let i=0;i<=a.length;i++)matrix[i][0]=i;for(let j=0;j<=b.length;j++)matrix[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)matrix[i][j]=Math.min(matrix[i-1][j]+1,matrix[i][j-1]+1,matrix[i-1][j-1]+(a[i-1]===b[j-1]?0:1));const differences:WordDifference[]=[];let i=a.length,j=b.length;while(i||j){if(i&&j&&a[i-1]===b[j-1]){i--;j--;continue}const replace=i&&j?matrix[i-1][j-1]:Infinity,remove=i?matrix[i-1][j]:Infinity,insert=j?matrix[i][j-1]:Infinity;if(replace<=remove&&replace<=insert){differences.push({type:'replaced',expected:expected[j-1],actual:actual[i-1]});i--;j--}else if(remove<=insert){differences.push({type:'extra',actual:actual[i-1]});i--}else{differences.push({type:'missing',expected:expected[j-1]});j--}}return differences.reverse()}
export function selectDictationCards(cards:LoadedVocabulary[]=DICTATION_CARDS,excludeIds:string[]=[],limit=20,random=Math.random){const excluded=new Set(excludeIds);const pool=cards.filter(card=>card.dataset==='dictation'&&!excluded.has(card.id));return pool.map(card=>({card,order:random()})).sort((a,b)=>a.order-b.order).slice(0,limit).map(item=>item.card)}
