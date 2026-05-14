interface MaerskTrackingResult {
  eta: string | null
  etd: string | null
  currentLocation: string | null
  vesselName: string | null
  status: string | null
}

async function getMaerskToken(): Promise<string> {
  const res = await fetch('https://api.maersk.com/oauth2/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.MAERSK_CLIENT_ID!,
      client_secret: process.env.MAERSK_CLIENT_SECRET!,
    }),
  })
  if (!res.ok) throw new Error(`Maersk token error: ${res.status}`)
  const data = await res.json()
  return data.access_token
}

export async function getMaerskTracking(containerNo: string): Promise<MaerskTrackingResult> {
  const token = await getMaerskToken()

  const res = await fetch(
    `https://api.maersk.com/track-and-trace/v2/trackings/${containerNo}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Consumer-Key': process.env.MAERSK_CLIENT_ID!,
      },
      next: { revalidate: 3600 },
    }
  )

  if (!res.ok) {
    throw new Error(`Maersk tracking error: ${res.status}`)
  }

  const data = await res.json()

  // Maersk API 응답 파싱
  const transport = data?.transportDocuments?.[0]
  const legs = transport?.transportLegs ?? []
  const latestLeg = legs[legs.length - 1]

  return {
    eta: transport?.arrivalDateTimeAtDestination ?? latestLeg?.plannedArrivalDate ?? null,
    etd: transport?.departureDateTimeFromOrigin ?? legs[0]?.plannedDepartureDate ?? null,
    currentLocation: data?.currentLocation?.cityName ?? null,
    vesselName: latestLeg?.vessel?.vesselName ?? null,
    status: data?.transportStatus ?? null,
  }
}
