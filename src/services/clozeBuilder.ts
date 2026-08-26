export interface ClozeSentence { before:string; blank:string; after:string; found:boolean }
export function buildClozeSentence(sentence:string, answer:string):ClozeSentence {
  const index = sentence.toLocaleLowerCase().indexOf(answer.toLocaleLowerCase())
  if(index < 0) return { before:sentence, blank:'', after:'', found:false }
  return { before:sentence.slice(0,index), blank:'_'.repeat(Math.max(6,answer.length)), after:sentence.slice(index+answer.length), found:true }
}
