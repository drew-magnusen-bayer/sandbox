import { SSMClient, GetParametersByPathCommand, PutParameterCommand, PutParameterCommandInput,  } from "@aws-sdk/client-ssm";
const awsConfig = { region: 'us-east-1' };

export const getParamStoreConfig = async (path: string) => {
    try {
      const prefix = '';
  
      const client = new SSMClient(awsConfig);
  
      const input = {
        Path: `${prefix}${path}`,
        Recursive: true,
        WithDecryption: true
      };
  
      const command = new GetParametersByPathCommand(input);
      const config = await client.send(command);
  
      return config.Parameters;
    } catch (error) {
      console.error("error on getParamStoreConfig: ", error);
      throw new Error(`Failed to get config: ${error}`);
    }
  };
export const getConfigValue = (path: string, name: string) => {
    const prefix = '';
    
    const config = JSON.parse(process.env.CONFIG);
  
    const foundItem = config.find((item) => item.Name === `${prefix}${path}/${name}`);
  
    if (!foundItem || !foundItem.Value) {
      throw new Error(`No config value at path: ${prefix}${path}/${name}`);
    }
  
    return foundItem.Value;
  };
  
  export const pullConfig = async (path: string) => {
    const config = await getParamStoreConfig(path);
    setConfig(config);
  };
  const setConfig = (config) => {
    process.env.CONFIG = JSON.stringify(config);
  };
  