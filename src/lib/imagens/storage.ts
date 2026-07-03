/**
 * URLs assinadas para imagens do módulo — server-only (nunca vira endpoint).
 * As páginas validam o acesso ao cliente antes de chamar.
 */
import 'server-only'

import { createServiceClient } from '@/lib/supabase/server'

export async function gerarUrlsAssinadas(
  paths: (string | null)[],
): Promise<Record<string, string>> {
  const validos = paths.filter((p): p is string => !!p)
  if (validos.length === 0) return {}

  const service = createServiceClient()
  const { data } = await service.storage
    .from('content-files')
    .createSignedUrls(validos, 3600)

  const mapa: Record<string, string> = {}
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) mapa[item.path] = item.signedUrl
  }
  return mapa
}
