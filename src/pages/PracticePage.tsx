import { X } from 'lucide-react'
import { Navigate,useNavigate } from 'react-router-dom'
import { PracticeCard } from '../components/PracticeCard'
import { ProgressBar } from '../components/ProgressBar'
import { useApp } from '../context/AppContext'
import { useSession } from '../context/SessionContext'
import { DATASET_NAMES } from '../domain/vocabulary'
export function PracticePage(){const {session,addResult}=useSession(),{record}=useApp(),navigate=useNavigate();if(!session)return <Navigate to="/"/>;const index=session.results.length,card=session.cards[index];if(!card)return <Navigate to="/summary"/>;return <div className="practice-page"><div className="practice-top"><button className="icon-button" onClick={()=>navigate('/')} aria-label="退出"><X/></button><div><span>{index+1} / {session.cards.length}</span><ProgressBar value={index} total={session.cards.length}/></div><span className="dataset-pill">{DATASET_NAMES[card.dataset]}</span></div><PracticeCard key={card.id} card={card} onComplete={result=>{record(result);addResult(result);if(index+1>=session.cards.length)navigate('/summary')}}/><p className="keyboard-hint"><kbd>Enter</kbd> 提交答案</p></div>}
