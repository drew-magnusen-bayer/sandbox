import { BatchWriteItemCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import fs from 'fs';
import _ from 'lodash';

let setIds = JSON.parse(fs.readFileSync('./files/fts-set-cleanup.json', 'utf-8'))
setIds = Array.from(new Set(setIds));
const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamoTable = 'fts-set-cleanup'
export const batchPutDbItem = async (params) => {
    try {
      const command = new BatchWriteItemCommand(params);
      const result = await client.send(command);
      return result;  
    } catch (error) {
      console.error('Error at batchPutDbItem: ', error);
      throw new Error('Unable to batchPutDbItem');
    }
  };


  const batchItems = setIds.map((setId)=> (
    {
        'PutRequest': {
          'Item':  { 'setId': { 'S': String(setId) }
        }
      }
    }
  ))

const batchItemsChunks = _.chunk(batchItems, 25);
const dynamoResponses = [];
let chunkCount = 1;
for (const chunk of batchItemsChunks) {
  console.log(`Attempting to writing chunk ${chunkCount++} of ${batchItemsChunks.length} to dynamo.`);
  if (chunk) {
    console.log(`Chunk not null. Sending`);
    const putResult = await batchPutDbItem(
      {
        RequestItems: {
          [`${dynamoTable}`]: chunk
        }
      }
    )
    await new Promise(r => setTimeout(r, 500));
  }
}
