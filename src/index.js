// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

'use strict';

import { ECSClient, StopTaskCommand, RunTaskCommand } from '@aws-sdk/client-ecs';
const client = new ECSClient({});
// Reading environment variables
const ecsClusterArn = process.env.ecsClusterArn;
const ecsTaskDefinationArn = process.env.ecsTaskDefinationArn;
const ecsContainerName = process.env.ecsContainerName;
const recordingArtifactsBucket = process.env.recordingArtifactsBucket;

let responseBody = {
    message: '',
    input: ''
};

let response = {
    statusCode: 200,
    headers: {},
    body: ''
};
 
exports.handler = async function(event, context, callback) {
    let meetingURL = "";
    let taskId = "";
    let recordingAction = "";
    
    console.log(event);
    responseBody.input = event;
    
    if(event.queryStringParameters && event.queryStringParameters.recordingAction) {
        console.log("Recording action: " + event.queryStringParameters.recordingAction);
        recordingAction = event.queryStringParameters.recordingAction;
    }
    
    switch(recordingAction.toLowerCase()) {
        case 'start':
            if(event.queryStringParameters && event.queryStringParameters.meetingURL) {
                console.log("Meeting URL: " + event.queryStringParameters.meetingURL);
                meetingURL = decodeURIComponent(event.queryStringParameters.meetingURL);
                return await startRecording(event, context, callback, meetingURL);
            } else {
                responseBody = {
                    message: "Missing parameter: meetingURL",
                    input: event
                };
                response = {
                    statusCode: 400,
                    headers: {},
                    body: JSON.stringify(responseBody, null, ' ')
                };
                context.succeed(response);
            }
        case 'stop':
            if(event.queryStringParameters && event.queryStringParameters.taskId) {
                console.log("ECS task ID: " + event.queryStringParameters.taskId);
                taskId = event.queryStringParameters.taskId;
                return await stopRecording(event, context, taskId);
            } else {
                responseBody = {
                    message: "Missing parameter: taskId",
                    input: event
                };
                response = {
                    statusCode: 400,
                    headers: {},
                    body: JSON.stringify(responseBody, null, ' ')
                };
                context.succeed(response);
            }
        default:
            responseBody = {
                message: "Invalid parameter: recordingAction. Valid values 'start' & 'stop'",
                input: event
            };
            response = {
                statusCode: 400,
                headers: {},
                body: JSON.stringify(responseBody)
            };
    }
    
    console.log("response: " + JSON.stringify(response));
    callback(null, response);
};

startRecording = async (event, context, callback, meetingUrl) => {
    let ecsRunTaskParams = {
        cluster: ecsClusterArn,
        launchType: "EC2",
        count: 1,
        overrides: {
            containerOverrides: [ 
                 { 
                    environment: [ 
                        { 
                            name: "MEETING_URL",
                            value: meetingUrl
                        },
                        {
                            name: "RECORDING_ARTIFACTS_BUCKET",
                            value: recordingArtifactsBucket
                        }
                    ],
                    name: ecsContainerName
                }
            ],
        },
        placementConstraints: [{
            type: "distinctInstance"
        }],
        taskDefinition: ecsTaskDefinationArn
    };

    try {
        const response = await client.send(new RunTaskCommand(ecsRunTaskParams));
        console.log(response.data); // successful response
        response.statusCode = 200;
        response.body = JSON.stringify(
          response.data.tasks.length && response.data.tasks[0].taskArn ? response.data.tasks[0].taskArn : response.data,
          null,
          ' '
        );
        context.succeed(response);      
    } catch (err) {
        console.log(err); // an error occurred
        response.statusCode = err.statusCode;
        response.body = JSON.stringify(err, null, ' ');
        context.succeed(response);
    }
}

stopRecording = async (event, context, taskId) => {
    let ecsStopTaskParam = {
        cluster: ecsClusterArn,
        task: taskId
    };

    try {
        const response = await client.send(new StopTaskCommand(ecsStopTaskParam));
        console.log(response.data); // successful response
        response.statusCode = 200;
        responseBody = response.data;
        response.body = JSON.stringify(response.data, null, ' ');
        console.log('Stop task succeeded.', response);
        context.succeed(response);
    } catch (err) {
        console.log(err); // an error occurred
        response.statusCode = err.statusCode;
        response.body = JSON.stringify(err, null, ' ');
        context.succeed(response);
    }
}