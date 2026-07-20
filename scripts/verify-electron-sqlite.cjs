const { app } = require('electron')
const Database = require('better-sqlite3')

app
  .whenReady()
  .then(() => {
    const database = new Database(':memory:')
    const row = database.prepare('select 1 as ok').get()

    database.close()

    if (row.ok !== 1) {
      throw new Error('Unexpected SQLite smoke test result.')
    }

    console.log(`better-sqlite3 electron ok (modules=${process.versions.modules})`)
    app.quit()
  })
  .catch((error) => {
    console.error(error)
    app.exit(1)
  })
