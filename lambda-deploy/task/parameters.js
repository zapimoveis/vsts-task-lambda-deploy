const { getInput, getEndpointAuthorization, getPathInput } = require('vsts-task-lib/task');
const { readFileSync } = require('fs');

/*
// Gets the function configuration inputs fields
//
// @returns: Object containing the Function Configuration
*/
function getParametersFunctionConfiguration() {

    try {

        params = {
            functionName: getInput('functionName', true),
            name: getInput('functionAlias', true),
            handler: getInput('functionHandler', false),
            role: getInput('functionRole', false),
            runtime: getInput('functionRuntime', false),
            description: getInput('functionDescription', true),
            memorySize: getInput('functionMemory', false),
            timeout: getInput('functionTimeout', false),
            isDeploy: getInput('taskOperation', true) == 'deployFunction'
        }

        const projectPath = getPathInput('projectPath', false, false);
        params.code = {
            get zipFile(){
                //Just reads the file on demand
                return readFileSync(projectPath);
            }
        }

        const listSecurityGroupIds = getInput('functionSecurityGroups', false);
        const listSubnetIds = getInput('functionSubnets', false);      
        params.vpcConfig = {
            securityGroupIds: listSecurityGroupIds ? listSecurityGroupIds.replace(/\s/g, '').split(',') : [],
            subnetIds:  listSubnetIds ? listSubnetIds.replace(/\s/g, '').split(',') : []
        }

        const jsonEnvironmentVariables = getInput('functionEnvironmentVariables', false);
        params.environmentVariables = jsonEnvironmentVariables ? JSON.parse(jsonEnvironmentVariables) : {};

        return params;
    }
    catch (error) {
        throw new Error(error.message);
    }
}

/*
// Gets the aws configuration endpoint and the region defined in task input field
//
// @returns: Object containing the AWS Configuration
*/
function getParametersAWSConfiguration() {

    try {

        const awsEndpoint = getInput('awsCredentials', true);
        const awsEndpointAuth = getEndpointAuthorization(awsEndpoint, false);

        this.credentials = {
            acessKeyID: awsEndpointAuth.parameters.username,
            secretAccessKey: awsEndpointAuth.parameters.password,
            region: getInput('regionName', true)
        }

        return this.credentials;

    }
    catch (error) {
        throw new Error(error.message);
    }
}

module.exports = { getParametersFunctionConfiguration, getParametersAWSConfiguration }