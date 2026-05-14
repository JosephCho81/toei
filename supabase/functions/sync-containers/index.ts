import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MAERSK_API_KEY = Deno.env.get('MAERSK_API_KEY') ?? ''
const HAPAG_API_KEY = Deno.env.get('HAPAG_API_KEY') ?? ''

interface TrackingResult {
  status?: string
  vessel?: string
  eta?: string
  pod?: string
  actual_arrival?: string
}

async function trackMaersk(containerNo: string): Promise<TrackingResult> {
  const res = await fetch(
    `https://api.maersk.com/track/v1/tracking/${containerNo}`,
    { headers: { 'Consumer-Key': MAERSK_API_KEY, 'Accept': 'application/json' } },
  )
  if (!res.ok) throw new Error(`Maersk ${res.status}`)
  const data = await res.json()
  const event = data?.containers?.[0]?.containers?.[0]
  return {
    status: event?.events?.[0]?.activity ?? undefined,
    vessel: event?.vessel?.vesselName ?? undefined,
    eta: event?.vessel?.predictedArrival ?? undefined,
    pod: event?.location?.city ?? undefined,
  }
}

async function trackHapag(containerNo: string): Promise<TrackingResult> {
  const res = await fetch(
    `https://api.hlag.com/v1/tracking/containers/${containerNo}`,
    { headers: { 'x-api-key': HAPAG_API_KEY, 'Accept': 'application/json' } },
  )
  if (!res.ok) throw new Error(`Hapag ${res.status}`)
  const data = await res.json()
  const latest = data?.trackingDetails?.events?.[0]
  return {
    status: latest?.eventType ?? undefined,
    vessel: data?.trackingDetails?.vesselName ?? undefined,
    eta: data?.trackingDetails?.estimatedTimeOfArrival ?? undefined,
    pod: latest?.location ?? undefined,
  }
}

async function trackContainer(containerNo: string): Promise<TrackingResult> {
  const prefix = containerNo.slice(0, 4).toUpperCase()
  const MAERSK_PREFIXES = ['MRKU', 'MSKU', 'MRSU', 'TCKU', 'TGBU']
  const HAPAG_PREFIXES = ['HLXU', 'HLCU', 'UACU', 'FSCU']
  if (MAERSK_PREFIXES.includes(prefix) && MAERSK_API_KEY) return trackMaersk(containerNo)
  if (HAPAG_PREFIXES.includes(prefix) && HAPAG_API_KEY) return trackHapag(containerNo)
  throw new Error('unsupported_carrier')
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: containers, error } = await supabase
    .from('containers')
    .select('id, container_no, carrier')
    .is('actual_arrival', null)
    .not('container_no', 'is', null)

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  const results = { updated: 0, skipped: 0, errors: 0 }

  for (const c of containers ?? []) {
    try {
      const info = await trackContainer(c.container_no)
      await supabase.from('containers').update({
        vessel: info.vessel ?? undefined,
        eta: info.eta ?? undefined,
        pod: info.pod ?? undefined,
        ...(info.actual_arrival ? { actual_arrival: info.actual_arrival } : {}),
        updated_at: new Date().toISOString(),
      }).eq('id', c.id)
      results.updated++
    } catch (err) {
      if ((err as Error).message === 'unsupported_carrier') results.skipped++
      else results.errors++
    }
  }

  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' },
  })
})
