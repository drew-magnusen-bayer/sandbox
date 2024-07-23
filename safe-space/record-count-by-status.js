import { unmarshall } from '@aws-sdk/util-dynamodb';
import {
  DynamoDBClient,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";

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


// 1397 new records
// 6464 error
// 3026 new
const table = 'event-ingestion-np';
// const status = 'start'
// console.log(`Getting row count from table: ${table} with status of : ${status}`);

const newRows =  await queryTable(table, 'new');
const startedRows = await queryTable(table, 'started');
const errorRows =  await queryTable(table, 'error');
// const setIds = [
//   ...newRows.map((n)=>n.setId),
//   ...startedRows.map((n)=>n.setId),
//   ...errorRows.map((n)=>n.setId),
// ]
console.log('new count: ', newRows.length)
console.log('started count: ', startedRows.length)
console.log('error count: ', errorRows.length)
// new count:  165945
// started count:  958225
// error count:  525