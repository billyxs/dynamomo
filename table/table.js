'use strict'
const AWS = require('aws-sdk')
const chalk = require('chalk')
const _chunk = require('lodash/chunk')
const _mapValues = require('lodash/mapValues')
const _isArray = require('lodash/isArray')
const _get = require('lodash/get')
const _isPlainObject = require('lodash/isPlainObject')
const _isNumber = require('lodash/isNumber')
const _isUndefined = require('lodash/isUndefined')
const _omit = require('lodash/omit')

const Task = require('../task-message')
const session = require('../table-session')

// Don't set a default for tablePrefix in case it's not needed for a table
// tablePrefix equates to stage - prod, dev, int
let tablePrefix
let debug = false
let docClient

function config(params) {
  params = params || {}
  tablePrefix = params.tablePrefix || params.stage
  debug = params.debug === true
}

config.getTablePrefix = () => tablePrefix
config.isDebug = () => debug

/**
 * Checks data for Amazon types and
 * transforms them to plain javascript objects
 * @param data
 * @returns data
 */
function transformData(data) {
  if (_get(data, 'constructor.name') === 'Set') {
    return data.values || data
  }
  if (_isArray(data)) {
    return data.map(transformData)
  }
  if (_isPlainObject(data)) {
    return _mapValues(data, transformData)
  }
  return data
}

function createRequest(action, startParams) {
  startParams = startParams || {}
  // remove MaxLimit property
  const MaxLimit = startParams.MaxLimit
  const params = _omit(startParams, ['MaxLimit'])

  // When using MaxLimit, it must be a number greater than 1 to be useful
  if (!_isUndefined(MaxLimit) && (!_isNumber(MaxLimit) || MaxLimit < 1)) {
    return Promise.reject(
      new Error(
        `dynamomo: MaxLimit must be a number greater than zero. Received MaxLimit of ${MaxLimit}`
      )
    )
  }
  // Error for using MaxLimit and Limit together. This could have unintended consequences.
  if (!_isUndefined(MaxLimit) && !_isUndefined(params.Limit)) {
    return Promise.reject(
      new Error(
        `dynamomo: Received both MaxLimit and Limit properties. These two fields cannot be used together'`
      )
    )
  }

  if (MaxLimit) {
    params.Limit = MaxLimit
  }

  let TableName = params.TableName
  if (action === 'batchGet') {
    TableName = Object.keys(params.RequestItems)[0]
  }

  params.ReturnConsumedCapacity = 'TOTAL'
  const isDebug = config.isDebug()
  session.analyzeRequest(action, params)

  let data = []
  let scanned = 0
  let scanCount = 0
  let totalCapacity = 0
  let t
  if (isDebug) {
    t = new Task({ name: `${TableName}:${action}`, autoStart: true })
  }

  return new Promise((resolve, reject) => {
    doAction(params)
    function doAction(params) {
      docClient[action](params)
        .promise()
        .then(res => {
          // Get result data
          if (res.Item) {
            data = res.Item
          } else if (res.Items) {
            data = data.concat(res.Items)
          } else if (res.Responses) {
            data = res.Responses[TableName]
          }

          data = transformData(data)

          if (res.ScannedCount) scanned += res.ScannedCount
          if (res.ConsumedCapacity) {
            if (res.ConsumedCapacity.CapacityUnits) {
              totalCapacity += res.ConsumedCapacity.CapacityUnits
            } else if (Array.isArray(res.ConsumedCapacity)) {
              totalCapacity += res.ConsumedCapacity[0].CapacityUnits
            }
          }
          ++scanCount

          session.analyzeResponse(action, params, res)

          const LastEvaluatedKey = res.LastEvaluatedKey
          const continueQuery =
            LastEvaluatedKey && MaxLimit
              ? data.length < MaxLimit
              : !!LastEvaluatedKey

          if (continueQuery) {
            const Limit = MaxLimit ? MaxLimit - data.length : undefined
            doAction(
              Object.assign(
                {},
                params,
                {
                  ExclusiveStartKey: LastEvaluatedKey
                },
                Limit ? { Limit: Limit } : {}
              )
            )
          } else {
            const successMessage = Array.isArray(data)
              ? data.length + ' records'
              : '1 record'

            if (isDebug) {
              t.success(successMessage)
              t.complete(scanCount, scanned, totalCapacity)
            }

            if (MaxLimit) {
              resolve({
                LastEvaluatedKey: LastEvaluatedKey,
                Items: data,
                RowCount: data.length
              })
            } else {
              resolve(data)
            }
          }
        })
        .catch(e => {
          if (e.retryable) {
            setTimeout(() => {
              doAction(Object.assign({}, params))
            }, 1000)
          } else {
            if (isDebug) {
              t.error(e)
              t.complete(scanCount, scanned, totalCapacity)
            }

            reject(e)
          }
        })
    }
  })
}

/**
 * Get the table instance name. Commonly prefixed with a stage prefix such as dev-, int-, prod-
 * @return {String}
 */
function getTableName() {
  const tablePrefix = this.tablePrefix || config.getTablePrefix()
  if (this.noPrefix) {
    return this.name
  } else if (!tablePrefix) {
    console.warn(
      chalk.yellow(
        `Getting table named '${
          this.name
        }' without a stage prefix. This may be an error.`
      )
    )
    return this.name
  } else {
    return tablePrefix + '-' + this.name
  }
}

/**
 * Get record by Id
 * @param  {String} Id       Id for the record being retrieved
 * @param  {String} keyForId Specify the key name if it's not Id
 * @return {Promise}         Resolves the record Item
 */
function getById(Id, addParams) {
  addParams = addParams || {}

  const params = Object.assign(
    {},
    {
      TableName: this.getTableName(),
      Key: {
        [this.primaryKey]: Id
      }
    },
    addParams
  )

  return createRequest('get', params).then(res =>
    res.length === 0 ? null : res
  )
}

/**
 * Get record by user defined DynamoDB keys
 * @param  {Object} keys Any DynamoDB Key configuration
 * @return {[type]}      [description]
 */
function getByKey(keys) {
  return createRequest('get', {
    TableName: this.getTableName(),
    Key: keys
  })
}

/**
 * Get records using DynamoDB scan
 * This function takes care of pagination and recursively scans the table
 * to retrieve all records
 * @param  {Object} params Accepts any scan parameters defined by user
 * @return {Promise}        [description]
 */
function scan(params) {
  params = params || {}
  params.TableName = this.getTableName()

  return createRequest('scan', params)
}

/**
 * Get all records from an array of IDs
 * Uses the scan for method
 * @param  {Array} IdArray
 * @param  {String} keyForId  If ID is not the primary key, specify it
 * @return {Promise}
 */
function getAllById(IdArray) {
  const reqIds = _chunk(IdArray.map(id => ({ Id: id })), 100)

  const requests = []
  reqIds.forEach(group => {
    requests.push(
      createRequest('batchGet', {
        RequestItems: {
          [this.getTableName()]: {
            Keys: group
          }
        }
      })
    )
  })

  return new Promise((resolve, reject) => {
    Promise.all(requests)
      .then(res => {
        const result = res.reduce((prev, curr) => {
          return prev.concat(curr)
        }, [])

        resolve(result)
      })
      .catch(e => reject(e))
  })
}

/**
 * Query the table with DynamoDB's query request.
 * Currently doesn't handle recursively needs.
 * @param  {Object} params Key and values to match for query
 * @param {Object} addParams Raw DynamoDB query params
 * @return {Promise}
 */
function query(params) {
  params = params || {}
  params.TableName = this.getTableName()

  if (!params.IndexName && this.indexName) {
    params.IndexName = this.indexName
  }

  return createRequest('query', params)
}

/**
 * Query the table with DynamoDB's query request.
 * Currently doesn't handle recursively needs.
 * @param  {Object} params Key and values to match for query
 * @param {Object} addParams Raw DynamoDB query params
 * @return {Promise}
 */
function queryByKeys(queryKeys, addParams) {
  addParams = addParams || {}

  const keyConditionArray = []
  const ExpressionAttributeNames = {}
  const ExpressionAttributeValues = {}

  Object.keys(queryKeys).forEach((key, index) => {
    const value = queryKeys[key]
    const expressionNameKey = `#${key}`
    const expressionValueKey = `:${key}`
    ExpressionAttributeNames[expressionNameKey] = key
    ExpressionAttributeValues[expressionValueKey] = value
    keyConditionArray.push(`${expressionNameKey} = ${expressionValueKey}`)
  })

  addParams.KeyConditionExpression = keyConditionArray.join(' and ')
  addParams.ExpressionAttributeNames = ExpressionAttributeNames
  addParams.ExpressionAttributeValues = ExpressionAttributeValues

  return this.query(addParams)
}

/**
 * Update a DynamoDB table
 * @param  {Object} params Accepts any user defined update params
 * @return {Promise}
 */
function update(params) {
  params = params || {}
  params.TableName = this.getTableName()

  return createRequest('update', params)
}

/**
 * Put an item to a DynamoDB table
 * @param  {Object} params Accepts any user defined update params
 * @return {Promise}
 */
function put(params) {
  params = params || {}
  params.TableName = this.getTableName()

  return createRequest('put', params)
}

/**
 * Update a DynamoDB table
 * @param  {Object} params Accepts any user defined update params
 * @return {Promise}
 */
function updateById(Id, updateKeys, addParams) {
  addParams = addParams || {}
  addParams.TableName = this.getTableName()

  const ExpressionAttributeNames = {}
  const ExpressionAttributeValues = {}
  const UpdateExpressionArray = []

  Object.keys(updateKeys).forEach((key, index) => {
    const expName = `#v${index}`
    const expValue = `:v${index}`
    ExpressionAttributeNames[expName] = key
    ExpressionAttributeValues[expValue] = updateKeys[key]
    UpdateExpressionArray.push(`${expName} = ${expValue}`)
  })

  Object.assign(addParams, {
    Key: {
      [this.primaryKey]: Id
    },
    UpdateExpression: 'set ' + UpdateExpressionArray.join(', '),
    ExpressionAttributeNames: ExpressionAttributeNames,
    ExpressionAttributeValues: ExpressionAttributeValues
  })

  return createRequest('update', addParams)
}

/**
 * Delete an item from a DynamoDB table
 * @param  {Object} params Accepts any user defined delete params
 * @return {Promise}
 */
function deleteById(Id, addParams) {
  addParams = addParams || {}
  addParams.TableName = this.getTableName()

  Object.assign(addParams, {
    Key: {
      [this.primaryKey]: Id
    }
  })

  return createRequest('delete', addParams)
}

/**
 * Create a new table instance for querying DynamoDB
 * @param  {String} name   DynamoDB root table name. Prefixed stage
 * @param  {Object} options Overrides and settings for the table
 * @return {Object} table instance
 */
function CreateTable(name, options) {
  if (!name) {
    throw new Error('dynamomo: createTable requires a name to initialize')
  }
  options = options || {}

  session.useTable(name)

  this.tablePrefix = options.tablePrefix || options.stage || undefined
  this.noPrefix = options.noPrefix

  this.name = name
  this.getTableName = getTableName
  this.primaryKey = options.primaryKey || 'Id'
  this.indexName = options.indexName

  this.getById = getById
  this.getAllById = getAllById
  this.getByKey = getByKey

  this.queryByKeys = queryByKeys
  this.updateById = updateById
  this.deleteById = deleteById

  // native dynamodb commands
  this.query = query
  this.scan = scan
  this.update = update
  this.put = put

  this.createRequest = createRequest

  // Alias for scan
  this.getAll = scan

  // To create an action directly with the DynamoDB client
  this.client = docClient

  this.setIndexName = indexName => {
    this.indexName = indexName
    return this
  }

  this.setPrimaryKey = primaryKey => {
    this.primaryKey = primaryKey
    return this
  }

  return this
}

module.exports.config = config
module.exports.client = docClient
module.exports.create = function (tableName, options) {
  return new CreateTable(tableName, options)
}

module.exports = function dynamomo(awsConfig) {
  const DynamoDB = new AWS.DynamoDB(
    Object.assign(
      {
        apiVersion: '2012-08-10'
      },
      awsConfig
    )
  )

  // scope declared at the module level - not awesome
  docClient = new AWS.DynamoDB.DocumentClient(awsConfig)

  config({ tablePrefix, debug })

  return {
    create: function (tableName, options) {
      return new CreateTable(tableName, options)
    },
    client: DynamoDB.client,
    db: DynamoDB.db,
    config: config,
    getPolicy: require('../table-session').getPolicy
  }
}
