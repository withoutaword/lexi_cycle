import { ArrowRight,Brain } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useSession } from '../context/SessionContext'
import { selectCards } from '../services/cardSelector'
export function MistakesPage(){const {cards,progress}=useApp(),{start}=useSession(),navigate=useNavigate();const mistakes=cards.filter(c=>(progress[c.id]?.incorrectCount??0)>0).sort((a,b)=>{const pa=progress[a.id],pb=progress[b.id];return (1-pb.firstTryCorrectCount/pb.totalReviews)-(1-pa.firstTryCorrectCount/pa.totalReviews)})
 const begin=()=>{const selected=selectCards(cards,progress,{mode:'mistakes',limit:20});start(selected,'mistakes');navigate('/practice')};return <div className="page mistakes"><p className="eyebrow">MISTAKES</p><h1>易错词</h1><p className="page-intro">错误不是失败，而是下一次记牢的起点。</p>{mistakes.length?<><button className="primary" onClick={begin}>专项复习易错词 <ArrowRight size={18}/></button><div className="mistake-list">{mistakes.map((c,i)=>{const p=progress[c.id],rate=Math.round(p.firstTryCorrectCount/p.totalReviews*100);return <div key={c.id}><span className="rank">{String(i+1).padStart(2,'0')}</span><span><b>{c.answer}</b><small>{c.translation}</small></span><span><b>{rate}%</b><small>首次正确率</small></span></div>})}</div></>:<div className="empty"><Brain/><h2>还没有易错词</h2><p>开始一组练习，你答错的词会出现在这里。</p></div>}</div>}
