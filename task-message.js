'use strict'
const chalk = require('chalk')

let id = 1
module.exports = function (params) {
  params = params || {}
  const name = params.name || `m${id++}`
  let startTime
  let waitingSetInterval = null

  const STATUS_INFO = 'cyan'
  const STATUS_SUCCESS = 'green'
  const STATUS_ERROR = 'red'
  const STATUS_WARNING = 'yellow'

  function cMessage (message, color) {
    message = `${name}: ${message}`
    console.log(chalk[color](message))
  }

  const start = () => {
    cMessage('Started', STATUS_INFO)
    let count = 1
    const WAIT_SECONDS = 5
    waitingSetInterval = setInterval(() => {
      cMessage(`Working...${count++ * WAIT_SECONDS} seconds`, STATUS_WARNING)
    }, WAIT_SECONDS * 1000)
  }

  if (params.autoStart) {
    startTime = new Date()
    start()
  }

  return {
    start: start,
    success: (message) => {
      cMessage(`Success: ${message}`, STATUS_SUCCESS)
    },
    error: (error) => {
      const message = error.message || error
      cMessage(`Error:` + message, STATUS_ERROR)
    },
    complete: (scanCount, scanned, totalCapacity) => {
      clearInterval(waitingSetInterval)
      const finish = new Date()
      cMessage(`Request finished: ${((finish - startTime) / 1000)} seconds
    Total scans made: ${scanCount}
    Total documents scanned: ${scanned}
    Total capacity used: ${(totalCapacity).toFixed(2)} kb`, STATUS_INFO)
    }
  }
}
