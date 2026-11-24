// src/components/ui/TxItem.tsx
// CE VAULT — Clean Transaction List Item with Real Official Thai Bank Logo

import React from 'react'
import { StatusBadge, TxStatus } from './StatusBadge'
import { BankLogo } from './BankLogo'

interface TxItemProps {
  id:       string
  thb:      string
  usdt:     string
  bank:     string
  sender?:  string
  time:     string
  status:   TxStatus
  selected?: boolean
  onClick?: () => void
}

const STATUS_ACCENT: Record<TxStatus, string> = {
  READY:     '#ffca28',
  PENDING:   '#3fe0ff',
  SETTLED:   '#44d895',
  SHORT:     '#ff5252',
  REJECTED:  '#8899aa',
  REVERSED:  '#cc8888',
  OCR:       '#b39ddb',
  REVIEW:    '#90a8e8',
  MISMATCH:  '#ff6d35',
  DUPLICATE: '#9977ee',
}

export function TxItem({ id, thb, usdt, bank, sender, time, status, selected, onClick }: TxItemProps) {
  const accent = STATUS_ACCENT[status]
  return (
    <div
      onClick={onClick}
      className={`ce-tx-row ${selected ? 'is-selected' : ''}`}
      style={{
        background:   selected ? 'rgba(63, 224, 255, 0.08)' : 'var(--b2)',
        border:       selected ? '1px solid rgba(63, 224, 255, 0.45)' : '1px solid var(--br)',
        borderRadius: '14px',
        padding:      '13px 15px',
        display:      'flex',
        alignItems:   'center',
        gap:          '13px',
        cursor:       onClick ? 'pointer' : undefined,
        transition:   'background 0.15s, border-color 0.15s, transform 0.12s',
      }}
    >
      {/* Real Official Thai Bank Logo */}
      <BankLogo code={bank} size={40} />

      {/* Main Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--t1)', fontFamily: "'Space Mono', monospace" }}>
            ฿{thb}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--t3)', fontFamily: "'Space Mono', monospace" }}>
            {id}
          </span>
        </div>
        <div
          style={{
            fontSize: '12px',
            color: 'var(--t2)',
            marginTop: '3px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {sender || bank} · {time} น.
        </div>
      </div>

      {/* Right USDT & Status */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: "'Space Mono', monospace", color: accent }}>
          {usdt} USDT
        </div>
        <div style={{ marginTop: '5px' }}>
          <StatusBadge status={status} />
        </div>
      </div>
    </div>
  )
}
