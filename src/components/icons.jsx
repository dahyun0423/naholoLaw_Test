// 가벼운 인라인 SVG 아이콘 세트 (외부 의존성 없음)
const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

const make = (paths) => function Icon({ size = 20, className = '', ...rest }) {
  return (
    <svg {...base} width={size} height={size} className={className} {...rest}>
      {paths}
    </svg>
  )
}

export const Logo = ({ size = 30, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <path d="M16 5 L26 13 V26 H6 V13 Z" fill="#e8f3ff" stroke="#64a8ff" strokeWidth="2" strokeLinejoin="round" />
    <path d="M16 13 v8 M11 17 h10" stroke="#64a8ff" strokeWidth="2" strokeLinecap="round" />
    <circle cx="16" cy="11.5" r="1.6" fill="#64a8ff" />
  </svg>
)

export const Home = make(<><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></>)
export const Grid = make(<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>)
export const Scale = make(<><path d="M12 3v18" /><path d="M7 21h10" /><path d="M5 7h14" /><path d="M5 7l-2.5 6a3 3 0 0 0 5 0L5 7Z" /><path d="M19 7l-2.5 6a3 3 0 0 0 5 0L19 7Z" /></>)
export const Book = make(<><path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2V5Z" /><path d="M18 17H6a2 2 0 0 0-2 2" /></>)
export const FileText = make(<><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h6" /></>)
export const Printer = make(<><path d="M6 9V3h12v6" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v7H6z" /></>)
export const Folder = make(<><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></>)
export const Bell = make(<><path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" /><path d="M10 19a2 2 0 0 0 4 0" /></>)
export const Calendar = make(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></>)
export const Search = make(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>)
export const Check = make(<path d="M5 12.5 10 17.5 19.5 7" />)
export const CheckCircle = make(<><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>)
export const Clock = make(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>)
export const Circle = make(<circle cx="12" cy="12" r="8.5" />)
export const ArrowRight = make(<><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>)
export const ArrowLeft = make(<><path d="M19 12H5" /><path d="m11 18-6-6 6-6" /></>)
export const ChevronDown = make(<path d="m6 9 6 6 6-6" />)
export const ChevronRight = make(<path d="m9 6 6 6-6 6" />)
export const Plus = make(<><path d="M12 5v14M5 12h14" /></>)
export const Upload = make(<><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M5 20h14" /></>)
export const Sparkles = make(<><path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15l-1.8-4.2L5.5 9l4.7-1.3L12 3Z" /><path d="M19 14l.8 2.2 2.2.8-2.2.8L19 20l-.8-2.2-2.2-.8 2.2-.8L19 14Z" /></>)
export const Shield = make(<><path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></>)
export const Scroll = make(<><path d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 0 2 2H8a2 2 0 0 1-2-2V4Z" /><path d="M6 4a2 2 0 0 0-2 2v2h2" /><path d="M9 8h7M9 12h7M9 16h4" /></>)
export const Gavel = make(<><path d="m14 6-7 7" /><path d="m9 4 5 5" /><path d="m17 7 3 3" /><path d="m13 11 5 5" /><path d="M4 20h8" /></>)
export const Eye = make(<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>)
export const EyeOff = make(<><path d="M3 3l18 18" /><path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-3.2 4" /><path d="M6.5 6.6A18 18 0 0 0 2 12s3.5 7 10 7a10.8 10.8 0 0 0 4-.8" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>)
export const Copy = make(<><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></>)
export const Star = make(<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.9L12 3.5Z" />)
export const ExternalLink = make(<><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6" /></>)
export const User = make(<><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></>)
export const LogOut = make(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>)
export const HelpCircle = make(<><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7" /><path d="M12 17h.01" /></>)
export const Lightbulb = make(<><path d="M9 18h6" /><path d="M10 21h4" /><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.2 1 2.5h6c0-1.3.3-1.8 1-2.5A6 6 0 0 0 12 3Z" /></>)
export const AlertTriangle = make(<><path d="M12 3 2 20h20L12 3Z" /><path d="M12 9v5M12 17h.01" /></>)
export const TrendingUp = make(<><path d="M3 17 10 10l4 4 7-7" /><path d="M14 7h7v7" /></>)
export const Video = make(<><rect x="3" y="6" width="13" height="12" rx="2" /><path d="m16 10 5-3v10l-5-3" /></>)
export const Image = make(<><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m4 18 5-5 4 4 3-3 4 4" /></>)
export const Trash = make(<><path d="M4 7h16" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /><path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" /><path d="M10 11v6M14 11v6" /></>)
export const Send = make(<><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4 20-7Z" /></>)
export const Menu = make(<><path d="M4 6h16M4 12h16M4 18h16" /></>)
export const X = make(<><path d="M6 6 18 18M18 6 6 18" /></>)
export const Building = make(<><rect x="4" y="3" width="16" height="18" rx="1.5" /><path d="M9 7h0M15 7h0M9 11h0M15 11h0M9 15h0M15 15h0" /><path d="M9 21v-3h6v3" /></>)
