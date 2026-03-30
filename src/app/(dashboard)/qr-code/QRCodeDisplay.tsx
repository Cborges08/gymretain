'use client'

import { QRCodeSVG } from 'qrcode.react'

interface Props {
  qrValue: string
  orgName: string
}

export function QRCodeDisplay({ qrValue, orgName }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-8 flex flex-col items-center max-w-sm mx-auto">
      <QRCodeSVG
        value={qrValue}
        size={300}
        level="H"
        aria-label={`QR Code da academia ${orgName}`}
      />
      <button
        onClick={() => window.print()}
        className="mt-6 bg-emerald-600 text-white px-6 h-10 rounded-lg text-sm font-medium hover:bg-emerald-700"
        type="button"
      >
        Imprimir QR Code
      </button>
    </div>
  )
}
