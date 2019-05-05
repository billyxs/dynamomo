# Dynamomo
---
An interface for AWS DynamoDB with helper functions


```bash
npm install --save dynamomo 
```

## Module level ##
1. config - configure the table with stage or other variables
2. client - a DynamoDB client
3. getPolicy - get an output of what policy your lambda will need to interface with dynamodb

## Table Instance ##
1. client - a DynamoDB client
1. getTableName - get the object's table name
1. scan - get all records for a table
1. getAll - alias for scan
1. getById - get a record by the primary key 
1. getAllById - get a records from a list of primary keys 
1. updateById - update a record by the primary key 
1. deleteById - delete a record by the primary key 
1. getByKey - like getById, but allows any Key configuration to be set
1. update - update a record by calling client.update()
1. query - DynamoDB query with provided params

# Usage 
---

```javascript
// import
import dynamomo from 'dynamomo'

const myDynamomo = dynamomo({ region: 'us-east-1' })

const itemsTable = myDynamomo.create('items')
const myItem = itemsTable.getById(1)
```


# config({ tablePrefix, debug })
---

```javascript
// import
import dynamomo from 'dynamomo'

// Configure dynamomo with table prefix and logging 
dynamomo.config({
  debug: true,         // outputs dynamodb usage information as you query

  tablePrefix: 'prod', // takes care of prefixing for tables.
                       // eg: table name 'items' will be 'prod-items' 
})

```


# create(tableName, { primaryKey, indexName }) #
---
Create a new table instance. This does not "create" the table. Only the binding to the table.

Options available

1. primaryKey - defaults to `Id` if not specified
2. indexName - table index to be used with query

```javascript
// Access the root table by name. For the prod-items table, just user the name items 
// This will handle prefixing for prod-items, int-items, and dev-items on it's own
const items = dynamomo.create('items')

// With a specified primary key
const items = dynamomo.create('items', { primaryKey; 'ItemPublicKey' })

// With a specified index key
const items = dynamomo.create('items', { indexName; 'ItemPublicKey-index' })

```

# getById(id) #
---

Retrieve a record using the Id field of the table, or other named Id field

**NOTE: If item is not found, the promise will resolve successfully with a response of undefined**

```javascript
// Uses the primary key Id by default
items.getById(1)
```

# getAllById(idArray) #
---

Retrieve all the records of a table from an array of Ids.  Uses DynamoDB batch get to retrieve the records.  DyanamoDB limits the result to 100 records, so if more than 100 IDs are requested, the function will make a separate request for every set of 100 IDs.


"Yo dawg, I heard you like batch requests.  So we put a batch request on your batch request so you can get all your records while getting some records"

```javascript
items.getAllById([1, 2, 3, 4])
```


# updateById(id, attributes, addParams) #
---

Update a record's data by specifying it's Id and the attributes to update. Provide additional dynamo client parameters as needed

```javascript
const id = 1
const updateKeys = { EmailAddress: 'newemail@email.com' }
const addParams = { ReturnValues: 'UPDATED_NEW' }

items.updateById(id, updateKeys, addParams)
```

# queryByKeys(keys, addParams) #
---

Get all records that match the list of keys provided. This often requires the use of the proper index of the table. The params will be packaged into the KeyConditionExpression DynamoDB needs to make the request.

```javascript
const keys = { categoryName: 'toys' }
const addParams = { IndexName: 'CategoryName-index' }

items.queryByKeys(keys, addParams)
```

# deleteById(id, addParams) #
---

Delete a record's data by specifying its Id. Provide additional dynamo client parameters as needed

```javascript
items.deleteById(1)
```

# getAll(scanParams) - Alias for scan #
---

Retrieve all the records for a table.  This handles the recursive actions needed for DynamoDB to get all records
```javascript
items.getAll() // alias for scan
```

# query(params) #
---

DynamoDB query operation.
```javascript
items.query(params)
```


# update(params) #
---

DynamoDB update operation. 
```javascript
items.update(dynamoUpdateParams)
```

# scan(params) #
---

DyanamoDB scan operation. This handles the recursive actions needed for DynamoDB to get all records.
```javascript
items.scan(params)
```



## MaxLimit - special limit config property

Any batch commands such as scan or query can take a specialized `MaxLimit` property to control the amount of records pulled. This is different than the `Limit` property used by Dynamodb. MaxLimit will make recursive calls until it retrieves the `MaxLimit` value, or if it reaches the end of the table rows. 

Since `MaxLimit` is not a property allowed by Dynamodb, the property is removed from the config when the passed to the Dynamodb client. 

**Example with getAll/scan**
```js
const itemList = await items.getAll({ 
  MaxLimit: 300, 
  ProjectionExpression: 'ItemName, Category' 
})

// the items result will be an object
{
  Items: [ ... ], // 300 items from the database
  LastEvaluatedKey: { Id: 123 }, // Where the query ended when it reached the limit. LastEvaluatedKey can change as the table size changes.
  RowCount: 300 // Total rows return 
}
```

**Example with queryByKeys**
```js
const itemList = await items.queryByKeys({
  CategoryId: '2'
}, { 
  MaxLimit: 2, 
  ProjectionExpression: 'ItemName, Category' 
})
```
