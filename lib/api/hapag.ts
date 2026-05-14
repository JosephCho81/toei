interface HapagTrackingResult {
  eta: string | null
  etd: string | null
  currentLocation: string | null
  vesselName: string | null
  status: string | null
}

export async function getHapagTracking(containerNo: string): Promise<HapagTrackingResult> {
  const res = await fetch(
    `https://api.hlag.com/v1/track-and-trace?container=${containerNo}`,
    {
      headers: {
        'x-api-key': process.env.HAPAG_API_KEY!,
        Accept: 'application/json',
      },
      next: { revalidate: 3600 },
    }
  )

  if (!res.ok) {
    throw new Error(`Hapag-Lloyd tracking error: ${res.status}`)
  }

  const data = await res.json()

  // Hapag-Lloyd API 응답 파싱
  const containers = data?.containers ?? []
  const container = containers.find((c: { containerNumber: string }) => c.containerNumber === containerNo) ?? containers[0]
  const latestEvent = container?.events?.[0]

  return {
    eta: container?.estimatedArrival ?? null,
    etd: container?.estimatedDeparture ?? null,
    currentLocation: latestEvent?.location?.city ?? null,
    vesselName: container?.vesselName ?? null,
    status: latestEvent?.eventType ?? null,
  }
}
