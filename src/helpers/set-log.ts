import log from "electron-log/main"

export function setLog(e, toFile = true) {
  if (toFile) {
    log.error(e)
  } else {
    console.log(e)
  }
}
