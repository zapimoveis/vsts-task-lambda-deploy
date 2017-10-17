const { setResourcePath, setResult, TaskResult } = require('vsts-task-lib/task');
const { join } = require('path');
const { deploy, publish } = require('./task/operations');
const { getParametersFunctionConfiguration, getParametersAWSConfiguration } = require('./task/parameters');

/*
//  The EntryPoint of Task
//  -> Set the task.json to local path
//  -> Get the input parameters of task  
//  -> Run the Deploy or Publish operation
//
//  @returns Promise Success or Error
*/
function run(){

    setResourcePath(join(__dirname, 'task.json'));

    const paramsFunctionDefinition = getParametersFunctionConfiguration();
    const paramsAWSConfiguration = getParametersAWSConfiguration();

    if (paramsFunctionDefinition.isDeploy){
        return deploy(paramsAWSConfiguration, paramsFunctionDefinition);
    }
    else{
        return publish(paramsAWSConfiguration, paramsFunctionDefinition);
    }
}

run()
.then((result) => setResult(TaskResult.Succeeded, ''))
.catch((error) => setResult(TaskResult.Failed, error));