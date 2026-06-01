/**
 * Módulo de Transcrição — Sprint 5.3
 *
 * Dois caminhos:
 *   1. Audio upload → OpenAI Whisper API → texto
 *   2. Google Meet space → Gemini Notes via Meet REST API → texto
 *
 * Ambas retornam uma string com o texto bruto da transcrição.
 * O caller salva em `reunioes.transcricao_bruta` e popula `notas_brutas`.
 */
import 'server-only'

import { createServiceClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type TranscricaoStatus = 'nenhuma' | 'processando' | 'concluida' | 'erro'

// ---------------------------------------------------------------------------
// Whisper — transcrição via arquivo de áudio
// ---------------------------------------------------------------------------

/**
 * Baixa o arquivo de áudio do Storage e envia para o Whisper API (OpenAI).
 * Retorna o texto transcrito.
 * Lança erro em caso de falha para que o caller atualize o status para 'erro'.
 */
export async function transcribeAudio(storagePath: string): Promise<string> {
  const service = createServiceClient()

  // 1. Baixa o arquivo do bucket reunioes-audio
  const { data: blob, error: downloadError } = await service.storage
    .from('reunioes-audio')
    .download(storagePath)

  if (downloadError || !blob) {
    throw new Error(`Erro ao baixar arquivo de áudio: ${downloadError?.message ?? 'não encontrado'}`)
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada.')

  // 2. Envia para Whisper
  const formData = new FormData()

  // O Whisper precisa de um filename com extensão para detectar o formato
  const filename = storagePath.split('/').pop() ?? 'audio.mp3'
  formData.append('file', new Blob([await blob.arrayBuffer()], { type: blob.type }), filename)
  formData.append('model', 'whisper-1')
  formData.append('language', 'pt')
  formData.append('response_format', 'text')

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Whisper API erro ${response.status}: ${errText}`)
  }

  // response_format=text retorna plaintext direto
  const texto = await response.text()
  return texto.trim()
}

// ---------------------------------------------------------------------------
// Google Meet — importação de Gemini Notes
// ---------------------------------------------------------------------------

/**
 * Extrai o Meet space code de um link do Google Meet.
 * Ex: "https://meet.google.com/abc-defg-hij" → "abc-defg-hij"
 */
export function extractMeetSpaceId(meetLink: string): string | null {
  const match = meetLink.match(/meet\.google\.com\/([a-z0-9]{3}-[a-z0-9]{4}-[a-z0-9]{3})/i)
  return match?.[1]?.toLowerCase() ?? null
}

/**
 * Importa as notas/transcrição geradas pelo Gemini no Google Meet.
 *
 * Requer:
 *   - accessToken com scope `https://www.googleapis.com/auth/meetings.space.readonly`
 *   - O meeting deve ter sido gravado / processado pelo Gemini no Google Meet
 *
 * Retorna o texto concatenado das entradas da transcrição, ou null se não disponível.
 */
export async function importGeminiMeetNotes(
  accessToken: string,
  spaceId: string,
): Promise<string | null> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }

  // 1. Lista conference records do espaço Meet
  const recordsUrl =
    `https://meet.googleapis.com/v2/conferenceRecords` +
    `?filter=space.name%3D"spaces/${spaceId}"`

  const recordsRes = await fetch(recordsUrl, { headers })
  if (!recordsRes.ok) {
    console.warn('[importGeminiMeetNotes] conferenceRecords:', recordsRes.status)
    return null
  }

  const recordsJson = await recordsRes.json()
  const conferenceRecord: { name: string } | undefined =
    recordsJson.conferenceRecords?.[0]

  if (!conferenceRecord) return null

  // 2. Lista transcrições do meeting mais recente
  const transcriptsRes = await fetch(
    `https://meet.googleapis.com/v2/${conferenceRecord.name}/transcripts`,
    { headers },
  )
  if (!transcriptsRes.ok) return null

  const transcriptsJson = await transcriptsRes.json()
  const transcript: { name: string } | undefined = transcriptsJson.transcripts?.[0]
  if (!transcript) return null

  // 3. Busca entradas da transcrição
  const entriesRes = await fetch(
    `https://meet.googleapis.com/v2/${transcript.name}/entries?pageSize=500`,
    { headers },
  )
  if (!entriesRes.ok) return null

  const entriesJson = await entriesRes.json()

  type TranscriptEntry = {
    participant?: { signedinUser?: { displayName?: string } }
    text?: string
  }

  const entries: TranscriptEntry[] = entriesJson.transcriptEntries ?? []
  if (!entries.length) return null

  // 4. Monta texto no formato "Nome: fala"
  const texto = entries
    .map((e) => {
      const nome = e.participant?.signedinUser?.displayName ?? 'Participante'
      const fala = e.text ?? ''
      return `${nome}: ${fala}`
    })
    .join('\n')

  return texto || null
}
