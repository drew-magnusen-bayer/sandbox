import { LambdaClient, GetFunctionCommand, ListFunctionEventInvokeConfigsCommand, GetEventSourceMappingCommand, GetPolicyCommand } from "@aws-sdk/client-lambda";
import { DescribeRuleCommand, EventBridgeClient, ListEventSourcesCommand, ListRulesCommand } from "@aws-sdk/client-eventbridge"; // ES Modules import
import { CloudWatchClient, GetMetricStatisticsCommand } from "@aws-sdk/client-cloudwatch"; // ES Modules import

const config = { region: 'us-east-1' }
const lambdaName = 'start-event-ingestion-step-function-np';
const eventBridgeClient = new EventBridgeClient(config);
const lambdaClient = new LambdaClient(config);
const cloudwatchClient = new CloudWatchClient(config);

const input = { FunctionName: lambdaName };
const cloudWatchInput = { // GetMetricStatisticsInput
    Namespace: 'AWS/Lambda',
    MetricName: 'Invocations',//Errors/Invocations // required
    Dimensions: [ // Dimensions
      { // Dimension
        Name: "FunctionName", // required
        Value: lambdaName, // required
      },
    ],
    StartTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
    EndTime: new Date(),
    Period: 86400, // required
    Statistics: [ // Statistics
      "Sum"
    ]
  };
const getFunctionCommand = new GetFunctionCommand(input);
const listFunctionEventsCommand = new GetPolicyCommand(input);
const getMetricStatisticsCommand = new GetMetricStatisticsCommand(cloudWatchInput)
const describeRuleCommand = new DescribeRuleCommand({Name: 'pull-velocity-sets-5-minutes'});//'arn:aws:events:us-east-1:746960350935:rule/sam-pcc-lambdas-np-PullVelocitySetsScheduledEvent-ADVUIYM1KWL3'})
const listRulesCommand = new ListRulesCommand();

const getFunctionReponse = await lambdaClient.send(getFunctionCommand);
// const listEventsResponse = await lambdaClient.send(listFunctionEventsCommand);
// const describeRulesResponse = await eventBridgeClient.send(describeRuleCommand)
// const listRulesResponse = await eventBridgeClient.send(listRulesCommand);
const metricsResponse = await cloudwatchClient.send(getMetricStatisticsCommand);
// const ruleNames = listRulesResponse.Rules.map((r)=>r.Name)
// console.log('r', JSON.parse(listEventsResponse.Policy).Statement)
// console.log('rules', describeRulesResponse)
// console.log(ruleNames)
console.log('lambda', getFunctionReponse)
console.log('mr', metricsResponse);