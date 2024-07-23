import { unmarshall } from '@aws-sdk/util-dynamodb';
import {
  DynamoDBClient,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";

let pageCount = 0;
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


//409929 event of type 5
//69639 evemts of type 6 (some of these are plot level, some set)
  //56721 for eventType at set level (velocity)
//944611 events of type 10 (some of these are plot level, some set)
  //11126 for eventType at set level (velocity)
//52418 events of type 27
//52418 events of type 28
const table = 'event-ingestion-np';
const eventTypeIds = [6];
console.log(`Getting rows from table: ${table} of event type: ${eventTypeIds}`);
const rows = await queryTable(table, 6);
console.log(`Found ${rows.length} with eventTypeId of ${eventTypeIds}`);

const eventsWithSetIds = rows.filter((r)=>r.setId)
console.log(eventsWithSetIds.length)


