// Images and audio are now stored as base64 data URIs directly in Postgres.
// No Supabase Storage bucket is used — these helpers just convert a File
// object to a data URI string that can be saved to the DB column as-is.

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result)   // "data:image/png;base64,..."
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsDataURL(file)
  })
}

export async function uploadPlayerImage(playerId, file) {
  return fileToBase64(file)
}

export async function uploadPlayerAvatarImage(playerId, file, kind) {
  return fileToBase64(file)
}

export async function uploadTeamLogo(teamId, file) {
  return fileToBase64(file)
}

export async function uploadTeamAnthem(teamId, file) {
  return fileToBase64(file)
}