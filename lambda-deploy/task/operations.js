const { loc } = require('vsts-task-lib/task');
const awsSDK = require('aws-sdk');
awsSDK.config.setPromisesDependency(require('bluebird'));

class TaskLambdaFunctionBase {

    /* 
    // Creates a new instance of TaskLambdaFunctionBase
    // -> Provides a property called 'Client' for AWS Lmabda Tools
    // -> Provides a property called 'FunctionDefinition' for Lambda Function Configuration
    //  *  Only the functions of aws configuration region will be used
    // 
    // @awsConfiguration: Object containing the Access Key ID, Secret Access Key ID and Region
    // @functionDefinition: Object with the configuration of function 
    */
    constructor(awsConfiguration, functionDefinition) {

        this.client = new awsSDK.Lambda({
            credentials: {
                accessKeyId: awsConfiguration.acessKeyID,
                secretAccessKey: awsConfiguration.secretAccessKey
            },
            region: awsConfiguration.region,
        });

        this.functionDefinition = functionDefinition;
    }

    /* 
    // Validates whether an alias exists for a given function
    //
    // @returns Bool (True if the alias exists)
    */
    aliasExists() {

        const promiseGetAlias = this.client.getAlias({
            FunctionName: this.functionDefinition.functionName,
            Name: this.functionDefinition.name
        }).promise();

        return promiseGetAlias.then(definition => {
            return true;

        }).catch(error => {
            if (error.statusCode === 404) {
                return false;
            }

            throw new Error(error.message);
        });
    }

    /*
    // Creates and associates a new alias for a given version of a function
    //
    // @returns Object containing name, Version and alias ARN
    */
    createFunctionAlias() {

        const promiseCreateAlias = this.client.createAlias({
            FunctionName: this.functionDefinition.functionName,
            FunctionVersion: this.functionDefinition.functionVersion,
            Name: this.functionDefinition.name
        }).promise();

        return promiseCreateAlias.then(alias => {
            return {
                name: alias.Name,
                functionVersion: alias.FunctionVersion,
                aliasArn: alias.AliasArn
            };

        }).catch(error => {
            throw new Error(error.message);
        });

    }

    /* 
    // Binds an existing alias to another version of a lambda function, deleting the previous link
    //
    // @returns Object containing name, version and alias ARN
    */
    updateFunctionAlias() {

        const promiseUpdateAlias = this.client.updateAlias({
            FunctionName: this.functionDefinition.functionName,
            FunctionVersion: this.functionDefinition.functionVersion,
            Name: this.functionDefinition.name
        }).promise();

        return promiseUpdateAlias.then(alias => {

            return {
                name: alias.Name,
                functionVersion: alias.FunctionVersion,
                aliasArn: alias.AliasArn
            };

        }).catch(error => {
            throw new Error(error.message);
        });

    }

    /*
    // Validates whether a particular function exists from its latest version ($LATEST)
    //
    // @returns Bool (True if the function exists)
    */
    functionExists() {

        const promiseListFunctions = this.client.getFunctionConfiguration({
            FunctionName: this.functionDefinition.functionName
        }).promise();

        return promiseListFunctions.then(definition => {
            return true;

        }).catch(error => {
            if (error.statusCode === 404) {
                return false;
            }

            throw new Error(error.message);
        });

    }

    /*
    // Gets the name of the most current version of Lambda Function
    //
    // @returns String containing the Version Name or 0 case the current version is $LATEST
    */
    getLatestFunctionVersion() {

        const promiseListVersionsByFunction = this.client.listVersionsByFunction({
            FunctionName: this.functionDefinition.functionName
        }).promise();

        return promiseListVersionsByFunction.then(listVersions => {

            if (listVersions.Versions.length === 1) {
                return "0";
            }

            return listVersions.Versions.pop().Version;

        }).catch(error => {
            throw new Error(error.message);
        });
    }
}

class TaskLambdaFunctionDeploy extends TaskLambdaFunctionBase {

    /*
    // Creates a new Lambda Function based on the set configuration
    // * Every function was created in $LATEST version
    //
    // @returns String containing the function name
    */
    createFunction() {
        const promiseCreateFunction = this.client.createFunction({
            FunctionName: this.functionDefinition.functionName,
            Handler: this.functionDefinition.handler,
            Role: this.functionDefinition.role,
            Runtime: this.functionDefinition.runtime,
            Description: this.functionDefinition.description,
            MemorySize: this.functionDefinition.memorySize,
            Timeout: this.functionDefinition.timeout,
            Code: {
                ZipFile: this.functionDefinition.code.zipFile
            },
            VpcConfig: {
                SecurityGroupIds: this.functionDefinition.vpcConfig.securityGroupIds,
                SubnetIds: this.functionDefinition.vpcConfig.subnetIds
            },
            Environment: {
                Variables: this.functionDefinition.environmentVariables
            }
        }).promise();

        return promiseCreateFunction.then(definition => {
            return definition.FunctionName;

        }).catch(error => {
            throw new Error(error.message);
        });

    }

    /*
    // Updates the latest version of a Lambda Function based on the set configuration
    // * Updates the code and the configuration
    //
    // @returns String containing the function name
    */
    updateFunction() {

        const promiseUpdateFunctionCode = this.client.updateFunctionCode({
            FunctionName: this.functionDefinition.functionName,
            ZipFile: this.functionDefinition.code.zipFile
        }).promise();

        return promiseUpdateFunctionCode.then(definition => {
            return definition;

        }).then(definition => {

            const promiseUpdateFunction = this.client.updateFunctionConfiguration({
                FunctionName: this.functionDefinition.functionName,
                Handler: this.functionDefinition.handler,
                Role: this.functionDefinition.role,
                Runtime: this.functionDefinition.runtime,
                Description: this.functionDefinition.description,
                MemorySize: this.functionDefinition.memorySize,
                Timeout: this.functionDefinition.timeout,
                VpcConfig: {
                    SecurityGroupIds: this.functionDefinition.vpcConfig.securityGroupIds,
                    SubnetIds: this.functionDefinition.vpcConfig.subnetIds
                },
                Environment: {
                    Variables: this.functionDefinition.environmentVariables
                }
            }).promise();

            return promiseUpdateFunction.then(definition => {
                return definition.FunctionName;

            });

        }).catch(error => {
            throw new Error(error.message);
        });
    }
}

class TaskLambdaFunctionPublish extends TaskLambdaFunctionBase {

    /*
    // Publish a new version of a lambda function, based on the latest version ($LATEST) settings
    //
    // @returns Object containing the version and the function name
    */
    publishVersion() {
        const promisePublishVersion = this.client.publishVersion({
            FunctionName: this.functionDefinition.functionName,
            Description: this.functionDefinition.description
        }).promise();

        return promisePublishVersion.then(definition => {

            return {
                functionName: definition.FunctionName,
                functionVersion: definition.Version
            }

        }).catch(error => {
            throw new Error(error.message);

        });
    }
}

/*
// Create or update a lambda function based on the settings
//
// @awsConfiguration: Object containing the Access Key ID, Secret Access Key ID and Region
// @functionDefinition: Object with the configuration of function
*/
function deploy(awsConfiguration, functionDefinition) {

    //Deploy is always performed in the latest ($LATEST) version of the Lambda Function
    functionDefinition.functionVersion = '$LATEST';

    this.taskDeploy = new TaskLambdaFunctionDeploy(awsConfiguration, functionDefinition);

    console.log(loc('functionDeployInit',
        this.taskDeploy.functionDefinition.functionName,
        this.taskDeploy.functionDefinition.name));

    return this.taskDeploy.functionExists().then(functionExists => {

        if (functionExists) {
            console.log(loc('functionOperationUpdate'));
            console.log(loc('functionUpdating',
                this.taskDeploy.functionDefinition.functionName));

            return this.taskDeploy.updateFunction().then(functionName => {
                console.log(loc('functionUpdatingSuccess', functionName));

            }).catch(error => {
                throw new Error(loc('functionUpdatingError',
                    this.taskDeploy.functionDefinition.functionName));
            });
        }

        console.log(loc('functionOperationCreate'));
        console.log(loc('functionCreating',
            this.taskDeploy.functionDefinition.functionName));
        return this.taskDeploy.createFunction().then(functionName => {
            console.log(loc('functionCreated', functionName));

        }).catch(error => {
            throw new Error(loc('functionCreatingError',
                this.taskDeploy.functionDefinition.functionName));

        });

    }).then(() => {

        console.log(loc('functionAliasAssociateInit',
            this.taskDeploy.functionDefinition.name,
            this.taskDeploy.functionDefinition.functionName));

        return this.taskDeploy.aliasExists();

    }).then(aliasExists => {
        //TODO: Validate the possibility of deleting the alias, if it is linked to this version
        if (aliasExists) {
            return new Promise((resolve, reject) => {
                console.log(loc('functionAliasAlreadyAssociated',
                    this.taskDeploy.functionDefinition.name,
                    this.taskDeploy.functionDefinition.functionVersion));
                resolve();
            });
        }

        return this.taskDeploy.createFunctionAlias().then(alias => {
            console.log(loc('funcitonAliasCreatedAssociatedSuccess',
                alias.name,
                alias.functionVersion,
                alias.aliasArn));
        });

    }).then(() => {
        console.log(loc('functionDeploySuccess'))

    }).catch(error => {
        throw error;

    });
}

/*
// Publish a new version of Lambda Function based on the latest ($LATEST) version
//
// @awsConfiguration: Object containing the Access Key ID, Secret Access Key ID and Region
// @functionDefinition: Object with the configuration of function
*/
function publish(awsConfiguration, functionDefinition) {
    this.taskPublish = new TaskLambdaFunctionPublish(awsConfiguration, functionDefinition);

    console.log(loc('functionPublishInit',
        this.taskPublish.functionDefinition.functionName,
        this.taskPublish.functionDefinition.name));

    return this.taskPublish.functionExists().then(functionExists => {
        if (!functionExists) {
            throw new Error(loc('functionDoesntExistsPublishError',
                this.taskPublish.functionDefinition.functionName));
        }

        return this.taskPublish.getLatestFunctionVersion();

    }).then(functionVersion => {
        //Sets the function version for future use
        this.taskPublish.functionDefinition.functionVersion = functionVersion;

        return this.taskPublish.publishVersion();

    }).then(definition => {
        //If the versions are different, a new version was created, 
        //therefore, the version was updated in object 'functionDefinition', 
        //otherwise the versions are the same, there were no modifications in the last version, 
        //therefore, there was no publication

        if (definition.functionVersion != this.taskPublish.functionDefinition.functionVersion) {
            this.taskPublish.functionDefinition.functionVersion = definition.functionVersion;
            console.log(loc('functionPublishVersionCreatedSuccess',
                definition.functionVersion,
                definition.functionName));

            return this.taskPublish.aliasExists().then(aliasExists => {
                if (aliasExists) {
                    return this.taskPublish.updateFunctionAlias().then(alias => {
                        console.log(loc('funcitonAliasUpdatedAssociatedSuccess',
                            alias.name,
                            alias.functionVersion,
                            alias.aliasArn));
                    });
                }

                return this.taskDeploy.createFunctionAlias().then(alias => {
                    console.log(loc('funcitonAliasCreatedAssociatedSuccess',
                        alias.name,
                        alias.functionVersion,
                        alias.aliasArn));
                });
            });
        }
        else {
            console.log(loc('functionPublishVersionSuccess',
                definition.functionVersion,
                definition.functionName));

            return new Promise((resolve, reject) => {
                resolve(this.taskPublish.functionDefinition.functionName);
            });
        }

    }).then(functionName => {
        console.log(loc('functionPublishSuccess'));

    }).catch(error => {
        //TODO: Rollback on error
        throw error;

    });
}

module.exports = { deploy, publish };