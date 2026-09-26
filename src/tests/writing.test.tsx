import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest'
import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { WritingPage } from '../pages/WritingPage'
import { essays,ideas,expressions,templates,paths,readWritingDraft,saveWritingDraft,emptyWritingDraft,readWritingAttempts,expressionMatches,wordCount } from '../services/writing'
vi.mock('../context/AuthContext',()=>({useAuth:()=>({user:{id:'learner-a'}})}))
vi.mock('../lib/supabase',()=>({supabase:null}))
beforeEach(()=>localStorage.clear())
afterEach(()=>cleanup())
describe('writing content integrity',()=>{
 it('imports every essay and every confirmed idea without broken references',()=>{
  expect(essays.map(e=>e.number)).toEqual([1,2,3,4,5,6,7,11,12,13,14,15])
  expect(ideas.filter(i=>i.kind==='core')).toHaveLength(10)
  expect(ideas.filter(i=>i.kind==='judgment')).toHaveLength(5)
  expect(ideas.filter(i=>i.kind==='specialist')).toHaveLength(10)
  expect(paths).toHaveLength(6)
  expect(templates).toHaveLength(3)
  for(const e of essays){expect(e.paragraphs).toHaveLength(5);expect(templates.some(t=>t.id===e.type)).toBe(true);for(const id of e.ideaIds)expect(ideas.some(i=>i.id===id)).toBe(true);expect(expressions.some(x=>x.ideaIds.some(id=>e.ideaIds.includes(id)))).toBe(true)}
  for(const x of expressions){expect(x.sentence.includes(x.answer)).toBe(true);for(const id of x.ideaIds)expect(ideas.some(i=>i.id===id)).toBe(true)}
  for(const idea of ideas)for(const id of idea.sourceEssayIds)expect(essays.some(e=>e.id===id)).toBe(true)
 })
 it('marks the inferred question and keeps the online-shopping correction traceable',()=>{
  expect(essays[0].promptSource).toContain('非原题')
  expect(essays[2].originalOpening).toContain('those of relying solely on physical stores')
  expect(essays[2].paragraphs[0].text).toContain('outweigh its disadvantages')
 })
})
describe('writing recall and drafts',()=>{
 it('isolates account drafts and survives a new read',()=>{const draft=emptyWritingDraft();draft.fields.essay='My own essay.';saveWritingDraft('a','same-topic',draft);expect(readWritingDraft('a','same-topic').fields.essay).toBe('My own essay.');expect(readWritingDraft('b','same-topic').fields).toEqual({})})
 it('recovers from invalid local data',()=>{localStorage.setItem('lexi-writing:a:topic','broken');expect(readWritingDraft('a','topic').fields).toEqual({})})
 it('matches whole phrases with case and spacing normalization',()=>{expect(expressionMatches(' REDUCE  FINANCIAL BARRIERS ',expressions[0])).toBe(true);expect(expressionMatches('financial barriers',expressions[0])).toBe(false);expect(wordCount("People don't need cars.")).toBe(4)})
})
describe('writing practice flows',()=>{
 it('preserves an original paragraph without marking it as a fixed-answer error',async()=>{
  render(<MemoryRouter initialEntries={['/writing?track=ideas&topic=essay-3']}><WritingPage/></MemoryRouter>)
  fireEvent.change(screen.getByLabelText('观点：谁获得什么好处／受到什么影响？'),{target:{value:'Consumers save a journey.'}})
  fireEvent.click(screen.getByText('记录本次练习'))
  await waitFor(()=>expect(readWritingAttempts('learner-a')).toHaveLength(1))
  expect(readWritingAttempts('learner-a')[0].fixedCorrect).toBeUndefined()
  expect(readWritingAttempts('learner-a')[0].draft.fields.view).toBe('Consumers save a journey.')
  expect(readWritingDraft('learner-a','essay-3:ideas:P1').fields.view).toBe('Consumers save a journey.')
 })
 it('hides reference answers for independent practice and grades fixed phrases',async()=>{
  render(<MemoryRouter initialEntries={['/writing?track=expressions&topic=essay-7']}><WritingPage/></MemoryRouter>)
  fireEvent.change(screen.getByLabelText('提示等级'),{target:{value:'independent'}})
  expect(screen.queryByText('Free university education can reduce financial barriers for students.')).toBeNull()
  fireEvent.change(screen.getByLabelText('输入短语：降低经济门槛'),{target:{value:'reduce financial barriers'}})
  fireEvent.click(screen.getByText('记录本次练习'))
  await waitFor(()=>expect(readWritingAttempts('learner-a')[0]?.fixedCorrect).toBe(true))
  expect(screen.getByText('固定表达正确')).toBeTruthy()
 })
})


describe('reference visibility controls',()=>{
 it.each(['templates','ideas','expressions'])('toggles visible content and preserves draft in %s',track=>{
  const {container}=render(<MemoryRouter initialEntries={[`/writing?track=${track}&topic=essay-7`]}><WritingPage/></MemoryRouter>)
  expect((screen.getByLabelText('提示等级') as HTMLSelectElement).value).toBe('independent')
  expect(container.querySelector('.writing-hints')).toBeNull()
  fireEvent.change(screen.getByLabelText('提示等级'),{target:{value:'guided'}})
  const input=container.querySelector('textarea')!
  fireEvent.change(input,{target:{value:'Keep my draft'}})
  expect(container.querySelector('.writing-hints')).not.toBeNull()
  const hide=screen.getByRole('button',{name:'隐藏参考'})
  expect(hide.getAttribute('aria-expanded')).toBe('true')
  fireEvent.click(hide)
  expect(container.querySelector('.writing-hints')).toBeNull()
  expect(input.value).toBe('Keep my draft')
  const show=screen.getByRole('button',{name:'查看参考与自查依据'})
  expect(show.getAttribute('aria-expanded')).toBe('false')
  fireEvent.click(show)
  expect(container.querySelector('.writing-hints')).not.toBeNull()
  expect(input.value).toBe('Keep my draft')
  expect(screen.getByText(/主动查看参考 1 次/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'隐藏参考'}))
  expect(container.querySelector('.writing-hints')).toBeNull()
  expect(screen.getByText(/主动查看参考 1 次/)).toBeTruthy()
 })
 it.each(['recall','independent'])('supports manual reveal and hiding in %s mode',hintLevel=>{
  const {container}=render(<MemoryRouter initialEntries={['/writing?track=templates&topic=essay-7']}><WritingPage/></MemoryRouter>)
  fireEvent.change(screen.getByLabelText('提示等级'),{target:{value:hintLevel}})
  expect(container.querySelector('.writing-hints')).toBeNull()
  fireEvent.click(screen.getByRole('button',{name:'查看参考与自查依据'}))
  expect(container.querySelector('.writing-hints')).not.toBeNull()
  fireEvent.click(screen.getByRole('button',{name:'隐藏参考'}))
  expect(container.querySelector('.writing-hints')).toBeNull()
  fireEvent.change(screen.getByLabelText('提示等级'),{target:{value:'guided'}})
  expect(container.querySelector('.writing-hints')).not.toBeNull()
  expect(screen.getByRole('button',{name:'隐藏参考'}).getAttribute('aria-expanded')).toBe('true')
 })
})


describe('writing leaderboard source records',()=>{
 it('reuses the same attempt ID when retrying an unchanged submission',async()=>{
  render(<MemoryRouter initialEntries={['/writing?track=expressions&topic=essay-7']}><WritingPage/></MemoryRouter>)
  fireEvent.change(screen.getByLabelText('输入短语：降低经济门槛'),{target:{value:'reduce financial barriers'}})
  fireEvent.click(screen.getByText('记录本次练习'))
  await waitFor(()=>expect(screen.getByText('记录本次练习').hasAttribute('disabled')).toBe(false))
  expect(readWritingAttempts('learner-a')[0].firstTryCorrect).toBe(true)
  const id=readWritingAttempts('learner-a')[0].id
  fireEvent.change(screen.getByLabelText('提示等级'),{target:{value:'guided'}})
  fireEvent.click(screen.getByText('记录本次练习'))
  await waitFor(()=>expect(screen.getByText('记录本次练习').hasAttribute('disabled')).toBe(false))
  expect(readWritingAttempts('learner-a')).toHaveLength(1)
  expect(readWritingAttempts('learner-a')[0].id).toBe(id)
 })
 it('does not call a corrected answer first-try correct after an error',async()=>{
  render(<MemoryRouter initialEntries={['/writing?track=expressions&topic=essay-7']}><WritingPage/></MemoryRouter>)
  const input=screen.getByLabelText('输入短语：降低经济门槛')
  fireEvent.change(input,{target:{value:'wrong'}})
  fireEvent.click(screen.getByText('记录本次练习'))
  await waitFor(()=>expect(screen.getByText('记录本次练习').hasAttribute('disabled')).toBe(false))
  fireEvent.change(input,{target:{value:'reduce financial barriers'}})
  fireEvent.click(screen.getByText('记录本次练习'))
  await waitFor(()=>expect(readWritingAttempts('learner-a')).toHaveLength(2))
  expect(readWritingAttempts('learner-a')[0]).toMatchObject({fixedCorrect:true,firstTryCorrect:false})
 })
 it('does not label a guided answer first-try correct after switching back to independent',async()=>{
  render(<MemoryRouter initialEntries={['/writing?track=expressions&topic=essay-7']}><WritingPage/></MemoryRouter>)
  fireEvent.change(screen.getByLabelText('提示等级'),{target:{value:'guided'}})
  fireEvent.change(screen.getByLabelText('提示等级'),{target:{value:'independent'}})
  fireEvent.change(screen.getByLabelText('输入短语：降低经济门槛'),{target:{value:'reduce financial barriers'}})
  fireEvent.click(screen.getByText('记录本次练习'))
  await waitFor(()=>expect(readWritingAttempts('learner-a')[0]?.firstTryCorrect).toBe(false))
 })
 it('does not create a completion record when only a migration topic is entered',()=>{
  render(<MemoryRouter initialEntries={['/writing?track=expressions&topic=essay-7']}><WritingPage/></MemoryRouter>)
  fireEvent.click(screen.getByText('迁移造句'))
  fireEvent.change(screen.getByLabelText('换一个相关话题，说明你想表达的逻辑'),{target:{value:'Public transport'}})
  fireEvent.click(screen.getByText('记录本次练习'))
  expect(readWritingAttempts('learner-a')).toHaveLength(0)
  expect(screen.getByText('请先填写练习内容')).toBeTruthy()
 })
})
