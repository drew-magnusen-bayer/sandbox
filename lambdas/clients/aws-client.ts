import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const awsConfig = { region: 'us-east-1' };

export const invokeLambda = async (payload: any, functionName: string) => {
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

  return result;
};