import { cx } from '../../../components/ui.jsx'

export default function PanelGlow({ radius = 28 }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'pointer-events-none absolute bottom-3 h-16 bg-[linear-gradient(180deg,transparent_0%,#f6faff_35%,#e8f2ff_100%)] opacity-70',
        radius === 20 ? 'left-5 right-5 rounded-[20px] blur-lg' : 'left-8 right-8 rounded-[28px] blur-2xl',
      )}
    />
  )
}
