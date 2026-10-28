
import type { ReactNode } from 'react'

type PageHeadingProps = {
  eyebrow: string
  title: string
  subtitle?: string
  actions?: ReactNode
  className?: string
}

export default function PageHeading({
  eyebrow,
  title,
  subtitle,
  actions,
  className = '',
}: PageHeadingProps) {
  return (
    <header className={`wa-page-heading ${className}`.trim()}>
      <div className="wa-page-heading-copy">
        <div className="wa-eyebrow">{eyebrow}</div>

        <h1>{title}</h1>

        {subtitle ? (
          <p className="wa-subtitle">{subtitle}</p>
        ) : null}
      </div>

      {actions ? (
        <div className="wa-page-heading-actions">
          {actions}
        </div>
      ) : null}
    </header>
  )
}
