import { unmarshall } from '@aws-sdk/util-dynamodb';
import {
  DynamoDBClient,
  QueryCommand,
  UpdateItemCommand,
  TransactWriteItemsCommand
} from "@aws-sdk/client-dynamodb";

const TABLE = 'drew-test'

export const transactDbItem = async (params) => {
    try {
        const dynamodb = new DynamoDBClient({ apiVersion: "2012-08-10", maxAttempts: 2 });
        const command = new TransactWriteItemsCommand(params);
        const result = await dynamodb.send(command);

        console.log('r', result)
        // return unmarshall(result.Attributes);
        return result
      } catch (error) {
        console.error('Error at updateDbItem:', error);
        throw new Error('Unable to updateDbItem');
      }
}
export const updateDbItem = async (params) => {
    try {
      const dynamodb = new DynamoDBClient({ apiVersion: "2012-08-10", maxAttempts: 2 });
      const command = new UpdateItemCommand(params);

    //   const result = await dynamodb.send(command);
    const result = await dynamodb.tra .send(command);
      return unmarshall(result.Attributes);
    } catch (error) {
      console.error('Error at updateDbItem:', error);
      throw new Error('Unable to updateDbItem');
    }
};

export const doIt = async (id, status)=> {
    const params = {
        Update:{
            TableName: TABLE,
            Key: {
              id: { S: id }
            },
            ExpressionAttributeNames: {
              "#ST": "status"
            },
            ExpressionAttributeValues: {
              ':st': { S: status}
            },
            UpdateExpression: 'SET #ST = :st',
            ReturnValues: 'ALL_NEW'
          }
    };
    try {
      const record = await transactDbItem(
          {
            TransactItems: [params]
        }
        );
      console.log(JSON.stringify(record))
      if (record.status === status) {
        return { error: false, msg: 'Item updated sucessfully' };
      }
      return { error: true, msg: 'Item was not updated in dynamo' };
    } catch (error) {
      console.log('error', error);
      return { error: true, msg: 'Item was not updated in dynamo' };
    }
  };
  
  await doIt('1', 'a');
  await doIt('1', 'b');