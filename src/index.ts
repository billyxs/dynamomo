import { DynamoDB } from 'aws-sdk'

// interfaces
interface DynamomoConfig {
  type: object
}

/*
 * Create Dynamomo Client 
 */
export default function dynamomo(config:object = {}) {
  return new DynamoDB.DocumentClient(config)
}
