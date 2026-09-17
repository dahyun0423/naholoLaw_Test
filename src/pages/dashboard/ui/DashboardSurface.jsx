import { cx } from '../../../components/ui.jsx'
import { DASHBOARD_SURFACE_CLASS } from './dashboardStyles.js'

export default function DashboardSurface({ as: Component = 'section', className, children, ...props }) {
  return (
    <Component className={cx(DASHBOARD_SURFACE_CLASS, className)} {...props}>
      {children}
    </Component>
  )
}
