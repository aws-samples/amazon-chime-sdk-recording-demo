# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

IMAGE_NAME=meetingrecording
IMAGE_VERSION=latest
ENV_FILE=container.env
CONTAINER_NAME=recording
IMAGE_LABEL=$(IMAGE_NAME):$(IMAGE_VERSION)

REGION = $(word 4, $(subst ., , $(ECR_REPO_URI)))
REPO_NAME = $(lastword $(subst /, , $(ECR_REPO_URI)))
SHELL := /bin/bash

all: build_upload

build_upload:
	
	@REGEX='^[0-9]{12}\.dkr\.ecr\..+\.amazonaws\.com\/[a-z0-9_/-]+$$'; \
	if [[ $(ECR_REPO_URI) =~ $$REGEX ]]; then \
		echo "Valid ECR URI format"; else \
		echo "InvalidECR URI format"; \
		exit 1; \
	fi

	aws ecr get-login-password --region $(REGION) | docker login --username AWS --password-stdin $(ECR_REPO_URI)
	docker build -t $(REPO_NAME) .
	docker tag $(REPO_NAME):latest $(ECR_REPO_URI):latest
	docker push $(ECR_REPO_URI):latest
	@echo Image URI in ECR repository: $(ECR_REPO_URI):latest


image:
	docker image build -t $(IMAGE_LABEL) .

run:
	docker run \
		--rm \
		--env-file $(ENV_FILE) \
		--name $(CONTAINER_NAME) \
		$(IMAGE_LABEL) 2>&1 | tee $(CONTAINER_NAME).log

.PHONY: all image run
