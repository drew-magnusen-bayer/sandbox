import { unmarshall } from '@aws-sdk/util-dynamodb';
import {
  DynamoDBClient,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";
import fs from 'fs';

let pageCount = 1;
const getDbItems = async (params, data) => {
  let combinedData = [...data];
  
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
    return getDbItems(newParams, combinedData);
  }
  
  return combinedData;
};

const queryTable = async (table, status) => {
  const params = {
    TableName: table,
    IndexName: "status-index",
    ExpressionAttributeNames: {
      "#S": "status"
    },
    ExpressionAttributeValues: {
      ":s": {
        S: status
      }
    },
    KeyConditionExpression: "#S = :s"
  };

  const result = await getDbItems(params, []);
   
  if (result) {
    return result.map((item) => unmarshall(item));
  }
  return undefined;
};

const table = 'set-ingestion-np';

const newRows =  await queryTable(table, 'new');
const startedRows = await queryTable(table, 'started');
const errorRows =  await queryTable(table, 'error');
const allRows = [
  ...newRows,
  ...startedRows,
  ...errorRows
]
const velocitySetIds = allRows.filter((r)=>r.source === 'velocity').map((r)=>r.setId)

const ftsSetIds = allRows.filter((r)=>r.source === 'fts').map((r)=>r.setId)

const uuids = allRows.map((r)=> r.id)

console.log('Number of sets with new status: ', newRows.length)
console.log('Number of sets with started status: ', startedRows.length)
console.log('Number of sets with error status: ', errorRows.length)
console.log('Number of velocity sets: ', velocitySetIds.length)
console.log('Number of fts sets: ', ftsSetIds.length)
console.log(`Total number of sets ${velocitySetIds.length + ftsSetIds.length}`);

fs.writeFile('./files/velocity-set-cleanup.json', JSON.stringify(velocitySetIds), 'utf8', (err,data)=>{if(err) console.log(err)})
fs.writeFile('./files/fts-set-cleanup.json', JSON.stringify(ftsSetIds), 'utf8', (err,data)=>{if(err) console.log(err)})
fs.writeFile('./files/set-cleanup-uuids-to-delete.json', JSON.stringify(uuids), 'utf8', (err,data)=>{if(err) console.log(err)})