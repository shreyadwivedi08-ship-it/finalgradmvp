import { ShieldAlert } from 'lucide-react'

export default function Disclaimer({ className = '' }) {
  return (
    <div className={`text-[9px] text-slate-400 leading-relaxed flex items-start gap-1.5 ${className}`}>
      <ShieldAlert className="w-3 h-3 shrink-0 mt-0.5 text-slate-400" />
      <p>
        Groww AI is an operational SIP management assistant. It does not provide investment advice,
        predict returns, or recommend mutual funds. Mutual fund investments are subject to market
        risks. Please consult a SEBI-registered investment advisor before investing.
      </p>
    </div>
  )
}
