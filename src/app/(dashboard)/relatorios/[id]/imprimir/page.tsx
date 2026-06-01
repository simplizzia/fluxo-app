import { buscarRelatorio } from '../../actions'
import PrintButton from './PrintButton'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ImprimirRelatorioPage({ params }: Props) {
  const { id } = await params
  const { relatorio, error } = await buscarRelatorio(id)

  if (error || !relatorio) {
    return <p className="p-8 text-center text-sm text-red-600">{error ?? 'Não encontrado.'}</p>
  }

  const conteudo = relatorio.conteudoEditado ?? relatorio.conteudo ?? ''
  const mesRef = new Date(relatorio.mesReferencia)
  const nomeMes = mesRef.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  // Converte markdown para HTML para exibição impressa
  const linhas = conteudo.split('\n')
  const htmlBlocos: string[] = []

  for (const linha of linhas) {
    if (linha.startsWith('## ')) {
      htmlBlocos.push(`<h2>${linha.slice(3)}</h2>`)
    } else if (linha.startsWith('### ')) {
      htmlBlocos.push(`<h3>${linha.slice(4)}</h3>`)
    } else if (linha.match(/^\d+\. /)) {
      htmlBlocos.push(`<li>${linha.replace(/^\d+\. /, '')}</li>`)
    } else if (linha.startsWith('- ')) {
      htmlBlocos.push(`<li>${linha.slice(2)}</li>`)
    } else if (linha.trim() === '') {
      htmlBlocos.push('<br>')
    } else {
      const bold = linha.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      htmlBlocos.push(`<p>${bold}</p>`)
    }
  }

  return (
    <>
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          @page { margin: 2cm; }
        }
        body {
          font-family: Georgia, 'Times New Roman', serif;
          color: #1E1E1E;
          background: #fff;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 32px;
          line-height: 1.7;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #A046C6;
          padding-bottom: 20px;
          margin-bottom: 32px;
        }
        .brand { font-size: 20px; font-weight: 700; color: #A046C6; font-family: sans-serif; }
        .meta { text-align: right; font-family: sans-serif; font-size: 12px; color: #6B7280; }
        .titulo { font-size: 28px; font-weight: 700; margin: 0 0 4px; font-family: sans-serif; }
        .subtitulo { font-size: 14px; color: #6B7280; font-family: sans-serif; text-transform: capitalize; }
        h2 { font-size: 18px; font-weight: 700; color: #A046C6; margin: 32px 0 12px; font-family: sans-serif; border-bottom: 1px solid #F4F4F4; padding-bottom: 6px; }
        h3 { font-size: 15px; font-weight: 600; margin: 24px 0 8px; font-family: sans-serif; }
        p { margin: 0 0 12px; font-size: 14px; }
        li { font-size: 14px; margin: 4px 0 4px 20px; }
        .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #E5E7EB; font-size: 11px; color: #9CA3AF; font-family: sans-serif; text-align: center; }
        .btn-print { display: inline-flex; align-items: center; gap: 6px; background: linear-gradient(135deg,#A046C6 0%,#F9267C 100%); color: #fff; border: none; padding: 10px 20px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: sans-serif; margin-bottom: 24px; }
      `}</style>

      <div className="no-print" style={{ marginBottom: '24px' }}>
        <PrintButton />
      </div>

      <div className="header">
        <div>
          <div className="brand">Simplizzia</div>
          <div className="titulo">{relatorio.clienteNome}</div>
          <div className="subtitulo">Relatório de {nomeMes}</div>
        </div>
        <div className="meta">
          <div>por Izzi</div>
          <div style={{ marginTop: '4px' }}>
            {relatorio.enviadoEm
              ? `Enviado em ${new Date(relatorio.enviadoEm).toLocaleDateString('pt-BR')}`
              : new Date().toLocaleDateString('pt-BR')}
          </div>
        </div>
      </div>

      <div dangerouslySetInnerHTML={{ __html: htmlBlocos.join('\n') }} />

      <div className="footer">Simplizzia · Izzi, Assistente da Simplizzia · app.simplizzia.com.br</div>
    </>
  )
}
