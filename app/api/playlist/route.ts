export function GET() {
  return Response.json({ error: 'Kaldırıldı' }, { status: 410 })
}
