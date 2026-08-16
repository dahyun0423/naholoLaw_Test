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
  <img
    width={size}
    height={size}
    src="/figma/landing/logo.svg"
    alt=""
    aria-hidden="true"
    className={`block shrink-0 ${className}`}
  />
)

// Figma 1696:27821 — symbol + Paperlogy wordmark are one brand lockup.
// Keep the geometry here so headers and sidebars cannot silently drift apart.
export const BrandLogo = ({
  markSize = 30,
  wordmarkSize = 18,
  gap = 8,
  className = '',
}) => (
  <span
    className={`inline-flex shrink-0 items-center text-brand-300 ${className}`}
    style={{ gap }}
  >
    <Logo size={markSize} />
    <span
      className="whitespace-nowrap"
      style={{
        fontFamily: 'Paperlogy, Pretendard, sans-serif',
        fontSize: wordmarkSize,
        fontWeight: 700,
        letterSpacing: '-0.025em',
        lineHeight: 1.6,
      }}
    >
      나홀로법에
    </span>
  </span>
)

export const Home = make(<><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></>)
export const Grid = make(<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>)
export const Scale = make(<><path d="M12 3v18" /><path d="M7 21h10" /><path d="M5 7h14" /><path d="M5 7l-2.5 6a3 3 0 0 0 5 0L5 7Z" /><path d="M19 7l-2.5 6a3 3 0 0 0 5 0L19 7Z" /></>)
export const Book = make(<><path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2V5Z" /><path d="M18 17H6a2 2 0 0 0-2 2" /></>)
export const FileText = make(<><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h6" /></>)
export const Printer = make(<><path d="M6 9V3h12v6" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v7H6z" /></>)
export const Folder = make(<><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></>)
/**
 * Figma 「최근 생성 문서」 줄머리 폴더 — 면 blue100 · 선 blue200. 26×18 그대로.
 * 도형이 26×18을 꽉 채우므로 viewBox를 0.5씩 넓힌다 — 안 그러면 테두리 절반이 잘려 선이 사라진다.
 */
export const DocFolder = ({ className = '', ...rest }) => (
  <svg width="26" height="18" viewBox="-0.5 -0.5 27 19" fill="none" className={className} aria-hidden {...rest}>
    <path
      d="M8.93457 0C9.97905 8.80081e-05 10.9976 0.327196 11.8467 0.935547C12.4823 1.3915 13.2449 1.63672 14.0272 1.63672H21C23.7614 1.63672 26 3.8753 26 6.63672V13C26 15.7614 23.7614 18 21 18H5C2.23858 18 0 15.7614 0 13V1.87633C0 1.744 0.107278 1.63672 0.239611 1.63672C0.327287 1.63672 0.407336 1.58842 0.452776 1.51343C1.00245 0.606397 1.9987 0 3.13672 0H8.93457Z"
      className="fill-brand-100 stroke-brand-200"
      strokeWidth="1"
    />
  </svg>
)

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

/* ── 사이드바 아이콘 (Figma 293:62148 내보내기 그대로) ──────────────
   위 세트와 격자가 다르다 — 내보낸 원본이 20 격자라 좌표를 그대로 둔다.
   색만 currentColor로 바꿔, 선택된 칸에서 흰 글자와 같이 반전되게 한다. */

const figmaBase = { width: 20, height: 20, viewBox: '0 0 20 20', strokeLinecap: 'round', strokeLinejoin: 'round' }

const stroked = (paths, strokeWidth = 1.6658) => function Icon({ size = 20, className = '', ...rest }) {
  return <svg {...figmaBase} width={size} height={size} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className={className} {...rest}>{paths}</svg>
}

/** 내보낸 원본이 20 격자보다 작아 Figma가 넣어둔 여백만큼 밀어준다. */
const filled = (path, dx = 0, dy = 0) => function Icon({ size = 20, className = '', ...rest }) {
  return (
    <svg {...figmaBase} width={size} height={size} fill="currentColor" className={className} {...rest}>
      <g transform={`translate(${dx} ${dy})`}><path fillRule="evenodd" clipRule="evenodd" d={path} /></g>
    </svg>
  )
}

/** 대시보드 — 크기가 다른 네 칸 */
export const LayoutDashboard = stroked(<>
  <path d="M7.5 2.5H3.33333C2.8731 2.5 2.5 2.8731 2.5 3.33333V9.16667C2.5 9.6269 2.8731 10 3.33333 10H7.5C7.96024 10 8.33333 9.6269 8.33333 9.16667V3.33333C8.33333 2.8731 7.96024 2.5 7.5 2.5Z" />
  <path d="M16.6667 2.5H12.5C12.0398 2.5 11.6667 2.8731 11.6667 3.33333V5.83333C11.6667 6.29357 12.0398 6.66667 12.5 6.66667H16.6667C17.1269 6.66667 17.5 6.29357 17.5 5.83333V3.33333C17.5 2.8731 17.1269 2.5 16.6667 2.5Z" />
  <path d="M16.6667 10H12.5C12.0398 10 11.6667 10.3731 11.6667 10.8333V16.6667C11.6667 17.1269 12.0398 17.5 12.5 17.5H16.6667C17.1269 17.5 17.5 17.1269 17.5 16.6667V10.8333C17.5 10.3731 17.1269 10 16.6667 10Z" />
  <path d="M7.5 13.3333H3.33333C2.8731 13.3333 2.5 13.7064 2.5 14.1667V16.6667C2.5 17.1269 2.8731 17.5 3.33333 17.5H7.5C7.96024 17.5 8.33333 17.1269 8.33333 16.6667V14.1667C8.33333 13.7064 7.96024 13.3333 7.5 13.3333Z" />
</>)

/** 절차 안내 — 펼친 책 */
export const BookOpen = stroked(<>
  <path d="M10 5.83333V17.5" />
  <path d="M2.5 15C2.27899 15 2.06702 14.9122 1.91074 14.7559C1.75446 14.5996 1.66667 14.3877 1.66667 14.1667V3.33333C1.66667 3.11232 1.75446 2.90036 1.91074 2.74408C2.06702 2.5878 2.27899 2.5 2.5 2.5H6.66667C7.55072 2.5 8.39857 2.85119 9.02369 3.47631C9.64881 4.10143 10 4.94928 10 5.83333C10 4.94928 10.3512 4.10143 10.9763 3.47631C11.6014 2.85119 12.4493 2.5 13.3333 2.5H17.5C17.721 2.5 17.933 2.5878 18.0893 2.74408C18.2455 2.90036 18.3333 3.11232 18.3333 3.33333V14.1667C18.3333 14.3877 18.2455 14.5996 18.0893 14.7559C17.933 14.9122 17.721 15 17.5 15H12.5C11.837 15 11.2011 15.2634 10.7322 15.7322C10.2634 16.2011 10 16.837 10 17.5C10 16.837 9.73661 16.2011 9.26777 15.7322C8.79893 15.2634 8.16304 15 7.5 15H2.5Z" />
</>, 2)

/** 증빙 자료 — 열린 폴더 */
export const FolderOpen = stroked(
  <path d="M5 11.6667L6.25 9.25C6.38589 8.98012 6.5926 8.75225 6.84801 8.59079C7.10342 8.42933 7.39792 8.34033 7.7 8.33333H16.6667M16.6667 8.33333C16.9213 8.33289 17.1726 8.39078 17.4014 8.50257C17.6301 8.61436 17.8302 8.77707 17.9863 8.97822C18.1424 9.17937 18.2503 9.41361 18.3018 9.66296C18.3533 9.91231 18.347 10.1701 18.2833 10.4167L17 15.4167C16.9072 15.7763 16.6968 16.0946 16.4024 16.3211C16.108 16.5475 15.7464 16.6692 15.375 16.6667H3.33333C2.89131 16.6667 2.46738 16.4911 2.15482 16.1785C1.84226 15.8659 1.66667 15.442 1.66667 15V4.16667C1.66667 3.72464 1.84226 3.30072 2.15482 2.98816C2.46738 2.67559 2.89131 2.5 3.33333 2.5H6.58333C6.86207 2.49727 7.13704 2.56449 7.38308 2.69552C7.62912 2.82654 7.83837 3.01719 7.99167 3.25L8.66667 4.25C8.81842 4.48044 9.02502 4.6696 9.26792 4.8005C9.51081 4.93141 9.78241 4.99995 10.0583 5H15C15.442 5 15.866 5.17559 16.1785 5.48816C16.4911 5.80072 16.6667 6.22464 16.6667 6.66667V8.33333Z" />,
)

/** 사건 관리 — 새 사건(문서 + 추가) */
export const CaseNew = filled('M2.5 6.55922e-08C1.83696 6.55922e-08 1.20107 0.263392 0.732233 0.732233C0.263392 1.20107 0 1.83696 0 2.5V15C0 15.663 0.263392 16.2989 0.732233 16.7678C1.20107 17.2366 1.83696 17.5 2.5 17.5H6.5625C6.81114 17.5 7.0496 17.4012 7.22541 17.2254C7.40123 17.0496 7.5 16.8111 7.5 16.5625C7.5 16.3139 7.40123 16.0754 7.22541 15.8996C7.0496 15.7238 6.81114 15.625 6.5625 15.625H2.5C2.33424 15.625 2.17527 15.5592 2.05806 15.4419C1.94085 15.3247 1.875 15.1658 1.875 15V2.5C1.875 2.33424 1.94085 2.17527 2.05806 2.05806C2.17527 1.94085 2.33424 1.875 2.5 1.875H10C10.1658 1.875 10.3247 1.94085 10.4419 2.05806C10.5592 2.17527 10.625 2.33424 10.625 2.5V9.0625C10.625 9.31114 10.7238 9.5496 10.8996 9.72541C11.0754 9.90123 11.3139 10 11.5625 10C11.8111 10 12.0496 9.90123 12.2254 9.72541C12.4012 9.5496 12.5 9.31114 12.5 9.0625V4.205L15.2375 5.63C15.2741 5.64887 15.3066 5.6748 15.3332 5.70628C15.3597 5.73776 15.3798 5.77418 15.3922 5.81344C15.4047 5.8527 15.4092 5.89404 15.4056 5.93506C15.402 5.97609 15.3903 6.016 15.3712 6.0525L14.0313 8.63C13.9257 8.84947 13.9097 9.10139 13.9866 9.33244C14.0636 9.56349 14.2274 9.75554 14.4434 9.86795C14.6595 9.98035 14.9107 10.0043 15.1441 9.93467C15.3775 9.86506 15.5746 9.70738 15.6938 9.495L17.035 6.9175C17.3027 6.40281 17.355 5.80287 17.1803 5.24964C17.0057 4.69641 16.6184 4.23522 16.1038 3.9675L12.4637 2.0725C12.363 1.49217 12.0606 0.966029 11.6099 0.586867C11.1592 0.207704 10.589 -0.000134798 10 6.55922e-08H2.5ZM10 15C10 14.7514 10.0988 14.5129 10.2746 14.3371C10.4504 14.1613 10.6889 14.0625 10.9375 14.0625H12.8125V12.1875C12.8125 11.9389 12.9113 11.7004 13.0871 11.5246C13.2629 11.3488 13.5014 11.25 13.75 11.25C13.9986 11.25 14.2371 11.3488 14.4129 11.5246C14.5887 11.7004 14.6875 11.9389 14.6875 12.1875V14.0625H16.5625C16.8111 14.0625 17.0496 14.1613 17.2254 14.3371C17.4012 14.5129 17.5 14.7514 17.5 15C17.5 15.2486 17.4012 15.4871 17.2254 15.6629C17.0496 15.8387 16.8111 15.9375 16.5625 15.9375H14.6875V17.8125C14.6875 18.0611 14.5887 18.2996 14.4129 18.4754C14.2371 18.6512 13.9986 18.75 13.75 18.75C13.5014 18.75 13.2629 18.6512 13.0871 18.4754C12.9113 18.2996 12.8125 18.0611 12.8125 17.8125V15.9375H10.9375C10.6889 15.9375 10.4504 15.8387 10.2746 15.6629C10.0988 15.4871 10 15.2486 10 15Z', 1.25, 1.25)

/** 가이드 모음 — 갈피 꽂은 책 */
export const BookMarked = filled('M1.66667 16.6667C1.20833 16.6667 0.816111 16.5036 0.49 16.1775C0.163889 15.8514 0.000555556 15.4589 0 15V1.66667C0 1.20833 0.163333 0.816111 0.49 0.49C0.816666 0.163889 1.20889 0.000555556 1.66667 0H11.6667C12.125 0 12.5175 0.163333 12.8442 0.49C13.1708 0.816667 13.3339 1.20889 13.3333 1.66667V15C13.3333 15.4583 13.1703 15.8508 12.8442 16.1775C12.5181 16.5042 12.1256 16.6672 11.6667 16.6667H1.66667ZM1.66667 15H11.6667V1.66667H10V7.5L7.91667 6.25L5.83333 7.5V1.66667H1.66667V15Z', 3.3333, 1.6667)
