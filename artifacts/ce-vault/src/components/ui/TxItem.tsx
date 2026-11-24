// src/components/ui/TxItem.tsx
// CE VAULT — Transaction List Item

import React from 'react'
import { StatusBadge, TxStatus } from './StatusBadge'
import { CeIcon, IconName }      from './CeIcon'

interface TxItemProps {
  id:       string
  thb:      string
  usdt:     string
  bank:     string
  sender?:  string
  time:     string
  status:   TxStatus
  onClick?: () => void
}

const STATUS_META: Record<TxStatus, { color: string; bg: string; icon: IconName }> = {
  READY:     { color: '#ffca28', bg: 'rgba(255,202,40,.08)',  icon: 'ready'    },
  PENDING:   { color: '#00d4ff', bg: 'rgba(0,212,255,.07)',   icon: 'pending'  },
  SETTLED:   { color: '#00e676', bg: 'rgba(0,230,118,.07)',   icon: 'settled'  },
  SHORT:     { color: '#ff5252', bg: 'rgba(255,82,82,.07)',   icon: 'short'    },
  REJECTED:  { color: '#8899aa', bg: 'rgba(80,80,100,.08)',   icon: 'rejected' },
  REVERSED:  { color: '#cc8888', bg: 'rgba(130,70,70,.1)',    icon: 'reversed' },
  OCR:       { color: '#b39ddb', bg: 'rgba(179,157,219,.08)', icon: 'ocr'      },
  REVIEW:    { color: '#90a8e8', bg: 'rgba(70,100,200,.1)',   icon: 'review'   },
  MISMATCH:  { color: '#ff6d35', bg: 'rgba(255,109,53,.08)',  icon: 'mismatch' },
  DUPLICATE: { color: '#9977ee', bg: 'rgba(90,70,180,.1)',    icon: 'duplicate'},
}

export function TxItem({ id, thb, usdt, bank, sender, time, status, onClick }: TxItemProps) {
  const meta = STATUS_META[status]
  return (
    <div
      onClick={onClick}
      style={{
        background:   'var(--b2)',
        border:       '1px solid var(--br)',
        borderRadius: 'var(--r10)',
        padding:      '11px 14px',
        display:      'flex',
        alignItems:   'center',
        gap:          '11px',
        cursor:       onClick ? 'pointer' : undefined,
        transition:   'all 0.15s',
      }}
      onMouseEnter={e => { if(onClick) { (e.currentTarget as HTMLDivElement).style.background = 'var(--b3)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--bra)' } }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--b2)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--br)' }}
    >
      {/* Icon */}
      <div style={{
        width: '36px', height: '36px',
        borderRadius: 'var(--r6)',
        background: meta.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <CeIcon name={meta.icon} size={18} color={meta.color} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '10px', color: 'var(--t3)', fontWeight: 600, fontFamily: "'Space Mono', monospace", letterSpacing: '0.3px' }}>
          {id}
        </div>
        <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '1px', color: meta.color, fontFamily: "'Space Mono', monospace" }}>
          ฿{thb}
        </div>
        <div style={{ fontSize: '10px', color: 'var(--t3)', marginTop: '1px' }}>
          {time} · {bank}{sender ? ` · ${sender}` : ''}
        </div>
      </div>

      {/* Right */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: "'Space Mono', monospace", color: meta.color }}>
          {usdt} USDT
        </div>
        <div style={{ marginTop: '5px' }}>
          <StatusBadge status={status} />
        </div>
      </div>
    </div>
  )
}
