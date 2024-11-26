import { invokeLambda } from "./clients/aws-client";
import { getQueryOffset, updateQueryOffset } from "./clients/dynamodb-client";
import { DataBaseAccess } from "./clients/pg-client";

const DYNAMO_KEY = 'reprocess2024DurationsOffset';
const QUERY_LIMIT = process.env.QUERY_LIMIT ? parseInt(process.env.QUERY_LIMIT): 25;
const targetFunction = 'seed-operations-build-fts-sets';

exports.handler = async (event, context, callback) => {
  const { data: offset } = await getQueryOffset('drewFtsPull');
  const { data: setIds } = await getQueryOffset('drewFtsPullIds')
  // const velocitySets = await getNewVelocitySets(QUERY_LIMIT, offset);
  // let sets = await DataBaseAccess.get2024Sets(offset, QUERY_LIMIT);
  // sets = sets.map(s=>Number(s.set_id))
  // console.log('sets', sets)

  const sets = setIds.slice(offset, offset+QUERY_LIMIT);
  console.log('sets', sets);
  if (!!sets && !!sets.length) {
    console.log('sendind sets to build-fts-sets:', sets)
    await invokeLambda({ setIds: sets }, targetFunction);
    await updateQueryOffset('drewFtsPull', offset+QUERY_LIMIT);
  }

  return `processed ${sets}`
}
