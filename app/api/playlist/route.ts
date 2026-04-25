import { NextRequest, NextResponse } from 'next/server'

const YT_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8'
const YT_CLIENT = { clientName: 'WEB', clientVersion: '2.20230922.00.00' }

interface VideoItem {
  videoId: string
  title: string
  thumbnail: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractVideosFromBrowse(data: any): { videos: VideoItem[]; title: string } {
  const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs
  const contents = tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents
  const videoList =
    contents?.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c: any) => c.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer
    )?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer?.contents ?? []

  const title =
    data?.header?.playlistHeaderRenderer?.title?.simpleText ??
    data?.metadata?.playlistMetadataRenderer?.title ??
    'Çalma Listesi'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const videos: VideoItem[] = videoList.flatMap((item: any) => {
    const v = item.playlistVideoRenderer
    if (!v?.videoId) return []
    return [{
      videoId: v.videoId,
      title: v.title?.runs?.[0]?.text ?? 'Unknown',
      thumbnail: `https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`,
    }]
  })

  return { videos, title }
}

async function fetchRegularPlaylist(listId: string): Promise<{ videos: VideoItem[]; title: string }> {
  const res = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${YT_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      browseId: `VL${listId}`,
      context: { client: YT_CLIENT },
    }),
  })
  const data = await res.json()
  return extractVideosFromBrowse(data)
}

async function fetchMixPlaylist(videoId: string, listId: string): Promise<VideoItem[]> {
  const res = await fetch(`https://www.youtube.com/youtubei/v1/next?key=${YT_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoId,
      playlistId: listId,
      context: { client: YT_CLIENT },
    }),
  })
  const data = await res.json()
  const contents =
    data?.contents?.twoColumnWatchNextResults?.playlist?.playlist?.contents ?? []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return contents.flatMap((item: any) => {
    const v = item.playlistPanelVideoRenderer
    if (!v?.videoId) return []
    return [{
      videoId: v.videoId,
      title: v.title?.simpleText ?? 'Unknown',
      thumbnail: `https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`,
    }]
  })
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get('url')
  if (!rawUrl) {
    return NextResponse.json({ error: 'URL gerekli' }, { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return NextResponse.json({ error: 'Geçersiz URL' }, { status: 400 })
  }

  const listId = parsed.searchParams.get('list')
  const videoId = parsed.searchParams.get('v')

  if (!listId) {
    return NextResponse.json({ error: 'Geçersiz çalma listesi URL\'si' }, { status: 400 })
  }

  try {
    let videos: VideoItem[]
    let title = 'Çalma Listesi'

    if (listId.startsWith('RD') && !listId.startsWith('RDCLAK')) {
      // YouTube Mix variants (RDMM = Music Mix, RD = regular watch mix)
      // Uses /next endpoint with a seed videoId
      const seedVideoId = videoId ?? listId.replace(/^RD(MM)?/, '')
      videos = await fetchMixPlaylist(seedVideoId, listId)
      title = listId.startsWith('RDMM') ? 'YouTube Music Mix' : 'YouTube Mix'
    } else {
      const result = await fetchRegularPlaylist(listId)
      videos = result.videos
      title = result.title
    }

    if (!videos.length) {
      return NextResponse.json({ error: 'Çalma listesinde video bulunamadı veya erişim kısıtlı' }, { status: 400 })
    }

    return NextResponse.json({ title, items: videos })
  } catch (err) {
    console.error('Playlist fetch error:', err)
    return NextResponse.json({ error: 'Çalma listesi alınamadı' }, { status: 500 })
  }
}
