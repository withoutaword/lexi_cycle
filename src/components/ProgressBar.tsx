export function ProgressBar({value,total}:{value:number;total:number}){return <div className="progress-track"><div className="progress-fill" style={{width:`${total?value/total*100:0}%`}} /></div>}
