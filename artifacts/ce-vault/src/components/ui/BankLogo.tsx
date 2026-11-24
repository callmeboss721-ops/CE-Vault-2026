// src/components/ui/BankLogo.tsx
// Official Thai Bank Logos with crisp fallback

import React, { useState } from 'react';

interface BankAsset {
  code: string;
  file: string;
  bg: string;
  thai: string;
  short: string;
}

const BANK_ASSETS: Record<string, BankAsset> = {
  KBANK:     { code: 'KBANK',     file: 'KBANK.png',     bg: '#138F2D', thai: 'กสิกรไทย',         short: 'KBANK' },
  BBL:       { code: 'BBL',       file: 'BBL.png',       bg: '#1E4598', thai: 'กรุงเทพ',          short: 'BBL' },
  SCB:       { code: 'SCB',       file: 'SCB.png',       bg: '#4E2A84', thai: 'ไทยพาณิชย์',       short: 'SCB' },
  KTB:       { code: 'KTB',       file: 'KTB.png',       bg: '#1BA5E1', thai: 'กรุงไทย',          short: 'KTB' },
  TTB:       { code: 'TTB',       file: 'TTB.png',       bg: '#0050F0', thai: 'ทีทีบี',           short: 'TTB' },
  BAY:       { code: 'BAY',       file: 'BAY.png',       bg: '#FEC43B', thai: 'กรุงศรี',          short: 'BAY' },
  GSB:       { code: 'GSB',       file: 'GSB.png',       bg: '#EB198D', thai: 'ออมสิน',           short: 'GSB' },
  KKP:       { code: 'KKP',       file: 'KKP.png',       bg: '#199FA5', thai: 'เกียรตินาคิน',      short: 'KKP' },
  CIMB:      { code: 'CIMB',      file: 'CIMB.png',      bg: '#7E2F36', thai: 'ซีไอเอ็มบี',       short: 'CIMB' },
  UOB:       { code: 'UOB',       file: 'UOB.png',       bg: '#0B3979', thai: 'ยูโอบี',           short: 'UOB' },
  TISCO:     { code: 'TISCO',     file: 'TISCO.png',     bg: '#12549F', thai: 'ทิสโก้',           short: 'TISCO' },
  LHB:       { code: 'LHB',       file: 'LHB.png',       bg: '#6D6E71', thai: 'แลนด์แอนด์เฮ้าส์',  short: 'LHB' },
  LH:        { code: 'LHB',       file: 'LHB.png',       bg: '#6D6E71', thai: 'แลนด์แอนด์เฮ้าส์',  short: 'LHB' },
  BAAC:      { code: 'BAAC',      file: 'BAAC.png',      bg: '#4B9B1D', thai: 'ธ.ก.ส.',           short: 'BAAC' },
  GHB:       { code: 'GHB',       file: 'GHB.png',       bg: '#F58220', thai: 'ธอส.',             short: 'GHB' },
  ICBC:      { code: 'ICBC',      file: 'ICBC.png',      bg: '#C50F1F', thai: 'ไอซีบีซี',         short: 'ICBC' },
  IBANK:     { code: 'IBANK',     file: 'IBANK.png',     bg: '#164622', thai: 'อิสลาม',           short: 'IBANK' },
  TCRB:      { code: 'TCRB',      file: 'TCRB.png',      bg: '#0A4B9B', thai: 'ไทยเครดิต',        short: 'TCRB' },
  CITI:      { code: 'CITI',      file: 'CITI.png',      bg: '#003B70', thai: 'ซิตี้แบงก์',       short: 'CITI' },
  HSBC:      { code: 'HSBC',      file: 'HSBC.png',      bg: '#DB0011', thai: 'เอชเอสบีซี',       short: 'HSBC' },
  PROMPTPAY: { code: 'PROMPTPAY', file: 'PromptPay.png', bg: '#003D6A', thai: 'พร้อมเพย์',        short: 'PP' },
  TRUEMONEY: { code: 'TRUEMONEY', file: 'TrueMoney.png', bg: '#FF6600', thai: 'ทรูมันนี่',        short: 'TMN' },
};

export const POPULAR_BANK_CODES = ['KBANK', 'BBL', 'SCB', 'KTB', 'TTB', 'BAY', 'GSB', 'KKP', 'PROMPTPAY', 'TRUEMONEY'] as const;
export const ALL_BANK_CODES = Object.keys(BANK_ASSETS).filter((k) => k !== 'LH');

export function resolveBankAsset(code?: string): BankAsset {
  const key = String(code || '').trim().toUpperCase();
  if (BANK_ASSETS[key]) return BANK_ASSETS[key];
  if (key.includes('KASIKORN') || key.includes('กสิกร')) return BANK_ASSETS.KBANK;
  if (key.includes('BANGKOK') || key.includes('กรุงเทพ')) return BANK_ASSETS.BBL;
  if (key.includes('SIAM') || key.includes('ไทยพาณิชย์')) return BANK_ASSETS.SCB;
  if (key.includes('KRUNGTHAI') || key.includes('กรุงไทย')) return BANK_ASSETS.KTB;
  if (key.includes('TMB') || key.includes('ทหารไทย') || key.includes('ธนชาต')) return BANK_ASSETS.TTB;
  if (key.includes('KRUNGSRI') || key.includes('กรุงศรี')) return BANK_ASSETS.BAY;
  if (key.includes('ออมสิน')) return BANK_ASSETS.GSB;
  if (key.includes('เกียรตินาคิน')) return BANK_ASSETS.KKP;
  if (key.includes('พร้อมเพย์')) return BANK_ASSETS.PROMPTPAY;
  if (key.includes('ทรูมันนี่')) return BANK_ASSETS.TRUEMONEY;
  return { code: key || 'BANK', file: '', bg: '#132540', thai: key || 'ธนาคาร', short: (key || 'BK').slice(0, 4) };
}

interface BankLogoProps {
  code?: string;
  size?: number;
  rounded?: number;
}

export function BankLogo({ code, size = 36, rounded }: BankLogoProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const asset = resolveBankAsset(code);
  const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL || '/';
  const src = asset.file ? `${base.replace(/\/?$/, '/')}banks/${asset.file}` : '';
  const radius = rounded ?? Math.round(size * 0.26);

  if (!src || imgFailed) {
    return (
      <div
        title={asset.thai}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: `${radius}px`,
          background: asset.bg,
          color: '#fff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: `${Math.max(9, Math.round(size * 0.28))}px`,
          fontWeight: 800,
          fontFamily: "'Space Mono', monospace",
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.28)',
        }}
      >
        {asset.short}
      </div>
    );
  }

  return (
    <div
      title={`${asset.thai} (${asset.code})`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${radius}px`,
        overflow: 'hidden',
        background: asset.bg,
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.32), inset 0 0 0 1px rgba(255,255,255,0.14)',
      }}
    >
      <img
        src={src}
        alt={asset.code}
        width={size}
        height={size}
        onError={() => setImgFailed(true)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />
    </div>
  );
}
