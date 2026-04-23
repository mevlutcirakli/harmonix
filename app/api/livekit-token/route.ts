import { AccessToken } from 'livekit-server-sdk'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const room = url.searchParams.get('room')
  const username = url.searchParams.get('username')

  if (!room || !username) {
    return Response.json(
      { error: 'room ve username parametreleri gerekli' },
      { status: 400 }
    )
  }

  try {
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET
    )

    at.addGrant({
      room: room,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    })

    at.identity = username

    const token = await at.toJwt()

    return Response.json({ token })
  } catch (error) {
    console.error('Token oluşturma hatası:', error)
    return Response.json(
      { error: 'Token oluşturulamadı' },
      { status: 500 }
    )
  }
}
