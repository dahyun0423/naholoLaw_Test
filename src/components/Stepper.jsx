// 가로 진행 스텝퍼 — 배달 추적처럼
//
// 지나온 칸은 채우고, 지금 칸에서 빛이 번진다.
//
// ── 왜 선을 칸 밖으로 뽑지 않는가 ───────────────────────────
// 예전에는 각 칸에서 `left:-50% ~ right:50%` 로 앞 칸까지 선을 뻗었다.
// 그러면 (1) 선이 첫 칸 왼쪽·마지막 칸 오른쪽으로 삐져나가 카드 여백을 침범하고
// (2) 점의 중심과 선의 중심이 몇 px씩 어긋난다.
//
// 그래서 칸마다 **자기 안에서만** 좌·우 반쪽 선을 그린다.
// 점과 선을 같은 flex 줄에 넣어 세로 중앙 정렬을 브라우저에 맡기면
// 픽셀을 손으로 맞출 일이 없다.

import { cx } from './ui.jsx'

/**
 * @param steps   [{ key, label, note, optional, done }]
 * @param current 지금 서 있는 칸 index
 * @param onPick  칸을 눌렀을 때 (없으면 읽기 전용)
 * @param picked  눌러서 보고 있는 칸 (없으면 current)
 */
export default function Stepper({ steps, current, onPick, picked }) {
  const sel = picked ?? current
  const last = steps.length - 1

  return (
    <ol className="grid" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0,1fr))` }}>
      {steps.map((s, i) => {
        const now = i === current
        const on = i === sel
        const Tag = onPick ? 'button' : 'div'

        return (
          <li key={s.key ?? s.label} className="min-w-0 first:[&_[aria-hidden]]:rounded-l-full last:[&_[aria-hidden]]:rounded-r-full">
            <Tag
              {...(onPick ? { type: 'button', onClick: () => onPick(i), 'aria-current': now ? 'step' : undefined } : {})}
              className={cx(
                'flex w-full flex-col items-center gap-2.5 rounded-lg pb-1 outline-none',
                onPick && 'transition-colors hover:bg-ink-50 focus-visible:ring-4 focus-visible:ring-brand-100',
              )}
            >
              {/* 점 + 좌우 반쪽 선 — 한 줄 안에서 세로 중앙 정렬 */}
              <span className="relative flex h-5 w-full items-center justify-center">
                {/* 칸 경계에서 서브픽셀 반올림으로 실틈이 생긴다. 1px씩 넘겨 이어 붙인다. */}
                {i > 0 && (
                  <span aria-hidden className={cx('absolute -left-px right-1/2 h-1', i <= current ? 'bg-brand-300' : 'bg-ink-200')} />
                )}
                {i < last && (
                  <span aria-hidden className={cx('absolute left-1/2 -right-px h-1', i < current ? 'bg-brand-300' : 'bg-ink-200')} />
                )}
                <span
                  className={cx(
                    'relative z-[1] rounded-full',
                    now ? 'step-now h-[15px] w-[15px] bg-brand-300'
                      : s.done ? 'h-[11px] w-[11px] bg-brand-300'
                        : 'h-[11px] w-[11px] bg-ink-300',
                  )}
                />
              </span>

              <span className={cx(
                'px-1 text-center text-[12.5px] font-bold leading-tight',
                on ? 'text-brand-500' : s.done ? 'text-ink-700' : 'text-ink-400',
              )}>
                {s.label}
                {s.optional && <span className="ml-1 text-[10px] font-medium text-ink-400">선택</span>}
              </span>

              {/* 날짜 칸은 비어도 자리를 지킨다 — 라벨 밑선이 칸마다 튀지 않게 */}
              <span className="min-h-[1em] text-[11px] tabular-nums text-ink-400">{s.note || ''}</span>
            </Tag>
          </li>
        )
      })}
    </ol>
  )
}
