// src/components/ui/StatusBadge.tsx
// CE VAULT — Status Badge Component

import React from 'react'

export type TxStatus =
  | 'OCR' | 'REVIEW' | 'MISMATCH' | 'READY'
  | 'PENDING' | 'SETTLED' | 'SHORT'
  | 'REJECTED' | 'REVERSED' | 'DUPLICATE'

interface BadgeConfig {
  label:  string
  color:  string
  bg:     string
  border: string
  pulse?: boolean
}

const CFG: Record<TxStatus, BadgeConfig> = {
  OCR:       { label: 'OCR',       color: '#b39ddb', bg: 'rgba(179,157,219,.08)', border: 'rgba(179,157,219,.2)',  pulse: true  },
  REVIEW:    { label: 'REVIEW',    color: '#90a8e8', bg: 'rgba(70,100,200,.1)',   border: 'rgba(90,120,200,.2)',  pulse: false },
  MISMATCH:  { label: 'MISMATCH', color: '#ff6d35', bg: 'rgba(255,109,53,.08)',  border: 'rgba(255,109,53,.2)',  pulse: false },
  READY:     { label: 'READY',    color: '#ffca28', bg: 'rgba(255,202,40,.08)',  border: 'rgba(255,202,40,.2)',  pulse: true  },
  PENDING:   { label: 'PENDING',  color: '#00d4ff', bg: 'rgba(0,212,255,.07)',   border: 'rgba(0,212,255,.14)',  pulse: true  },
  SETTLED:   { label: 'SETTLED',  color: '#00e676', bg: 'rgba(0,230,118,.07)',   border: 'rgba(0,230,118,.18)', pulse: false },
  SHORT:     { label: 'SHORT',    color: '#ff5252', bg: 'rgba(255,82,82,.07)',   border: 'rgba(255,82,82,.18)', pulse: true  },
  REJECTED:  { label: 'REJECTED', color: '#8899aa', bg: 'rgba(80,80,100,.08)',   border: 'rgba(80,80,100,.18)', pulse: false },
  REVERSED:  { label: 'REVERSED', color: '#cc8888', bg: 'rgba(130,70,70,.1)',    border: 'rgba(130,70,70,.2)',  pulse: false },
  DUPLICATE: { label: 'DUPLICATE',color: '#9977ee', bg: 'rgba(90,70,180,.1)',    border: 'rgba(90,70,180,.2)',  pulse: false },
}

// Add keyframe CSS once
if (typeof document !== 'undefined' && !document.getElementById('ce-badge-style')) {
  const style = document.createElement('style')
  style.id = 'ce-badge-style'
  style.textContent = '@keyframes ce-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.75)}}'
  document.head.appendChild(style)
}

export function StatusBadge({ status }: { status: TxStatus }) {
  const c = CFG[status]
  return (
    <span style={{
      display:       'inline-flex',
      alignItems:    'center',
      gap:           '5px',
      padding:       '4px 10px',
      borderRadius:  '9999px',
      fontSize:      '9px',
      fontWeight:    700,
      letterSpacing: '1.2px',
      textTransform: 'uppercase',
      color:         c.color,
      background:    c.bg,
      border:        `1px solid ${c.border}`,
      whiteSpace:    'nowrap',
      fontFamily:    "'Space Grotesk', system-ui",
    }}>
      <span style={{
        width:        '5px',
        height:       '5px',
        borderRadius: '50%',
        background:   c.color,
        flexShrink:   0,
        animation:    c.pulse ? 'ce-pulse 1.5s infinite' : undefined,
      }} />
      {c.label}
    </span>
  )
}
