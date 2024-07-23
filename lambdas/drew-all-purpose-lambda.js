// import { unmarshall } from '@aws-sdk/util-dynamodb';
// import {
//   DynamoDBClient,
//   QueryCommand,
// } from "@aws-sdk/client-dynamodb";
// import { CloudWatchClient, StandardUnit, PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";

// let pageCount = 1;
// const getDbItems = async (params, data) => {
//   let combinedData = [...data];
  
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
//     return getDbItems(newParams, combinedData);
//   }
  
//   return combinedData;
// };

// const queryTable = async (table, status) => {
//   const params = {
//     TableName: table,
//     IndexName: "status-index",
//     ExpressionAttributeNames: {
//       "#S": "status"
//     },
//     ExpressionAttributeValues: {
//       ":s": {
//         S: status
//       }
//     },
//     KeyConditionExpression: "#S = :s"
//   };

//   const result = await getDbItems(params, []);
   
//   if (result) {
//     return result.map((item) => unmarshall(item));
//   }
//   return undefined;
// };

// exports.handler = async () => {

// // 1397 new records
// // 6464 error
// // 3026 new
// const table = 'event-ingestion-np';
// // const status = 'start'
// // console.log(`Getting row count from table: ${table} with status of : ${status}`);

// const results =  await Promise.all([queryTable(table, 'new'), queryTable(table, 'started'), queryTable(table, 'error')])

// // console.log('new count: ', newRows.length)
// // console.log('started count: ', startedRows.length)
// // console.log('error count: ', errorRows.length)

// // var timestamp = new Date().toTimeString().split(' ')[0];
// // a client can be shared by different commands.
// const client = new CloudWatchClient({ region: "us-east-1" });

// const input = { // PutMetricDataInput
//     Namespace: "eventIngestionNpRecordCountByStatus", // required
//     MetricData: [ // MetricData // required
//       { // MetricDatum
//         MetricName: "new", // required
//         Timestamp: new Date(),
//         Value: results[0].length,
//         Unit: StandardUnit.Count,
//         StorageResolution: 60,
//       },      { // MetricDatum
//         MetricName: "started", // required
//         Timestamp: new Date(),
//         Value: results[1].length,
//         Unit: StandardUnit.Count,
//         StorageResolution: 60,
//       },
//       { // MetricDatum
//         MetricName: "error", // required
//         Timestamp: new Date(),
//         Value: results[2].length,
//         Unit: StandardUnit.Count,
//         StorageResolution: 60,
//       }
//     ]
//   };
//   const command = new PutMetricDataCommand(input);
//   const response = await client.send(command);


// // return {
// //     newCount: newRows.length,
// //     startedRows: startedRows.length,
// //     errorRows: errorRows.length
// // }

// }




const { getVelocityBqData, getFtsBqData } = require("./clients/bigquery-client")
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

exports.handler = async (event, context, callback) => {
  const zscan = await getS3();

  if (process.env.VELOCITY) {
    const velocity = await getVelocityBqData();
    const velocityResults = [];
  
    velocity.forEach((r)=>{
      const match = zscan.find((z)=>z.inventory_bid.toString() === r.barcode)
      if (match) {
        velocityResults.push({
          box_bid: match.box_bid,
          container_bid: match.container_bid,
          inventory_bid: r.barcode,
          ...r
        })
      } else {
        velocityResults.push({
          box_bid: null,
          container_bid: null,
          inventory_bid: r.barcode,
          ...r
        })      
      }    
    })
    console.log('velocityResults', velocityResults[0]);
    const velocityCsv = jsonToCSV(velocityResults);
    // console.log('vcsv', velocityCsv)
    await putS3Object(velocityCsv, 'invBid-boxBid-VELOCITY.csv')
  }
  if (process.env.FTS) {
    const fts = await getFtsBqData();
    const ftsResults = [];
  
    fts.forEach((r)=>{
      const match = zscan.find((z)=>z.inventory_bid.toString() === r.barcode)
      if (match) {
        ftsResults.push({
          box_bid: match.box_bid,
          container_bid: match.container_bid,
          inventory_bid: r.barcode
        })
      } else {
        ftsResults.push({
          box_bid: null,
          container_bid: null,
          inventory_bid: r.barcode
        })      
      }    
    })
    console.log('ftsResults', ftsResults[0]);
    const ftsCsv = jsonToCSV(ftsResults);
    // console.log('ftsCsv', ftsCsv)
    console.log('writing to s3');
    await putS3Object(ftsCsv, 'invBid-boxBid-FTS.csv')
    console.log('done')
  }
  
}


function parseCSV(csv) {
  // Split the CSV into rows
  var rows = csv.split('\n');
  
  // Extract the header row
  var headerRow = rows[0].split(',').map(r=>r.trim());
  
  // Initialize an array to store the data
  var data = [];
  
  // Iterate over the rows starting from the second row
  for (var i = 1; i < rows.length; i++) {
    // Trim the row to remove any leading or trailing whitespace or '\r' characters
    var trimmedRow = rows[i].trim();
    
    // Split the row into values
    var values = trimmedRow.split(',');
    
    // Create an object to store the row data
    var rowData = {};
    
    // Iterate over the values and assign them to their respective headers
    for (var j = 0; j < headerRow.length; j++) {
      rowData[headerRow[j]] = values[j];
    }
    
    // Add the row data to the array
    data.push(rowData);
  }
  
  // Return the JSON object
  return JSON.parse(JSON.stringify(data));
}


function jsonToCSV(json) {
  // Ensure the JSON is parsed
  const array = typeof json !== 'object' ? JSON.parse(json) : json;

  // Extract the headers
  const headers = Object.keys(array[0]);

  // Create the CSV string
  const csvRows = [];

  // Add the headers row
  csvRows.push(headers.join(','));

  // Add each row of data
  for (const item of array) {
    const values = headers.map(header => {
      const escapedValue = ('' + item[header]).replace(/"/g, '""');
      return `"${escapedValue}"`;
    });
    csvRows.push(values.join(','));
  }

  // Join the rows with new line characters
  return csvRows.join('\n');
}


const getS3 = async () => {
  const awsConfig = { region: 'us-east-1' };
  let data;

  try {
    const client = new S3Client;
    const params = {
      Bucket: 'werd-test-bucket',
      Key: `zscan-data.csv`
    };
    const command = new GetObjectCommand(params);
    data = await client.send(command);
  } catch (error) {
    const msg = `Unable to retrieve JSON file from S3 for. Error: ${JSON.stringify(error)}`;
    console.error(msg);
    throw new Error(msg);
  }
  
  const bodyString = await data.Body.transformToString();
  
  return parseCSV(bodyString)
};


const putS3Object = async (payload, filename) => {

  try {
    const client = new S3Client;
    const params = {
      Body: payload, 
      Bucket: 'werd-test-bucket', 
      Key: filename
    };
    
    const command = new PutObjectCommand(params);
  
    return client.send(command);  
  } catch (error) {
    console.log('error putting s3')
  }
  
};