// src/components/ui/index.ts
// CE VAULT — Component Barrel Export
// ใช้งาน: import { CeIcon, StatusBadge, KpiCard, CeButton, TxItem } from '@/components/ui'

export { CeIcon }       from './CeIcon'
export type { IconName } from './CeIcon'

export { StatusBadge }  from './StatusBadge'
export type { TxStatus } from './StatusBadge'

export { KpiCard }      from './KpiCard'
export { CeButton }     from './CeButton'
export { TxItem }       from './TxItem'


// ── Example Usage ──────────────────────────────────────
//
// import { CeIcon, StatusBadge, KpiCard, CeButton, TxItem } from '@/components/ui'
// import { MSG } from '@/constants/messages'
//
// // Icons
// <CeIcon name="receive" size={24} color="var(--c)" />
// <CeIcon name="settled" size={20} color="var(--s)" />
//
// // Status badges
// <StatusBadge status="PENDING" />
// <StatusBadge status="SHORT" />
//
// // KPI card
// <KpiCard label="RECEIVED" value="327,450" unit="THB" color="green" progress={65} />
//
// // Button
// <CeButton variant="success" onClick={confirm} icon={<CeIcon name="check" size={14} color="var(--b0)" />}>
//   ยืนยัน CONFIRM
// </CeButton>
//
// // Transaction item
// <TxItem id="#CE-001" thb="10,000" usdt="232.56" bank="KBank" time="14:32" status="SETTLED" onClick={() => openTx(id)} />
//
// // Messages
// const msg = MSG.TX_SETTLED({ id: '#CE-001', thb: '10,000.00', usdt: '232.56', rate: '43.00', time: '14:35 น.' })
// bot.sendMessage(chatId, msg)
