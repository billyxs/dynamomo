'use strict'

// Don't set a default for tablePrefix in case it's not needed for a table
// tablePrefix equates to stage - prod, dev, int
let tablePrefix
let debug = false

/**
 * config
 * @param  {Object} params - currently handles AWS stage configuration for table prefixing
 * @return {void}
 */
function config (params) {
  params = params || {}
  tablePrefix = params.tablePrefix || params.stage
  debug = params.debug === true
}

config.getTablePrefix = () => tablePrefix
config.isDebug = () => debug

module.exports = config
