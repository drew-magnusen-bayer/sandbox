// import { unmarshall } from '@aws-sdk/util-dynamodb';
// import {
//   DynamoDBClient,
//   QueryCommand,
//   UpdateItemCommand
// } from "@aws-sdk/client-dynamodb";
// import AWS from 'aws-sdk';
// import fs from 'fs';

// let pageCount = 0;
// const EVENT_INGESTION_TABLE = 'event-ingestion-np';

// const getDbItems = async (params, data, queryLimit) => {
//   let combinedData = [...data];
  
//   if (queryLimit && combinedData.length >= queryLimit) {
//     return combinedData.slice(0, queryLimit)
//   }

//   const dynamodb = new DynamoDBClient({ apiVersion: "2012-08-10" });
//   const command = new QueryCommand(params);
//   const result = await dynamodb.send(command);
  
//   if (result.Items.length > 0) {
//     combinedData = [...combinedData, ...result.Items];
//   }
  
//   pageCount+=1;
//   if (result.LastEvaluatedKey) {
//     console.log(`${pageCount} recursively getting paginated data`);
//     const newParams = { ...params, ExclusiveStartKey: result.LastEvaluatedKey };
//     return getDbItems(newParams, combinedData, queryLimit);
//   }
  
//   return combinedData;
// };

// const queryTable = async (table, eventTypeId, queryLimit) => {
//   const params = {
//     TableName: table,
//     IndexName: "eventTypeId-index",
//     ExpressionAttributeNames: {
//       "#N": "eventTypeId"
//     },
//     ExpressionAttributeValues: {
//       ":n": {
//         N: String(eventTypeId)
//       }
//     },
//     KeyConditionExpression: "#N = :n"
//   };

//   const result = await getDbItems(params, [], queryLimit);
   
//   if (result) {
//     return result.map((item) => unmarshall(item));
//   }
//   return undefined;
// };


// export const updateDbItem = async (params) => {
//     try {
//       const dynamodb = new DynamoDBClient({ apiVersion: "2012-08-10" });
//       const command = new UpdateItemCommand(params);
//       const result = await dynamodb.send(command);
//       return unmarshall(result.Attributes);
//     } catch (error) {
//       console.error('Error at updateDbItem:', error);
//       throw new Error('Unable to updateDbItem');
//     }
// };


// export const updateEventTypeIds = async (id, eventTypeId)=> {
//     const params = {
//       TableName: EVENT_INGESTION_TABLE,
//       Key: {
//         id: { S: id },
//       },
//       ExpressionAttributeNames: {
//         "#ST": "status",
//         "#ET": "eventTypeId"
//       },
//       ExpressionAttributeValues: {
//         ':et': { N: String(eventTypeId) },
//         ':st': { S: 'new'}
//       },
//       UpdateExpression: 'SET #ET = :et, #ST = :st',
//       ReturnValues: 'ALL_NEW'
//     };
//     try {
//       const attributes = await updateDbItem(params);
//       if (JSON.parse(attributes.eventTypeId) === eventTypeId) {
//         return { error: false, msg: 'Item updated sucessfully' };
//       }
//       return { error: true, msg: 'Item was not updated in dynamo' };
//     } catch (error) {
//       console.log('error', error);
//       return { error: true, msg: 'Item was not updated in dynamo' };
//     }
//   };


// //409929 event of type 5
// //69639 evemts of type 6 (some of these are plot level, some set)
//   //56721 for eventType at set level (velocity)
// //944611 events of type 10 (some of these are plot level, some set)
//   //11126 for eventType at set level (velocity)
// //52418 events of type 27
// //52418 events of type 28
// const eventTypeId = 10;
// console.log(`Getting rows from table: ${EVENT_INGESTION_TABLE} of event type: ${eventTypeId}`);
// const rows = await queryTable(EVENT_INGESTION_TABLE, eventTypeId);
// console.log(`Found ${rows.length} with eventTypeId of ${eventTypeId}`);
// const eventsWithSetIds = rows.filter((r)=>r.setId)
// const uuids = eventsWithSetIds.map((e)=> e.id)
// // const pastOffsets = JSON.parse(fs.readFileSync('./pastOffsets.json', 'utf-8'))
// console.log(`Type 10 set level uuids: ${uuids.length}`)
// fs.writeFile('type10uuids.json', JSON.stringify(uuids), 'utf8', (err,data)=>{if(err) console.log(err)})

// const paramChunks = [];

// for (let i=0; i< uuids.length; i+=25){
//    console.log(`i = ${i}`);
//    const slice = uuids.slice(i, i+25)
//    paramChunks.push(
//     {
//         RequestItems: {
//             [`${EVENT_INGESTION_TABLE}`]: slice.map((id)=>(
//                 {
//                     DeleteRequest: {
//                         Key: {
//                             id: id
//                         }
//                     }
//                 }
//             ))
//         }
//     });
// }

// console.log(`got ${paramChunks.length} param chunks`)


// const dynamoDb = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' });
// let chunkCount = 0;
// for (const chunk of paramChunks) {
//     console.log(`sending chunk ${chunkCount++}`)
//     dynamoDb.batchWrite(chunk, (err, data) => {
//         if (err) {
//             console.error(err);
//         } else {
//             console.log(data);
//         }
//     });
//     await new Promise(r => setTimeout(r, 2000));
// }

 




// // for (const id of uuids) {
// //     console.log(`${i++} updating ${id}`)
// //     const updateResult =;
// //     console.log('updateResult', updateResult)
// // }

