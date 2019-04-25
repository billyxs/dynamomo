'use strict'

/**
 * Dynamomo
 */
const DynamoDB = require('./dynamodb')
module.exports = {
  create: require('./table').create,
  client: DynamoDB.client,
  db: DynamoDB.db,
  config: require('./config'),
  getPolicy: require('./table-session').getPolicy
}
