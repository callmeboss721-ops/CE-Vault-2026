// src/components/ui/CeIcon.tsx
// CE VAULT — Icon Library v1.0 — 36 icons

import React from 'react'

export type IconName =
  // Navigation
  | 'home' | 'receive' | 'operations' | 'settings' | 'search' | 'audit'
  // Status
  | 'ocr' | 'review' | 'mismatch' | 'ready' | 'pending' | 'settled'
  | 'short' | 'rejected' | 'reversed' | 'duplicate'
  // Actions & Entities
  | 'bank' | 'rate' | 'queue-usdt' | 'settlement' | 'summary'
  | 'new-cycle' | 'alert' | 'scan' | 'history' | 'export'
  | 'profit' | 'limit' | 'check' | 'edit' | 'close' | 'back' | 'arrow-up' | 'arrow-down' | 'refresh' | 'gem'
  | 'send' | 'cycle' | 'pin' | 'user' | 'amount' | 'usdt' | 'trash' | 'recheck' | 'override' | 'copy'
  | 'bot' | 'key' | 'link'

interface CeIconProps {
  name: IconName
  size?: number
  color?: string
  strokeWidth?: number
}

const ICONS: Record<IconName, React.ReactNode> = {
  // ── NAVIGATION ──
  home:       <><path d="M3 12L12 3l9 9"/><path d="M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9"/></>,
  receive:    <><path d="M12 3v13"/><path d="M5 12l7 7 7-7"/><path d="M3 21h18"/></>,
  operations: <><path d="M3 6h18M3 12h14M3 18h10"/><circle cx="20" cy="18" r="2.5"/><path d="M17.5 18h-1.5"/></>,
  settings:   <><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></>,
  search:     <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></>,
  audit:      <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></>,

  // ── STATUS ──
  ocr:        <><rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M10 6V4h4v2"/><circle cx="12" cy="13" r="1" fill="currentColor"/></>,
  review:     <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="1" fill="currentColor"/></>,
  mismatch:   <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r=".8" fill="currentColor"/></>,
  ready:      <><polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/></>,
  pending:    <><circle cx="12" cy="12" r="9"/><path d="M12 7v6l3.5 3.5"/></>,
  settled:    <><circle cx="12" cy="12" r="9"/><path d="M7 12l3.5 3.5L17 9"/></>,
  short:      <><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="14" strokeWidth="2"/><circle cx="12" cy="17" r=".8" fill="currentColor"/></>,
  rejected:   <><circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/></>,
  reversed:   <><path d="M3 7v6h6"/><path d="M3 13A9 9 0 1 0 6 6.3"/><line x1="12" y1="7" x2="12" y2="17" strokeDasharray="2 2" opacity=".4"/></>,
  duplicate:  <><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></>,

  // ── ACTIONS & ENTITIES ──
  bank:       <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,14 15,14 15,22"/></>,
  rate:       <><path d="M4 8h12M4 8l3-3M4 8l3 3"/><path d="M20 16H8M20 16l-3-3M20 16l-3 3"/></>,
  'queue-usdt': <><path d="M12 19V5M5 12l7-7 7 7"/><rect x="3" y="18" width="18" height="3" rx="1" opacity=".3" fill="currentColor" stroke="none"/></>,
  settlement: <><circle cx="8" cy="14" r="4"/><circle cx="16" cy="10" r="4"/><path d="M12 10l2 2M14 12l2-2"/></>,
  summary:    <><line x1="3" y1="22" x2="21" y2="22"/><rect x="4" y="16" width="4" height="6"/><rect x="10" y="10" width="4" height="12"/><rect x="16" y="4" width="4" height="18"/></>,
  'new-cycle': <><path d="M4 12a8 8 0 018-8v0a8 8 0 018 8"/><polyline points="16,4 20,8 16,12"/></>,
  alert:      <><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>,
  scan:       <><rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M10 6V4h4v2"/></>,
  history:    <><circle cx="12" cy="12" r="9"/><path d="M12 6v7l4 2"/><path d="M3 9l-1-4 4 1"/></>,
  export:     <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><path d="M10 13l2 2 4-4"/></>,
  profit:     <><polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/><polyline points="17,6 23,6 23,12"/></>,
  limit:      <><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-4 0v2"/><line x1="12" y1="11" x2="12" y2="15"/></>,
  check:      <><polyline points="20,6 9,17 4,12"/></>,
  edit:       <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
  close:      <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
  back:       <><path d="M19 12H5"/><path d="M12 5l-7 7 7 7"/></>,
  'arrow-up': <><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></>,
  'arrow-down': <><path d="M12 5v14"/><path d="M19 12l-7 7-7-7"/></>,
  refresh:    <><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></>,
  gem:        <><polygon points="12,2 22,8 22,16 12,22 2,16 2,8"/><polygon points="12,7 18,10 18,14 12,17 6,14 6,10" opacity=".35"/><circle cx="12" cy="12" r="2" fill="currentColor"/></>,
  send:       <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></>,
  cycle:      <><path d="M21 12a9 9 0 00-15.5-6.36L3 8"/><polyline points="3,3 3,8 8,8"/><path d="M3 12a9 9 0 0015.5 6.36L21 16"/><polyline points="16,16 21,16 21,21"/></>,
  pin:        <><path d="M12 17v5"/><path d="M9 3h6l1 7 3 3v2H5v-2l3-3 1-7z"/></>,
  user:       <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  amount:     <><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/></>,
  usdt:       <><circle cx="12" cy="12" r="9"/><path d="M8 8h8M12 8v9"/><ellipse cx="12" cy="12" rx="5" ry="1.8"/></>,
  trash:      <><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></>,
  recheck:    <><path d="M21 12a9 9 0 11-3-6.7L21 8"/><polyline points="21,3 21,8 16,8"/><polyline points="9,12 11,14 15,10"/></>,
  override:   <><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/></>,
  copy:       <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></>,
  bot:        <><rect x="3" y="8" width="18" height="12" rx="3"/><path d="M12 4v4"/><circle cx="12" cy="3" r="1"/><circle cx="9" cy="14" r="1.2" fill="currentColor"/><circle cx="15" cy="14" r="1.2" fill="currentColor"/><path d="M9 17.5h6"/></>,
  key:        <><circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.8 12.2L21 2"/><path d="M17 6l3 3"/><path d="M14 9l2 2"/></>,
  link:       <><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></>,
}

export function CeIcon({ name, size = 20, color = 'currentColor', strokeWidth = 1.75 }: CeIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONS[name]}
    </svg>
  )
}
