// src/components/ui/KpiCard.tsx
// CE VAULT — KPI Card Component

import React from 'react'

type KpiColor = 'cyan' | 'green' | 'red' | 'gold' | 'yellow' | 'orange'

interface KpiCardProps {
  label:     string
  value:     string
  unit?:     string
  note?:     string
  color?:    KpiColor
  progress?: number   // 0–100 แสดง progress bar
  icon?:     React.ReactNode
}

const COLOR: Record<KpiColor, { text: string; glow: string; fill: string }> = {
  cyan:   { text: '#00d4ff', glow: '#00d4ff', fill: '#00d4ff' },
  green:  { text: '#00e676', glow: '#00e676', fill: '#00e676' },
  red:    { text: '#ff5252', glow: '#ff5252', fill: '#ff5252' },
  gold:   { text: '#f0b429', glow: '#f0b429', fill: 'linear-gradient(90deg,#00d4ff,#f0b429)' },
  yellow: { text: '#ffca28', glow: '#ffca28', fill: '#ffca28' },
  orange: { text: '#ff6d35', glow: '#ff6d35', fill: '#ff6d35' },
}

export function KpiCard({ label, value, unit, note, color = 'cyan', progress, icon }: KpiCardProps) {
  const col = COLOR[color]
  return (
    <div style={{
      background:    'var(--b2)',
      border:        '1px solid var(--br)',
      borderRadius:  'var(--r14)',
      padding:       '16px',
      position:      'relative',
      overflow:      'hidden',
    }}>
      {/* Glow top line */}
      <div style={{
        position:   'absolute',
        top:        0,
        left:       '25%',
        right:      '25%',
        height:     '1px',
        background: col.text,
        boxShadow:  `0 0 10px ${col.glow}`,
      }} />

      {/* Label */}
      <div style={{
        fontSize:      '9px',
        fontWeight:    700,
        letterSpacing: '2px',
        textTransform: 'uppercase',
        color:         'var(--t3)',
        marginBottom:  '10px',
        display:       'flex',
        alignItems:    'center',
        gap:           '6px',
        fontFamily:    "'Space Grotesk', system-ui",
      }}>
        {icon}
        {label}
      </div>

      {/* Value */}
      <div style={{
        fontSize:      '26px',
        fontWeight:    800,
        letterSpacing: '-1px',
        lineHeight:    1,
        fontFamily:    "'Space Mono', monospace",
        color:         col.text,
        marginBottom:  note ? '3px' : 0,
      }}>
        {value}
        {unit && (
          <span style={{ fontSize: '12px', fontWeight: 500, opacity: .55, marginLeft: '4px', fontFamily: "'Space Grotesk', system-ui" }}>
            {unit}
          </span>
        )}
      </div>

      {/* Note */}
      {note && (
        <div style={{ fontSize: '10px', color: 'var(--t3)', fontFamily: "'Space Grotesk', system-ui" }}>
          {note}
        </div>
      )}

      {/* Progress bar */}
      {progress !== undefined && (
        <div style={{ marginTop: '12px', height: '2px', background: 'var(--b4)', borderRadius: '9999px', overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(progress, 100)}%`, height: '100%', background: col.fill, borderRadius: '9999px' }} />
        </div>
      )}
    </div>
  )
}
