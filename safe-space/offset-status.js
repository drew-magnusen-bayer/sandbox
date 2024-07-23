import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchGetCommand } from "@aws-sdk/lib-dynamodb";
import fs from 'fs';

const pastOffsets = JSON.parse(fs.readFileSync('./files/pastOffsets.json', 'utf-8'))
const tableName = 'CSWCache'
const dynamoDBClient =  new DynamoDBClient({ apiVersion: "2012-08-10" })
const docsClient = DynamoDBDocumentClient.from(dynamoDBClient);

const offsetKeys = [
    { lambda: 'ingest-fts-events', key: 'repEventsOffset'}, 
    { lambda: 'ingest-velocity-events', key: 'ftsReceivedSeedEventsOffset'},
    { lambda: 'ingest-velocity-events', key: 'ftsProcessedSeedEventsOffset'},
    { lambda: 'ingest-velocity-events', key: 'velocityFillEventsOffset'},
    { lambda: 'ingest-velocity-events', key: 'velocitySetAnswersOffset'},
    { lambda: 'pull-fts-mactracker-events', key: 'pullFTSMactrackerNSPEventsOffset'}, 
    { lambda: 'pull-fts-mactracker-events', key: 'pullFTSMactrackerYTPEventsOffset'}, 
    { lambda: 'pull-fts-shipping-events', key: 'pullFtsShippingEventsOffset'}, 
    { lambda: 'pull-velocity-shipping-events', key: 'pullVelocityShippingEventsOffset'}, 
]
const getRecordsFromDynamoDb = async (keys) => {
  const command = new BatchGetCommand({
    RequestItems: {
      [tableName]: {
          Keys: keys.map((key) => {
          return {
            key: key
          };
        })
      }
    }
  });

  const result = await docsClient.send(command);

//   console.log(`BatchGetCommand result: ${JSON.stringify(result)}`);

  if (result) {
    return result.Responses[tableName];
  }
  return undefined;
};

const parseOffsets = (rawOffsets) => {
    return rawOffsets.map((offset)=>(
        {
            key: offset.key,
            offset: parseInt(JSON.parse(offset.cacheData).offset)
        }
    ))
}


const newOffsets = parseOffsets(await getRecordsFromDynamoDb(offsetKeys.map(key=>(key.key))))

const offsetsWithStatus = newOffsets.map(o=>(
    {
        ...o,
        lambda: offsetKeys.find(ok=> ok.key === o.key).lambda,
        complete: pastOffsets.find(po=> po.key === o.key).offset === o.offset
    }
))
const sortedOffsets = offsetsWithStatus.sort((a, b)=> (a.complete > b.complete) ? 1 : ((b.complete > a.complete) ? -1 : 0))
fs.writeFile('pastOffsets.json', JSON.stringify(sortedOffsets), 'utf8', (err,data)=>{if(err) console.log(err)})
console.log(sortedOffsets)

