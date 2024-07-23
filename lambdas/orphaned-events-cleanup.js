import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import superagent from "superagent";

const awsConfig = {
    region: 'us-east-1'
  }
const QUERY_LIMIT = process.env.QUERY_LIMIT ? parseInt(process.env.QUERY_LIMIT) : 1000
const ORPHANED_EVENTS_URL = `${process.env.ORPHANED_EVENTS_URL}/v1/cleanup`

exports.handler = async () => {
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
        const response = await superagent.post(ORPHANED_EVENTS_URL)
            .set('Authorization', `Bearer ${azureToken}`)
            .send({ queryLimit: QUERY_LIMIT })
            .then(r => { const { error, msg } = r.body; return { status: r.status, error: error, msg: msg };})
            .catch(e => { const { error, msg } = e.response.body; return { status: e.status, error: error, msg: msg };});
    
        console.log('response', JSON.stringify(response))
    
       return 'all done'
}



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

