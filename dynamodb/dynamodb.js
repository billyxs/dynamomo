'use strict'
const AWS = require('aws-sdk')

const REGION = 'us-west-2'

const DynamoDB = new AWS.DynamoDB({ apiVersion: '2012-08-10', region: REGION })
const docClient = new AWS.DynamoDB.DocumentClient({ region: REGION })

module.exports = {
  db: DynamoDB,
  client: docClient
}
