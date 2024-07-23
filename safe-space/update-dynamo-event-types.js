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

export const updateEventTypeIds = async (id, eventTypeId)=> {
    const params = {
      TableName: EVENT_INGESTION_TABLE,
      Key: {
        id: { S: id },
      },
      ExpressionAttributeNames: {
        "#ST": "status",
        "#ET": "eventTypeId"
      },
      ExpressionAttributeValues: {
        ':et': { N: String(eventTypeId) },
        ':st': { S: 'new'}
      },
      UpdateExpression: 'SET #ET = :et, #ST = :st',
      ReturnValues: 'ALL_NEW'
    };
    try {
      const attributes = await updateDbItem(params);
      if (JSON.parse(attributes.eventTypeId) === eventTypeId) {
        return { error: false, msg: 'Item updated sucessfully' };
      }
      return { error: true, msg: 'Item was not updated in dynamo' };
    } catch (error) {
      console.log('error', error);
      return { error: true, msg: 'Item was not updated in dynamo' };
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

//409929 event of type 5
  //15933 at se level
//69639 evemts of type 6 (some of these are plot level, some set)
  //56721 for eventType at set level (velocity)
//944611 events of type 10 (some of these are plot level, some set)
  //11126 for eventType at set level (velocity)
//52418 events of type 27
//52418 events of type 28
const eventTypeId = 27;
console.log(`Getting rows from table: ${EVENT_INGESTION_TABLE} of event type: ${eventTypeId}`);
const rows = await queryTable(EVENT_INGESTION_TABLE, eventTypeId);
console.log(`Found ${rows.length} with eventTypeId of ${eventTypeId}`);
const distinctSetIds = [...new Set(rows.filter(s=>s.setId).map((r)=>r.setId))]
const started = rows.filter((r)=>r.status === 'started');
const success = rows.filter((r)=>r.status === 'success');
const error = rows.filter((r)=>r.status === 'error');

console.log(rows.filter((r)=>r.setId === '279513'))
// const targets = JSON.stringify(distinctSetIds.filter(s=>s.setId).map( s => s.setId))
// fs.writeFile('event27SetIds.json', JSON.stringify(distinctSetIds), 'utf8', (err,data)=>{if(err) console.log(err)})

// console.log(`started ${started.length}, success ${success.length}, error ${error.length}`)
// console.log(`distinct setIds = ${distinctSetIds.size}`)
// const eventsWithSetIds = rows.filter((r)=>r.setId)
// const uuids = eventsWithSetIds.map((e)=> e.id)

for (let i=0; i< uuids.length; i+=100){
   console.log(`i = ${i}`);
   const response = await Promise.all(uuids.slice(i, i+100).map((id)=> (updateEventStatusToNew(id))));
   console.log(`response ${JSON.stringify(response)}`);
   await new Promise(r => setTimeout(r, 1000));
}

// for (const id of uuids) {
//     console.log(`${i++} updating ${id}`)
//     const updateResult =;
//     console.log('updateResult', updateResult)
// }

