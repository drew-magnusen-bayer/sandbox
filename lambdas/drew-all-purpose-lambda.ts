import { invokeLambda } from "./clients/aws-client";
import { getQueryOffset, updateQueryOffset } from "./clients/dynamodb-client";
// import superagent from "superagent";
// import { getConfigValue, pullConfig } from "./clients/paramstore";

// const AZURE_AUTH_URL = 'https://login.microsoftonline.com/fcb2b37b-5da0-466b-9b83-0014b67a7c78/oauth2/v2.0/token';
// const PULL_NURSERY_SET_DATA_URL = 'https://breeding.ag/seed-operations-ingest-velocity-sets/v1/pull-nursery-set-data';
// const DYNAMO_KEY = 'reprocessMexSetsOffset';
const QUERY_LIMIT = process.env.QUERY_LIMIT ? parseInt(process.env.QUERY_LIMIT): 10;
const targetFunction = 'pull-velocity-nursery-events-prd';

// const getAzureToken = async () => {
//   await pullConfig('/set-ingestion');
//   const azureClientId = getConfigValue('/set-ingestion', 'azureClientId');
//   const azureClientSecret = getConfigValue('/set-ingestion', 'azureClientSecret');
//   try {
//     const azureResponse = await superagent.post(AZURE_AUTH_URL)
//       .type('form')
//       .send(
//         {
//           client_id: azureClientId,
//           client_secret: azureClientSecret,
//           grant_type: 'client_credentials',
//           scope: `${azureClientId}/.default`
//         }
//       );

//     if (azureResponse.status === 200) {
//       return { error: false, data: azureResponse.body.access_token };
//     }

//     return { error: true, msg: 'Unable to retrieve access token from Azure.' };
    
//   } catch (error) {
//     return { error: true, msg: `Error while retrieving access token from Azure. Error: ${JSON.stringify(error)}` };
//   }
// };

exports.handler = async (event, context, callback) => {

  // let azureToken;
  // try {
  //   const tokenResponse = await getAzureToken();
  //   if (tokenResponse.error) {
  //     throw new Error(tokenResponse.msg)
  //   }
  //   azureToken = tokenResponse.data;
  // } catch (error) {
  //   const msg = 'There was an error while requesting azure auth token. View logs for more details.';
  //   console.error(msg, JSON.stringify(error));
  //   return;
  // }


  const { data: offset } = await getQueryOffset('drewMexicoReingest');
  const { data: setIds } = await getQueryOffset('drewMexicoReingestIds')
  // const velocitySets = await getNewVelocitySets(QUERY_LIMIT, offset);
  // let sets = await DataBaseAccess.get2024Sets(offset, QUERY_LIMIT);
  // sets = sets.map(s=>Number(s.set_id))
  // console.log('sets', sets)



  const setsSlice = setIds.slice(offset, offset+QUERY_LIMIT);
  console.log('sets', setsSlice);
  if (!!setsSlice && !!setsSlice.length) {
    console.log('sendind sets to pull-velocity-nursery-events-prd:', setsSlice)
    await invokeLambda({ setIds: setsSlice }, targetFunction);

  //   const response = await superagent.post(PULL_NURSERY_SET_DATA_URL)
  //   .set('Authorization', `Bearer ${azureToken}`)
  //   .send({ sets: setsSlice })
  //   .then(r => { const { error, msg } = r.body; return { status: r.status, error: error, msg: msg };})
  //   .catch(e => { const { error, msg } = e.response.body; return { status: e.status, error: error, msg: msg };});
  
  // if (response.error) {
  //   console.error('ingest-velocity-sets/pull-set-data returned the following error: ', JSON.stringify(response.msg));
  //   return;
  // }
  const newOffset = offset+setsSlice.length;
  console.log(`Updating drewMexicoReingest to ${newOffset}`)
  await updateQueryOffset('drewMexicoReingest', newOffset);
    
  }

  return `processed ${setsSlice}`
}
