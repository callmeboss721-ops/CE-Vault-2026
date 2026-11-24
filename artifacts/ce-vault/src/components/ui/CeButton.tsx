// src/components/ui/CeButton.tsx
// CE VAULT — Button Component

import React from 'react'

type Variant = 'primary' | 'success' | 'danger' | 'warning' | 'outline' | 'ghost' | 'gold'
type Size    = 'sm' | 'md' | 'lg'

interface CeButtonProps {
  variant?:  Variant
  size?:     Size
  children:  React.ReactNode
  onClick?:  () => void
  fullWidth?: boolean
  disabled?: boolean
  icon?:     React.ReactNode
  loading?:  boolean
}

const V_STYLE: Record<Variant, React.CSSProperties> = {
  primary: { background: 'var(--c)',  color: 'var(--b0)', border: '1px solid transparent' },
  success: { background: 'var(--s)',  color: 'var(--b0)', border: '1px solid transparent' },
  danger:  { background: 'var(--d)',  color: '#fff',      border: '1px solid transparent' },
  warning: { background: 'var(--w)',  color: 'var(--b0)', border: '1px solid transparent' },
  gold:    { background: 'var(--g)',  color: 'var(--b0)', border: '1px solid transparent' },
  outline: { background: 'var(--ca)', color: 'var(--c)',  border: '1px solid var(--cb)' },
  ghost:   { background: 'var(--b3)', color: 'var(--t2)', border: '1px solid var(--br)' },
}

const S_STYLE: Record<Size, React.CSSProperties> = {
  sm: { padding: '7px 14px',  fontSize: '10px' },
  md: { padding: '10px 20px', fontSize: '12px' },
  lg: { padding: '14px 28px', fontSize: '14px' },
}

export function CeButton({
  variant = 'outline',
  size = 'md',
  children,
  onClick,
  fullWidth,
  disabled,
  icon,
  loading,
}: CeButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display:       'inline-flex',
        alignItems:    'center',
        justifyContent:'center',
        gap:           '7px',
        borderRadius:  '9999px',
        fontFamily:    "'Space Grotesk', system-ui",
        fontWeight:    700,
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
        cursor:        disabled || loading ? 'not-allowed' : 'pointer',
        opacity:       disabled ? 0.5 : 1,
        width:         fullWidth ? '100%' : undefined,
        transition:    'all 0.15s',
        whiteSpace:    'nowrap',
        ...V_STYLE[variant],
        ...S_STYLE[size],
      }}
    >
      {loading ? (
        <span style={{ width: '12px', height: '12px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} />
      ) : icon}
      {children}
    </button>
  )
}
