## Amazon Chime SDK recording demo

This repository contains resources for building a demo application that records media from Amazon Chime SDK meeting sessions. Included is a Docker image and serverless AWS CloudFormation templates that you can deploy to your AWS Account. The Walkthrough will show you how to create a container using the Docker image and upload it to Amazon Elastic Container Registry (ECR), which is referenced by a Amazon Elastic Container Service (ECS) task. AWS CloudFormation templates orchestrate resources (including Amazon APIGateway, Amazon Lambda, and Amazon ECS) that run the recording demo application. When deployed, the startRecording API will enable "a bot" (i.e. a headless meeting attendee) to join an Amazon Chime SDK meeting session via a URL and record the meeting's audio, video and screen share in high definition (1080p at 30fps by default, but configurable) and stream output to a specified Amazon S3 bucket. The stopRecording API will stop the ECS task and complete the upload.

## Prerequisites

For this walkthrough, you should have the following prerequisites:

* [An AWS account](https://signin.aws.amazon.com/signin?redirect_uri=https%3A%2F%2Fportal.aws.amazon.com%2Fbilling%2Fsignup%2Fresume&client_id=signup)

## Walkthrough

The sections as enumerated below will walk you through the process of creating and recording a Chime SDK meeting:

* Setup AWS Cloud9 environment and clone the demo application
* Create an Amazon Elastic Container Registry (ECR) and register a Docker container image
* Deploy the Amazon Chime SDK Recording template
* Start a Amazon Chime SDK meeting with the serverless demo application and join with multiple participants
* Start the meeting recording
* Stop the recording and view the recording artifact

### Create an AWS Cloud9 environment
1. Log into the AWS console with your AWS credentials and go to the [AWS Cloud9 Console](https://us-east-1.console.aws.amazon.com/cloud9/home?region=us-east-1).
2. If you have previously set up a AWS Cloud9 environment in your account you can use it and skip this step entirely.
3. Press the **Create environment** button or go [here](https://us-east-1.console.aws.amazon.com/cloud9/home/create).
4. For the Name enter <unique environment name> and press the **Next step** button.
5. For **Environment Settings** 
    * For **Instance Type**, select `Other instance type` and select `t3.medium` from the dropdown.
    * For **Platform**, select `Ubuntu Server 18.04 LTS`
    * Press the **Next step** button.
6. Review the **Environment name and settings** and press the **Create environment** button.
    You can optionally use your own Amazon EC2 instance if you have configured.
7. Wait for the environment to start.

### Create a Amazon ECR repository, build and push the docker image to Amazon ECR
1. In the AWS Cloud9 instance, run the below command to create a repository in Amazon ECR
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

2. In the AWS Cloud9 instance, execute the following commands to download the recording demo.
    ```
    git clone https://github.com/aws-samples/amazon-chime-sdk-recording-demo.git
    cd amazon-chime-sdk-recording-demo
    ```

3. Execute the following command with the value of `repositoryUri` from step 1 to build and push the docker image to Amazon ECR
    ```
    make ECR_REPO_URI=<repositoryUri>
    ```
    Once the above commands execute successfully you will see an entry for the image in Amazon ECR as follows:

    ![ECR Repo](https://github.com/aws-samples/amazon-chime-sdk-recording-demo/blob/master/resources/ecr-repository-with-docker-image.png)
    
    **Note:** If this command fails due to AWS CLI version 2.0 not available, you can follow the instructions given here: [Installing the AWS CLI version 2 on Linux](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2-linux.html) and try again.

### Deploy an Amazon Chime SDK Recording AWS CloudFormation Template

1. Execute the following command to create a AWS CloudFormation stack containing an Amazon ECS cluster, Amazon ECS task definition, Amazon S3 bucket, Amazon Lambda and an Amazon API Gateway deployment along with IAM roles and networking resources required for the Amazon ECS Cluster including an Amazon VPC, subnets, security groups, and an auto-scaling group.
    ```
    node ./deploy.js -b <my-bucket> -s <my-stack> -i <my-docker-image-uri> -r <region>
    ```
   
   Here is an example:
    ```
    node ./deploy.js -b recording-demo-cnf-deploy-bucket -s recording-demo-cnf-stack -i 123456789012.dkr.ecr.us-east-1.amazonaws.com/recording-demo:latest -r us-east-1
    ```
The above step deploys a AWS CloudFormation stack that creates resources needed to run the recording service. It may take several minutes to complete. You will get an Amazon API Gateway invoke URL in the output.

![Deploy output](https://github.com/aws-samples/amazon-chime-sdk-recording-demo/blob/master/resources/deploy-script-output.png)

### Start an Amazon Chime SDK meeting with our serverless demo and join with multiple participants

1. At this point you can use our Amazon Chime SDK demo application by executing the following
    ```
    cd ../
    git clone https://github.com/aws/amazon-chime-sdk-js
    cd amazon-chime-sdk-js/demos/serverless
    ```

2. Deploy the demo using:
    ```
    node ./deploy.js -r us-east-1 -b <my-bucket> -s <my-stack-name> -a meeting
    ```
   The script will create an Amazon S3 bucket and AWS CloudFormation stack with Amazon Lambda and Amazon API Gateway resources required to run this demo. After the script finishes, it will output a URL that can be opened in a browser.

3. Open the Amazon Chime SDK serverless demo application using the link which was obtained in the previous step in multiple tabs [in any web browser supported by the Amazon Chime SDK](https://docs.aws.amazon.com/chime/latest/dg/meetings-sdk.html#mtg-browsers) to simulate several participant joins. Optionally enable video or content sharing modalities for each participant in addition to audio.


### Start the meeting recording

There are multiple ways for [invoking a REST API in Amazon API Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-call-api.html). In this example we will [use the Postman app](https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-use-postman-to-call-api.html).

1. Follow the steps highlighted in this document to install the [Postman app](https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-use-postman-to-call-api.html).

    You need to select “AWS Signature” and add your `AccessKey`, `SecretKey` & `AWS Region` in the Authorization tab.

    ![postman auth](https://github.com/aws-samples/amazon-chime-sdk-recording-demo/blob/master/resources/postman-app-auth-tab.png)

2. Start recording by passing the `recordingAction` as "start" and a **url encoded** `meetingURL` for our demo application as query parameters in the POST request to API Gateway.

    ![start recording](https://github.com/aws-samples/amazon-chime-sdk-recording-demo/blob/master/resources/postman-app-start-recording.png)

    At this point the entire web page is captured by FFmpeg at 1280 X 720 fidelity and automatically transcoded and uploaded to Amazon S3. The file created in Amazon S3 will remain hidden until the capture is complete. Our demo application has been modified to suppress prompts for input device permissions and display customized UI for the recording bot.

    ![recording bot](https://github.com/aws-samples/amazon-chime-sdk-recording-demo/blob/master/resources/recording-bot-joining-meeting.png)

### Stop the recording and view the recording artifact

1. To stop the recording, we need to pass the task ARN as `taskId` that was received in the API response to start the recording in addition to the `recordingAction` denoting "stop".

    ![stop recording](https://github.com/aws-samples/amazon-chime-sdk-recording-demo/blob/master/resources/postman-app-stop-recording.png)

2. Once the recording stops, open the AWS Console and navigate to Amazon S3. You will find a recording in the bucket `chime-meeting-sdk-<aws-account-id>-<region>-recording-artifacts`, with a key name YYYY/MM/DD/HH/<ISO8601time when meeting started>.mp4.

    ![recording artifacts](https://github.com/aws-samples/amazon-chime-sdk-recording-demo/blob/master/resources/recording-artifacts.png)


### Cleaning up
To avoid incurring future charges, please delete any resources in your account that you are not using such as files in Amazon S3, Amazon ECS and Amazon Lambda instances, AWS Cloud9 environment and Amazon API Gateway entries.

## License

This project is licensed under the Apache-2.0 License.

**Disclaimer:** You and your end users understand that recording Amazon Chime SDK meetings with this feature may be subject to laws or regulations regarding the recording of electronic communications, and that it is your and your end users’ responsibility to comply with all applicable laws regarding the recording, including properly notifying all participants in a recorded session or to a recorded communication that the session or communication is being recorded and obtain their consent.

**Disclaimer:** Deploying the Amazon Chime SDK demo applications contained in this repository will cause your AWS Account to be billed for services, including the Amazon Chime SDK, used by the application.
