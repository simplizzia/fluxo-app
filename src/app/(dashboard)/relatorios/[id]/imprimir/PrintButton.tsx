'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: 'linear-gradient(135deg,#A046C6 0%,#F9267C 100%)',
        color: '#fff',
        border: 'none',
        padding: '10px 20px',
        borderRadius: '10px',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'sans-serif',
      }}
    >
      🖨 Imprimir / Salvar como PDF
    </button>
  )
}
