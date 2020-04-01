## Amazon Chime SDK recording demo

This repository contains resources to build a docker image and serverless CloudFormation templates. A container will be craeted using image and uploaded to ECR, which is referenced by ECS task. CloudFormation template orchestrates resources(APIGateway, Lambda, ECS, etc) to run the recording application. When deployed, startRecording API will enable a bot to join a Chime meeting via an URL and record the meeting's audio, video and screenshare in high definition (1080p at 30fps by default, but configurable) and stream to the S3 bucket you specify. stopRecording API will stop the ECS task and complete the upload.

Be sure to:

* Change the title in this README
* Edit your repository description on GitHub

## Prerequisites

For this walkthrough, you should have the following prerequisites: 

* [An AWS account](https://signin.aws.amazon.com/signin?redirect_uri=https%3A%2F%2Fportal.aws.amazon.com%2Fbilling%2Fsignup%2Fresume&client_id=signup)
* [Postman app](https://www.postman.com/)

## Walkthrough

The sections as enumerated below will walk you through the process of creating and recording a Chime SDK meeting:

* Setup Cloud9 environment and clone the demo application
* Create an Elastic Container Repository(ECR) and register a Docker container image
* Deploy the Chime SDK Recording template
* Start a Chime SDK meeting with our serverless demo and join with multiple participants
* Start the meeting recording 
* Stop the recording and view the recording artifact

### Create an AWS Cloud9 environment
1. Log in with your AWS credentials and go to the [AWS Cloud9 Console](https://us-east-1.console.aws.amazon.com/cloud9/home?region=us-east-1).
2. If you have previously set up a Cloud9 environment in your account you can use it and skip this step entirely.
3. Press the Create environment button or go [here](https://us-east-1.console.aws.amazon.com/cloud9/home/create).
4. For the Name enter <unique environment name> and press the Next step button.
5. For Environment Settings use the defaults and press the Next step button.
6. Review the Environment name and settings and press the Create environment button.
    You can optionally use your own Ec2 instance if you have configured.
7. Wait for the environment to start.

### Create a ECR repository, build and push the docker image to ECR
1. In the Cloud9 instance, run the below command to create a repository in ECR
    ```
    aws ecr create-repository --repository-name <repository-name>
    ```
    You will get a response similar to this
    ```
    {
        "repository": {
            "repositoryArn": "arn:aws:ecr:us-east-1:123456789012:repository/chime-sdk-recording-demo",
            "registryId": "123456789012",
            "repositoryName": "chime-sdk-recording-demo",
            "repositoryUri": "123456789012.dkr.ecr.us-east-1.amazonaws.com/chime-sdk-recording-demo",
            "createdAt": 1585247726.0,
            "imageTagMutability": "MUTABLE",
            "imageScanningConfiguration": {
                "scanOnPush": false
            }
        }
    }
    ```

    **Note** the `"repositoryUri": "123456789012.dkr.ecr.us-east-1.amazonaws.com/chime-sdk-recording-demo"` in the response. We would need that for pushing the docker image to ECR.

2. In the Cloud9 instance, execute the following commands to download our recording application
    ```
    git clone https://github.com/aws-samples/amazon-chime-sdk-meeting-recording-demo.git
    cd amazon-chime-sdk-meeting-recording-demo
    ```
    Note: Update git URL. Currently considering folder name as “amazon-chime-sdk-meeting-recording-demo”

3. Execute the following command with the repositoryUri from step 1 to build and push the docker image to ECR.
    ```
    make ECR_REPO_URI=<repositoryUri>
    ```
    Once the above commands execute successfully you will see an entry for the image in ECR as follows:
    
    ![ECR Repo](https://github.com/aws-samples/amazon-chime-sdk-recording-demo/blob/master/resources/ecr-repository-with-docker-image.png)

### Run deployment script 
     
Executing the following command will create a CloudFormation stack containing an ECS cluster, ECS task definition, S3 bucket, Lambda and an API Gateway deployment along with some IAM roles and networking artifacts required for the ECS Cluster like VPC, subnets, security groups, autoscaling group etc.
```
node ./deploy.js -b <my-bucket> -s <my-stack> -i <my-docker-image> -r <region>
```
The above step takes up to 15 minutes to complete and automatically deploys a Cloud Formation stack which creates resources that will be needed to run the recording demo. You will get an API Gateway invoke URL in the output.

![Deploy output](https://github.com/aws-samples/amazon-chime-sdk-recording-demo/blob/master/resources/deploy-script-output.png)

### Start a Chime SDK meeting with our serverless demo and join with multiple participants
    
1. At this point the recording service can record any webpage. Alternatively, you can use our Chime SDK demo application by executing the following
    ```
    cd ../
    git clone https://github.com/aws/amazon-chime-sdk-js/tree/master/demos/serverless
    cd demos/serverless
    ```

2. Deploy the demo using:
    ```
    node ./deploy.js -r us-east-1 -b <my-bucket> -s <my-stack-name> -a meeting
    ```
3. The script will create an S3 bucket and CloudFormation stack with Lambda and API Gateway resources required to run the serverless meeting demo. After the script finishes, it will output a URL that can be opened in a browser.
4. Open the demo using the link (with 'prod/v2' in the end) which was obtained in the previous step in multiple tabs [in any web browser supported by the Chime SDK](https://docs.aws.amazon.com/chime/latest/dg/meetings-sdk.html#mtg-browsers) to simulate several participant joins.

Optionally enable video or content sharing modalities for each participant in addition to audio

### Start the meeting recording
    
There are multiple ways for [Invoking a REST API in Amazon API Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-call-api.html). Here is an example on how to [invoke the API using postman app](https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-use-postman-to-call-api.html).
    
You need to select “AWS Signature” and add your `AccessKey`, `SecretKey` & `AWS Region` in the Authorization tab.

![postman auth](https://github.com/aws-samples/amazon-chime-sdk-recording-demo/blob/master/resources/postman-app-auth-tab.png)

**Start recording:** To start the recording, we need to pass 2 query parameters in the POST request to API Gateway. 

    1. recordingAction=start
    2. meetingURL=<URL encoded meeting url>
    
Sample request: 

`https://o3l808s793.execute-api.us-east-1.amazonaws.com/Prod/recording?recordingAction=start&meetingURL=https%3A%2F%2Fn40tfakmnd.execute-api.us-east-1.amazonaws.com%2FProd%2Fv2%3Fm%3DAnuranTesting001919`

This is how it looks

![start recording](https://github.com/aws-samples/amazon-chime-sdk-recording-demo/blob/master/resources/postman-app-start-recording.png)

### Stop the recording and view the recording artifact

1. To stop the recording, we need to pass 2 query parameters in the POST request to API Gateway. 
    1. recordingAction=stop
    2. taskId=taskArn

    ![stop recording](https://github.com/aws-samples/amazon-chime-sdk-recording-demo/blob/master/resources/postman-app-stop-recording.png)

2. Once the recording stops, 
    1. Open the AWS Console and navigate to Amazon S3
    2. Navigate to the folder “chime-meeting-sdk-<aws-account-id>-<region>-recording-artifacts”
    3. You will find a meeting there with the file name of the meeting id along with the time when the recording was initiated. 

![recording artifacts](https://github.com/aws-samples/amazon-chime-sdk-recording-demo/blob/master/resources/recording-artifacts.png)


### Cleaning up
To avoid incurring future charges, please delete any resources in your account that you are not using such as files in S3, ECS and Lambda instances, Cloud9 environment and API-Gateway entries.

## License

This project is licensed under the Apache-2.0 License.

**Disclaimer:** You and your end users understand that recording Amazon Chime SDK meetings with this feature may be subject to laws or regulations regarding the recording of electronic communications, and that it is your and your end users’ responsibility to comply with all applicable laws regarding the recording, including properly notifying all participants in a recorded session or to a recorded communication that the session or communication is being recorded and obtain their consent.

