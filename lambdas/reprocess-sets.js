import { DynamoDBClient, ScanCommand, BatchWriteItemCommand } from "@aws-sdk/client-dynamodb";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import superagent from "superagent";

const {  unmarshall } = require("@aws-sdk/util-dynamodb");
const awsConfig = {
    region: 'us-east-1'
  }
const dynamoClient = new DynamoDBClient(awsConfig);
const MAX_SETS_TO_PROCESS = process.env.MAX_SETS_TO_PROCESS ? parseInt(process.env.MAX_SETS_TO_PROCESS) : 10
const PULL_SET_DATA_ENDPOINT = 'https://breeding-np.ag/seed-operations-ingest-velocity-sets/v1/pull-set-data'
const SOURCE = process.env.SOURCE

exports.handler = async () => {
    if (!SOURCE || !['fts','velocity'].includes(SOURCE)) {
        console.log('SOURCE must be either fts or velocity')
        return
    }


    if (SOURCE === 'velocity') {
        const dynamoTable = 'velocity-set-cleanup'

        let azureToken;
        try {
            const tokenResponse = await getAzureToken()
            if (tokenResponse) {
                azureToken = tokenResponse
            }
        } catch (error) {
            const msg = 'There was an error while requesting azure auth token. View logs for more details.';
            console.error(msg, JSON.stringify(error));
            return;
        }
        const params = {
            TableName: dynamoTable
        };
    
        console.log(`getting ${MAX_SETS_TO_PROCESS} sets from ${dynamoTable}}`);
        const records = await getDbItems(params, [], MAX_SETS_TO_PROCESS);
        console.log(`received ${records.length} from dyanmo`)
        
        if (records.length === 0) {
            console.log('No setIds returned from dynamo. Exiting')
            return
        }
        const setIds = records.map((r)=> +r.setId)
        const response = await superagent.post(PULL_SET_DATA_ENDPOINT)
            .set('Authorization', `Bearer ${azureToken}`)
            .send({ sets: setIds })
            .then(r => { const { error, msg } = r.body; return { status: r.status, error: error, msg: msg };})
            .catch(e => { const { error, msg } = e.response.body; return { status: e.status, error: error, msg: msg };});
    
        console.log('response', JSON.stringify(response))
        if (response.error) {
            console.error('ingest-velocity-sets/pull-set-data returned the following error: ', JSON.stringify(response.msg));
            return
        } 

        await deleteSetsFromDyanmo(dynamoTable, setIds)
    } else if (SOURCE === 'fts') {
        const dynamoTable = 'fts-set-cleanup'
        const params = {
            TableName: dynamoTable
        };
    
        console.log(`getting ${MAX_SETS_TO_PROCESS} sets from ${dynamoTable}}`);
        const records = await getDbItems(params, [], MAX_SETS_TO_PROCESS);
        console.log(`received ${records.length} from dyanmo`)
        
        if (records.length === 0) {
            console.log('No setIds returned from dynamo. Exiting')
            return
        }
        const setIds = records.map((r)=> +r.setId)
        invokeLambda({setIds}, 'build-fts-sets');

        await deleteSetsFromDyanmo(dynamoTable, setIds)
    } else {
        console.log('bad source')
    }
    
       return 'all done'
}

const invokeLambda = async (payload, functionName) => {
  console.info(`Invoking ${functionName} lambda with ${JSON.stringify(payload)}`);

  const client = new LambdaClient(awsConfig);

  const command = new InvokeCommand({
    FunctionName: functionName,
    InvocationType: 'RequestResponse',
    Payload: JSON.stringify(payload)
  });

  const { Payload } = await client.send(command);

  const result = Buffer.from(Payload).toString();

  console.info('Invocation result:', result);

  return;
};

const getDbItems = async (params, data, queryLimit) => {
    let combinedData = [...data];
    
    if (queryLimit && combinedData.length >= queryLimit) {
      return combinedData.slice(0, queryLimit).map((item)=> unmarshall(item));
    }
  
    const command = new ScanCommand(params);
    const result = await dynamoClient.send(command);
    
    if (result.Items.length > 0) {
      combinedData = [...combinedData, ...result.Items];
    }
    
    if (result.LastEvaluatedKey) {
      console.log('Recursively getting paginated data.');
      const newParams = { ...params, ExclusiveStartKey: result.LastEvaluatedKey };
      return getDbItems(newParams, combinedData, queryLimit);
    }
    
    if (queryLimit && combinedData.length >= queryLimit) {
      return combinedData.slice(0, queryLimit).map((item)=> unmarshall(item));
    }
  
    return combinedData.map((item)=> unmarshall(item));
};

const getAzureToken = async () => {
    const input = {
      Name: '/np/bearer',
      WithDecryption: true
    };
    const ssmClient = new SSMClient(awsConfig);

    const command = new GetParameterCommand(input);
    const token = await ssmClient.send(command);
    return token.Parameter.Value
}

const deleteSetsFromDyanmo = async (table, setIds) => {
    console.log(`Deleting ${setIds} from ${table}`)

    const paramChunks = [];
    for (let i=0; i< setIds.length; i+=25){
       const slice = setIds.slice(i, i+25)
       paramChunks.push(
        {
            RequestItems: {
                [`${table}`]: slice.map((sid)=>(
                    {
                        DeleteRequest: {
                            Key: {
                                setId: {"S": String(sid)}
                            }
                        }
                    }
                ))
            }
        });
    }

    console.log(`got ${paramChunks.length} param chunks`)

    let chunkCount = 0;
    for (const chunk of paramChunks) {
        console.log(`sending chunk ${chunkCount++}`)
        const command = new BatchWriteItemCommand(chunk)
        const response = await dynamoClient.send(command)
        if (response.$metadata.httpStatusCode !== 200) {
            console.log('error deleting setId from dynamo')
        }
        await new Promise(r => setTimeout(r, 500));
    }

}