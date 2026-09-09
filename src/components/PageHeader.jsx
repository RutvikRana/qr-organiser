import { Link } from 'react-router-dom'

function ArrowLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  )
}

export function BackLink({ to = '/', children = 'All items' }) {
  return (
    <Link to={to} className="back-link">
      <ArrowLeft />
      {children}
    </Link>
  )
}

export default function PageHeader({ back, backLabel, title, sub, action }) {
  return (
    <header className="page-head">
      <div style={{ minWidth: 0 }}>
        {back && <BackLink to={back}>{backLabel}</BackLink>}
        <h1 className="page-title">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {action && <div style={{ flexShrink: 0, paddingTop: back ? 30 : 0 }}>{action}</div>}
    </header>
  )
}
