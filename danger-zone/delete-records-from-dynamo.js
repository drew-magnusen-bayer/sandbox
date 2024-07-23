import AWS from 'aws-sdk';
import fs from 'fs';

const TABLE = 'event-ingestion-np';
//const setids = JSON.parse(fs.readFileSync('./files/set-cleanup-setids-to-delete.json', 'utf-8'))
let uuids = JSON.parse(fs.readFileSync('./files/event-cleanup-null-uuids.json', 'utf-8'))

uuids = [...new Set(uuids)]
console.log('uuids', uuids)
console.log(`Deleting ${uuids.length} from ${TABLE}`)
const paramChunks = [];
for (let i=0; i< uuids.length; i+=25){
   console.log(`i = ${i}`);
   const slice = uuids.slice(i, i+25)
   paramChunks.push(
    {
        RequestItems: {
            [`${TABLE}`]: slice.map((id)=>(
                {
                    DeleteRequest: {
                        Key: {
                            id: String(id)
                        }
                    }
                }
            ))
        }
    });
}

console.log(`got ${paramChunks.length} param chunks`)

const dynamoDb = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' });
let chunkCount = 0;
for (const chunk of paramChunks) {
    console.log(`sending chunk ${chunkCount++}`)
    dynamoDb.batchWrite(chunk, (err, data) => {
        if (err) {
            console.error(err);
        } else {
            console.log(data);
        }
    });
    await new Promise(r => setTimeout(r, 500));
}
