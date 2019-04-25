'use strict'
const chalk = require('chalk')

const actionListMap = {
  scan: 'Scan',
  query: 'Query',
  get: 'GetItem',
  batchGet: 'BatchGetItem',

  update: 'UpdateItem',
  put: 'PutItem'
}

const tables = new Set()
const actions = new Set()
let totalCapacity = 0

function useTable (baseTableName) {
  tables.add(baseTableName)
  return tables
}

function useAction (action) {
  const actionItem = actionListMap[action]
  if (actionItem) {
    actions.add(actionItem)
  } else {
    console.log(`dynamomo:table-session - Did not recognize ${action} action`)
  }
}

function analyzeRequest (action, params) {
  const TableName = params.TableName

  useAction(action)

  if (action !== 'batchGet' && !params.TableName) {
    console.log(
      chalk.yellow(
        `WARNING - dynamomo:${TableName} table - TableName param required for request`
      )
    )
  }

  if ((action === 'scan' || action === 'query') && !params.IndexName) {
    console.log(
      chalk.yellow(
        `WARNING - dynamomo:${TableName} table - No index key specified for scan or query on ${TableName} table. Optimize this request with an index key`
      )
    )
  }
}

function analyzeResponse (action, params, response) {
  let TableName = params.TableName

  useAction(action)

  let Items = response.Items
  if (action === 'batchGet') {
    TableName = Object.keys(params.RequestItems)[0]
    Items = response.Responses[TableName]
  }

  if (Items && Items > 50 && Object.keys(Items[0]).length > 10) {
    console.log(
      chalk.yellow(
        `WARNING - dynamomo:${TableName} table - Returning more than 10 keys for per item. Consider using a ProjectionExpression and declare the keys you need.`
      )
    )
  }

  if (response.ConsumedCapacity) {
    if (response.ConsumedCapacity.CapacityUnits) {
      totalCapacity += response.ConsumedCapacity.CapacityUnits
    } else if (Array.isArray(response.ConsumedCapacity)) {
      response.ConsumedCapacity.forEach(item => {
        totalCapacity += item.CapacityUnits
      })
    }
  }
}

function getPolicy () {
  const buildPolicyActions = Array.from(actions).map(
    action => `"dynamodb:${action}"`
  )
  const buildPolicyTables = Array.from(tables).map(
    table => `"arn:aws:dynamodb:{AWS_REGION}:{AWS_ACCOUNT_ID}:table/*-${table}"`
  )

  let resultCapacity
  if (totalCapacity > 1024) {
    resultCapacity = (totalCapacity / 1024).toFixed(2) + ' mb'
  } else {
    resultCapacity = totalCapacity + ' kb'
  }

  console.log(chalk.cyan(`TOTAL Capacity Consumed: ${resultCapacity}`))

  console.log(
    chalk.white(`
${chalk.dim(
  '======================================================================='
)}
Your IAM dynamo policy should look something like this
${chalk.dim(
  '======================================================================='
)}
{
    "Action": [
        ${buildPolicyActions.join(`,
        `)}
    ],
    "Effect": "Allow",
    "Resource": [
        ${buildPolicyTables.join(`,
        `)}
    ]
}
${chalk.dim(
  '======================================================================='
)}
  `)
  )
}

module.exports = {
  analyzeRequest: analyzeRequest,
  analyzeResponse: analyzeResponse,
  useTable: useTable,
  useAction: useAction,
  getPolicy: getPolicy
}
