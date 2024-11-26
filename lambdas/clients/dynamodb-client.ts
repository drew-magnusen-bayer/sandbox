import { DynamoDBClient, QueryCommand, PutItemCommand, UpdateItemCommand, BatchWriteItemCommand } from "@aws-sdk/client-dynamodb";
import _ from "lodash";
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");
import { v4 as uuidv4 } from 'uuid';

const awsConfig = { region: 'us-east-1' };
const CSW_CACHE_TABLE = 'CSWCache';
const client = new DynamoDBClient(awsConfig);

export const getDbItem = async (params) => {
  try {
    const command = new QueryCommand(params);    
    const data = await client.send(command);
    return data.Items.map((item)=> unmarshall(item));
  } catch (error) {
    console.error('Error at getDbItem:', error);
    throw new Error('Unable to getDbItem');
  }
};

export const getDbItems = async (params: any, data: any, queryLimit?: number) => {
  let combinedData = [...data];
  
  if (queryLimit && combinedData.length >= queryLimit) {
    return combinedData.slice(0, queryLimit).map((item: any)=> unmarshall(item));
  }

  const command = new QueryCommand(params);
  const result = await client.send(command);
  
  if (result.Items.length > 0) {
    combinedData = [...combinedData, ...result.Items];
  }
  
  if (result.LastEvaluatedKey) {
    console.log('Recursively getting paginated data.');
    const newParams = { ...params, ExclusiveStartKey: result.LastEvaluatedKey };
    return getDbItems(newParams, combinedData, queryLimit);
  }
  
  if (queryLimit && combinedData.length >= queryLimit) {
    return combinedData.slice(0, queryLimit).map((item: any)=> unmarshall(item));
  }

  return combinedData.map((item: any)=> unmarshall(item));
};

export const putDbItem = async (params) => {
  try {
    const command = new PutItemCommand(params);
    return await client.send(command);
  } catch (error) {
    console.error('Error at putDbItem:', error);
    throw new Error('Unable to putDbItem');
  }
};

export const updateDbItem = async (params) => {
  try {
    const command = new UpdateItemCommand(params);
    const result = await client.send(command);
    return unmarshall(result.Attributes);
  } catch (error) {
    console.error('Error at updateDbItem:', error);
    throw new Error('Unable to updateDbItem');
  }
};

export const updateQueryOffset = async (offsetKey: string, offset: number)=> {
  const params = {
    TableName: CSW_CACHE_TABLE,
    Key: {
      key: { S: offsetKey },
    },
    UpdateExpression: 'SET cacheData = :v',
    ExpressionAttributeValues: {
      ':v': { S: `{ "offset": ${offset} }` },
    },
    ReturnValues: 'ALL_NEW'
  };
  try {
    const attributes = await updateDbItem(params);
    if (JSON.parse(attributes.cacheData).offset === offset) {
      return { error: false, msg: 'Item updated sucessfully' };
    }
    return { error: true, msg: 'Item was not updated in dynamo' };
  } catch (error) {
    console.log('error', error);
    return { error: true, msg: 'Item was not updated in dynamo' };
  }
};

export const getQueryOffset = async (offsetKey: string) => {
  const params = {
    TableName: CSW_CACHE_TABLE,
    KeyConditionExpression: '#k = :k',
    ExpressionAttributeNames: {
      "#k": "key",
    },
    ExpressionAttributeValues: {
      ':k': { 'S': offsetKey }
    }
  };

  try {
    const items = await getDbItem(params);
    return { error: false, data: JSON.parse(items[0].cacheData).offset };
  } catch (error) {
    console.log('error', error);
    return { error: true };
  }
};

export const batchPutDbItem = async (params: any) => {
  try {
    const command = new BatchWriteItemCommand(params);
    const result = await client.send(command);
    return result;  
  } catch (error) {
    console.error('Error at batchPutDbItem: ', error);
    throw new Error('Unable to batchPutDbItem');
  }
};

export const buildDynamoObject = (obj: any) => {
  const dynamoObj = marshall(obj);
  Object.assign(dynamoObj, { 'status': { 'S':'new' } });
  Object.assign(dynamoObj, { 'id': { 'S': uuidv4() } });
  return dynamoObj;
};

export const chunkAndWriteToDynamo = async(items: any[], dynamoTableName: string): Promise<{error: boolean, msg: string, successfulIds: string[] }> =>{
  const batchItemsChunks = _.chunk(items, 25);
  const dynamoResponses = [];
  let chunkCount = 1;

  const successfulIds = [];

  for (const chunk of batchItemsChunks) {
    console.info(`Attempting to writing chunk ${chunkCount++} of ${batchItemsChunks.length} to dynamo.`);
    if (chunk) {
      console.info(`Chunk not null. Sending`);
      const putResult = await batchPutDbItem(
        {
          RequestItems: {
            [`${dynamoTableName}`]: chunk
          }
        }
      );

      dynamoResponses.push(putResult);

      if (putResult.$metadata.httpStatusCode === 200) {
        successfulIds.push(...chunk.map((c) => c.PutRequest.Item.id.S));
      }
    }
  }
  
  if (dynamoResponses.filter((r)=> r.$metadata.httpStatusCode !== 200).length > 0) {
    const msg = `An error occured while batch writing items to Dynamo ${dynamoTableName}.`;
    console.error(msg);
    return { error: true, msg, successfulIds };
  } else {
    const msg = 'All items written to dynamo successfully.';
    console.info(msg);
    return { error: false, msg, successfulIds };
  }
};

export const updateRecordStatusToNew = async (table: string, id: string)=> {
  const params = {
    TableName: table,
    Key: {
      id: { S: id },
    },
    ExpressionAttributeNames: {
      "#ST": "status"
    },
    ExpressionAttributeValues: {
      ':st': { S: 'new' }
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