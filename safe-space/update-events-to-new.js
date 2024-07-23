import { unmarshall } from '@aws-sdk/util-dynamodb';
import {
  DynamoDBClient,
  QueryCommand,
  UpdateItemCommand
} from "@aws-sdk/client-dynamodb";
import fs from 'fs';

let pageCount = 0;
const EVENT_INGESTION_TABLE = 'event-ingestion-np';

const getDbItems = async (params, data, queryLimit) => {
  let combinedData = [...data];
  
  if (queryLimit && combinedData.length >= queryLimit) {
    return combinedData.slice(0, queryLimit)
  }

  const dynamodb = new DynamoDBClient({ apiVersion: "2012-08-10" });
  const command = new QueryCommand(params);
  const result = await dynamodb.send(command);
  
  if (result.Items.length > 0) {
    combinedData = [...combinedData, ...result.Items];
  }
  
  pageCount+=1;
  if (result.LastEvaluatedKey) {
    console.log(`${pageCount} recursively getting paginated data`);
    const newParams = { ...params, ExclusiveStartKey: result.LastEvaluatedKey };
    return getDbItems(newParams, combinedData, queryLimit);
  }
  
  return combinedData;
};

const queryTable = async (table, eventTypeId, queryLimit) => {
  const params = {
    TableName: table,
    IndexName: "eventTypeId-index",
    ExpressionAttributeNames: {
      "#N": "eventTypeId"
    },
    ExpressionAttributeValues: {
      ":n": {
        N: String(eventTypeId)
      }
    },
    KeyConditionExpression: "#N = :n"
  };

  const result = await getDbItems(params, [], queryLimit);
   
  if (result) {
    return result.map((item) => unmarshall(item));
  }
  return undefined;
};


export const updateDbItem = async (params) => {
    try {
      const dynamodb = new DynamoDBClient({ apiVersion: "2012-08-10" });
      const command = new UpdateItemCommand(params);
      const result = await dynamodb.send(command);
      return unmarshall(result.Attributes);
    } catch (error) {
      console.error('Error at updateDbItem:', error);
      throw new Error('Unable to updateDbItem');
    }
};

  export const updateEventStatusToNew = async (id)=> {
    const params = {
      TableName: EVENT_INGESTION_TABLE,
      Key: {
        id: { S: id },
      },
      ExpressionAttributeNames: {
        "#ST": "status"
      },
      ExpressionAttributeValues: {
        ':st': { S: 'new'}
      },
      UpdateExpression: 'SET #ST = :st',
      ReturnValues: 'ALL_NEW'
    };
    try {
      const attributes = await updateDbItem(params);
      if (attributes.status === 'new') {
        return { error: false, msg: 'Item updated sucessfully' };
      }
      return { error: true, msg: 'Item was not updated in dynamo' };
    } catch (error) {
      console.log('error', error);
      return { error: true, msg: 'Item was not updated in dynamo' };
    }
  };

const uuids = JSON.parse(fs.readFileSync('./files/event-cleanup-uuids.json', 'utf-8'))

for (let i=0; i< uuids.length; i+=100){
   console.log(`i = ${i}`);
   const response = await Promise.all(uuids.slice(i, i+100).map((id)=> (updateEventStatusToNew(id))));
   console.log(`response ${JSON.stringify(response)}`);
   await new Promise(r => setTimeout(r, 1000));
}
