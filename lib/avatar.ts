const STYLES = [
  'croodles',
  'big-smile',
  'avataaars',
  'adventurer',
  'micah',
  'notionists',
  'toon-head',
]

function hashUsername(username: string): number {
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash)
}

export function getAvatarUrl(username: string): string {
  const style = STYLES[hashUsername(username) % STYLES.length]
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(username)}`
}
