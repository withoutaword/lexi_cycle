import type { LearningProgress } from '../domain/learningProgress'
export interface ProgressRepository { getAll():Record<string,LearningProgress>; get(id:string):LearningProgress|undefined; save(progress:LearningProgress):void }
export class LocalStorageProgressRepository implements ProgressRepository {
  constructor(private key='lexi-cycle-progress-v1'){}
  getAll(){ try{return JSON.parse(localStorage.getItem(this.key) ?? '{}') as Record<string,LearningProgress>}catch{return {}} }
  get(id:string){return this.getAll()[id]}
  save(progress:LearningProgress){const all=this.getAll();all[progress.vocabularyId]=progress;localStorage.setItem(this.key,JSON.stringify(all))}
}
