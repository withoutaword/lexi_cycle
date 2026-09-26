import { beforeEach,afterEach,describe,it,expect,vi } from 'vitest'
import { cleanup,render,screen,fireEvent,waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DictationPracticePage } from '../pages/DictationPracticePage'
import { saveDictationAttempt } from '../services/cloudRepository'
import type { LoadedVocabulary } from '../domain/vocabulary'
const mocks=vi.hoisted(()=>({upsert:vi.fn(),order:vi.fn()}))
vi.mock('../lib/supabase',()=>({supabase:{from:()=>({upsert:mocks.upsert,select:()=>({order:mocks.order})})}}))
vi.mock('../context/DictationContext',()=>({useDictation:()=>({session:{id:'test-session',results:[],cards:[{id:'dictation-x',dataset:'dictation',sentence:'Technology works.',translation:'科技能够发挥作用。',answer:'Technology works.',category:'test',lemma:'technology',targetType:'phrase'}]},addResult:vi.fn()})}))
beforeEach(()=>{mocks.upsert.mockReset().mockResolvedValue({error:null});mocks.order.mockReset().mockResolvedValue({data:[],error:null})})
afterEach(()=>cleanup())
describe('dictation leaderboard metadata',()=>{
 it.each([['Technology works.',true],['Technology fails.',false]])('captures correctness BEFORE exposing the answer: %s',async(initial,firstTry)=>{
  render(<MemoryRouter><DictationPracticePage/></MemoryRouter>)
  const textarea=screen.getByPlaceholderText('输入完整英文句子…')
  fireEvent.change(textarea,{target:{value:initial}})
  fireEvent.keyDown(textarea,{key:'Enter'})
  fireEvent.keyDown(textarea,{key:'Enter'})
  fireEvent.change(textarea,{target:{value:'Technology works.'}})
  fireEvent.click(screen.getByText('提交并进入下一题'))
  await waitFor(()=>expect(mocks.upsert).toHaveBeenCalledTimes(1))
  expect(mocks.upsert.mock.calls[0][0]).toMatchObject({first_try_correct:firstTry,is_correct:true,submission_key:'test-session:dictation-x:initial'})
 })
 it('uses a stable submission key and ignores duplicate inserts on retries',async()=>{
  const card={id:'sentence-a',dataset:'dictation',sentence:'A sentence.',translation:'一个句子。',answer:'A sentence.',category:'test',lemma:'sentence',targetType:'phrase'} as LoadedVocabulary
  const result={vocabularyId:card.id,submittedAnswer:'A sentence.',isCorrect:true,firstTryCorrect:true,accuracy:100,wordDifferences:[],submissionType:'initial' as const,submittedAt:new Date().toISOString()}
  await saveDictationAttempt('session-a',card,result)
  await saveDictationAttempt('session-a',card,result)
  expect(mocks.upsert.mock.calls[0][0].submission_key).toBe(mocks.upsert.mock.calls[1][0].submission_key)
  expect(mocks.upsert.mock.calls[0][1]).toEqual({onConflict:'user_id,submission_key',ignoreDuplicates:true})
 })
})
