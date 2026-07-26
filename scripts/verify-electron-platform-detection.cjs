const { app } = require('electron')
const { join } = require('node:path')
const { pathToFileURL } = require('node:url')

app
  .whenReady()
  .then(async () => {
    const moduleUrl = pathToFileURL(
      join(__dirname, '..', 'out', 'main', 'local-platforms.js'),
    ).toString()
    const {
      detectBattleNetLocalPlatform,
      detectEaAppLocalPlatform,
      detectUbisoftConnectLocalPlatform,
      readGogLocalLibrary,
    } = await import(moduleUrl)
    const detections = await Promise.all([
      detectEaAppLocalPlatform(),
      detectUbisoftConnectLocalPlatform(),
      detectBattleNetLocalPlatform(),
    ])
    const providers = detections.map((detection) => detection.provider)

    for (const expectedProvider of ['EA_APP', 'UBISOFT', 'BATTLENET']) {
      if (!providers.includes(expectedProvider)) {
        throw new Error(`Détection ${expectedProvider} absente.`)
      }
    }

    console.log(
      detections
        .map(
          (detection) =>
            `${detection.label}: ${detection.detected ? 'détecté' : 'absent'}`,
        )
        .join(' / '),
    )
    const gogLibrary = await readGogLocalLibrary()
    const gogDlcCount = gogLibrary.games.reduce(
      (total, game) => total + (game.dlcs?.length ?? 0),
      0,
    )
    const gogAchievementCount = gogLibrary.games.reduce(
      (total, game) => total + (game.achievements?.length ?? 0),
      0,
    )

    console.log(
      `GOG: ${gogLibrary.games.length} jeu(x), ${gogDlcCount} DLC, ${gogAchievementCount} succès`,
    )
    app.quit()
  })
  .catch((error) => {
    console.error(error)
    app.exit(1)
  })
