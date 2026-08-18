import { Link } from 'react-router-dom'
import { versionInfo } from '../lib/docboard.js'
import { Badge, Button, cx } from './ui.jsx'

const isImage = (name = '') => /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(name)
const extensionOf = (name = '') => name.split('.').pop()?.toUpperCase() || 'FILE'
const numberFrom = (value = '') => [...String(value)].reduce((sum, char) => sum + char.charCodeAt(0), 0)

const formatMoment = (value, fallback = '2026. 8. 9. 14:40') => {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const hasTime = typeof value === 'number' || String(value).includes('T')
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
    ...(hasTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
  }).format(date)
}

const purposeFallback = (name = '') => {
  if (/계약|차용|약정/.test(name)) return '계약 체결 사실과 보증금·지급 조건을 입증합니다.'
  if (/입금|이체|송금|납부/.test(name)) return '청구 금액을 실제로 지급한 사실과 지급일을 입증합니다.'
  if (/대화|문자|카카오/.test(name)) return '상대방에게 반환을 요청했고 상대방이 이를 인식한 사실을 입증합니다.'
  if (/사진|하자|현관|벽면/.test(name)) return '목적물의 인도 당시 상태와 손상 범위를 입증합니다.'
  if (/소장/.test(name)) return '법원에 제출할 청구취지와 청구원인을 정리한 문서입니다.'
  return '사건의 주요 사실관계와 청구 내용을 뒷받침하는 자료입니다.'
}

function documentBody(name, item) {
  if (/계약/.test(name)) {
    return {
      heading: '주택 임대차 계약서',
      intro: '아래 당사자는 다음 조건으로 주택 임대차 계약을 체결한다.',
      fields: [
        ['소재지', '서울특별시 관악구 남부순환로 1820, 503호'],
        ['임대차 기간', '2024. 1. 1. ~ 2026. 1. 1.'],
        ['보증금', '금 10,000,000원'],
        ['차임', '월 650,000원 · 매월 25일'],
      ],
      section: '특약사항',
      paragraphs: ['계약 종료 시 임대인은 목적물 인도와 동시에 보증금을 반환한다.', '관리비와 공과금은 인도일을 기준으로 정산한다.'],
    }
  }
  if (/입금|이체|송금|납부/.test(name)) {
    return {
      heading: '거래내역 확인서',
      intro: '조회 계좌 110-***-928451 · 예금주 홍길동',
      fields: [
        ['2024. 01. 01.', '김철수 · 10,000,000원'],
        ['2024. 02. 25.', '월세 · 650,000원'],
        ['2024. 03. 25.', '월세 · 650,000원'],
        ['2024. 04. 25.', '월세 · 650,000원'],
      ],
      section: '발급 정보',
      paragraphs: ['발급일 2026. 8. 8. · 조회 기간 2024. 1. 1. ~ 2026. 1. 31.', '본 확인서는 인터넷뱅킹 거래내역을 기준으로 작성되었습니다.'],
    }
  }
  if (/소장/.test(name)) {
    return {
      heading: item.title?.includes('갑 제') ? '서증' : '소장',
      intro: `${item.caseTitle || '임대차 보증금 반환 청구'} · ${item.court || '서울중앙지방법원'}`,
      fields: [['원고', '홍길동'], ['피고', '김철수'], ['청구금액', '금 10,000,000원'], ['사건', item.caseNo || '2024가단123456']],
      section: '청구취지',
      paragraphs: ['피고는 원고에게 금 10,000,000원 및 이에 대한 지연손해금을 지급하라.', '소송비용은 피고의 부담으로 한다는 판결을 구합니다.'],
    }
  }
  return {
    heading: name.replace(/\.[^.]+$/, '').replaceAll('_', ' '),
    intro: `${item.caseTitle || '임대차 보증금 반환 청구'} 관련 제출 자료`,
    fields: [['작성자', '홍길동'], ['확인일', '2026. 8. 9.'], ['사건번호', item.caseNo || '2024가단123456'], ['관할', item.court || '서울중앙지방법원']],
    section: '주요 내용',
    paragraphs: [purposeFallback(name), '원본과 대조하여 누락된 페이지와 가려진 개인정보가 없는지 확인했습니다.'],
  }
}

function PaperPreview({ item, model }) {
  const body = documentBody(model.file, item)
  if (model.image) {
    return (
      <div className="relative mx-auto aspect-[4/3] w-full max-w-[620px] overflow-hidden rounded-lg bg-[#dfe3e8] shadow-[0_8px_28px_rgba(15,23,42,0.16)]">
        <div className="absolute inset-5 rotate-[-1deg] rounded bg-[#f7f3e8] p-6 shadow-xl sm:inset-8 sm:p-9">
          <div className="border-b-2 border-ink-800 pb-3 text-center">
            <p className="text-[18px] font-bold text-ink-900">현장 사진 기록</p>
            <p className="mt-1 text-[11px] text-ink-500">촬영 2026. 2. 22. 15:34 · 서울 관악구</p>
          </div>
          <div className="mt-5 grid h-[55%] place-items-center rounded border border-ink-200 bg-gradient-to-br from-[#d8d1c7] via-[#f0ece5] to-[#b7aca0]">
            <div className="h-[70%] w-px rotate-[18deg] bg-ink-500/60 shadow-[6px_0_0_rgba(99,107,118,.2)]" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-[11px] text-ink-600">
            <p><b className="text-ink-800">촬영 위치</b><br />거실 남측 벽면</p>
            <p><b className="text-ink-800">확인 내용</b><br />세로 균열 약 47cm</p>
          </div>
        </div>
        {(item.thumb || item.url) && (
          <img
            src={item.thumb || item.url}
            alt={`${model.file} 원본`}
            className="absolute inset-0 h-full w-full bg-[#dfe3e8] object-contain"
            onError={(event) => { event.currentTarget.style.display = 'none' }}
          />
        )}
        <span className="absolute bottom-3 right-3 rounded-md bg-black/60 px-2 py-1 text-[10px] font-medium text-white">원본 비율 {model.resolution}</span>
      </div>
    )
  }

  return (
    <article className="mx-auto min-h-[660px] w-full max-w-[510px] bg-white px-10 py-12 text-ink-900 shadow-[0_8px_28px_rgba(15,23,42,0.14)] sm:px-14">
      <p className="text-center text-[22px] font-bold tracking-[0.12em]">{body.heading}</p>
      <p className="mt-3 text-center text-[11px] text-ink-500">{body.intro}</p>
      <dl className="mt-10 border-y border-ink-300 text-[11.5px]">
        {body.fields.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[88px_1fr] border-b border-ink-100 py-2.5 last:border-0">
            <dt className="font-semibold text-ink-600">{label}</dt>
            <dd className="text-ink-800">{value}</dd>
          </div>
        ))}
      </dl>
      <h4 className="mt-9 text-[13px] font-bold">{body.section}</h4>
      <div className="mt-3 space-y-3 text-[11.5px] leading-[1.9] text-ink-700">
        {body.paragraphs.map((paragraph, index) => <p key={paragraph}>{index + 1}. {paragraph}</p>)}
      </div>
      <div className="mt-14 text-center text-[11px] leading-7 text-ink-600">
        <p>2026년 8월 9일</p>
        <p className="font-semibold text-ink-800">작성자 홍 길 동 (서명)</p>
        <p className="mt-7 text-[15px] font-bold tracking-[0.2em]">서울중앙지방법원 귀중</p>
      </div>
      <p className="mt-12 text-center text-[10px] tabular-nums text-ink-400">- {model.currentPage} -</p>
    </article>
  )
}

export default function EvidencePreview({ item, onDownload }) {
  const info = versionInfo(item)
  const seed = numberFrom(item.file || item.title)
  const model = {
    file: item.file || item.title || '증빙자료.pdf',
    image: isImage(item.file || item.title),
    pages: item.pages || (seed % 6) + 2,
    currentPage: 1,
    resolution: item.resolution || `${1920 + (seed % 3) * 480} × ${1440 + (seed % 2) * 720}`,
    category: item.folderName || item.code || (item.group === 'evidence' ? '증거자료' : '소장·서면'),
  }
  const uploadedAt = item.createdAt || item.updatedAt || item.date
  const changedAt = item.updatedAt || item.createdAt || item.date

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-ink-50 px-4 py-3">
        <Badge tone={item.status === '제출완료' ? 'green' : item.status === '보완필요' ? 'amber' : 'gray'}>{item.status || '미제출'}</Badge>
        <span className="text-[12px] font-semibold text-ink-700">{model.category}</span>
        <span className="text-[12px] text-ink-400">{extensionOf(model.file)} · {item.size || '1.2 MB'} · {model.image ? model.resolution : `${model.pages}쪽`}</span>
        <span className="ml-auto text-[11.5px] tabular-nums text-ink-400">최신 v{info.currentVersion}</span>
      </div>

      <div className="grid min-h-[620px] overflow-hidden rounded-2xl border border-ink-200 bg-white lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 bg-[#edf0f3] p-4 sm:p-6">
          <div className="mb-3 flex items-center justify-between text-[11.5px] text-ink-500">
            <span>{model.image ? '이미지 원본' : `1 / ${model.pages} 페이지`}</span>
            <span>화면 맞춤 · 100%</span>
          </div>
          <PaperPreview item={item} model={model} />
          {!model.image && model.pages > 1 && (
            <div className="mx-auto mt-4 flex max-w-[510px] gap-2 overflow-x-auto pb-1" aria-label="페이지 미리보기">
              {Array.from({ length: Math.min(model.pages, 5) }, (_, index) => (
                <button key={index} type="button" className={cx('grid h-16 w-12 shrink-0 place-items-center rounded border bg-white text-[10px] font-semibold', index === 0 ? 'border-brand-300 text-brand-500 ring-2 ring-brand-100' : 'border-ink-200 text-ink-400')}>
                  {index + 1}
                </button>
              ))}
              {model.pages > 5 && <span className="grid h-16 w-12 shrink-0 place-items-center text-[11px] text-ink-400">+{model.pages - 5}</span>}
            </div>
          )}
        </div>

        <aside className="border-t border-ink-200 p-5 lg:border-l lg:border-t-0">
          {info.hasUnsubmittedRevision && (
            <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-3.5 py-3">
              <p className="text-[12px] font-bold text-red-500">제출본과 최신본이 달라요</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-red-500/90">v{info.submitted.version} 제출 후 v{info.latest.version}이 생성됐습니다.</p>
            </div>
          )}

          <section>
            <h4 className="text-[12px] font-bold text-ink-900">사건 정보</h4>
            <dl className="mt-3 space-y-3 text-[12px]">
              <Meta label="사건" value={item.caseTitle || '임대차 보증금 반환 청구'} />
              <Meta label="사건번호" value={item.caseNo || '2024가단123456'} />
              <Meta label="법원" value={item.court || '서울중앙지방법원'} />
              <Meta label="입증취지" value={item.purpose || item.desc || purposeFallback(model.file)} multiline />
            </dl>
          </section>

          <section className="mt-6 border-t border-ink-100 pt-5">
            <h4 className="text-[12px] font-bold text-ink-900">파일 정보</h4>
            <dl className="mt-3 space-y-3 text-[12px]">
              <Meta label="파일명" value={model.file} multiline />
              <Meta label="생성·업로드" value={formatMoment(uploadedAt)} />
              <Meta label="마지막 수정" value={formatMoment(changedAt, '2026. 8. 11. 18:05')} />
              <Meta label="파일 크기" value={item.size || '1.2 MB'} />
              <Meta label="등록 경로" value={item.source || '사용자 직접 업로드'} />
              <Meta label="등록자" value={item.uploadedBy || '홍길동'} />
              <Meta label="개인정보 확인" value={item.privacyReview || '개인정보 확인 완료'} />
              <Meta label="제출 정보" value={item.submissionLabel || (item.submittedAt ? `${item.submittedAt} 제출 완료` : '아직 제출하지 않음')} />
              <Meta label="문서 식별값" value={item.checksum || `NH-${String(seed).padStart(6, '0').slice(-6)}`} />
            </dl>
          </section>

          <section className="mt-6 border-t border-ink-100 pt-5">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-[12px] font-bold text-ink-900">버전·제출 기록</h4>
              <span className="text-[11px] text-ink-400">{info.versions.length}개</span>
            </div>
            <ol className="mt-3 space-y-2">
              {[...info.versions].reverse().slice(0, 3).map((version) => (
                <li key={version.id} className="rounded-lg bg-ink-50 px-3 py-2">
                  <p className="flex items-center justify-between gap-2 text-[11.5px]">
                    <b className="font-semibold text-ink-700">v{version.version}</b>
                    <span className="text-ink-400">{formatMoment(version.createdAt)}</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-500">{version.submittedAt ? `제출 ${formatMoment(version.submittedAt)}` : version.note || '생성본'}</p>
                </li>
              ))}
            </ol>
          </section>

          <div className="mt-6 flex flex-col gap-2 border-t border-ink-100 pt-5">
            <Button size="sm" onClick={onDownload}>원본 다운로드</Button>
            {item.real && item.caseKey && <Button as={Link} to={`/app/cases/${item.caseKey}`} variant="neutral" size="sm">사건 상세 보기</Button>}
          </div>
        </aside>
      </div>

      <p className="text-[11.5px] leading-relaxed text-ink-400">미리보기와 원본의 페이지 수·서명·개인정보를 대조한 뒤 제출하세요. 예시 자료의 본문과 수치는 화면 확인을 위한 임의 값입니다.</p>
    </div>
  )
}

function Meta({ label, value, multiline = false }) {
  return (
    <div>
      <dt className="text-[11px] font-medium text-ink-400">{label}</dt>
      <dd className={cx('mt-0.5 text-[12px] text-ink-700', multiline ? 'break-words leading-relaxed' : 'truncate')} title={String(value)}>{value}</dd>
    </div>
  )
}
