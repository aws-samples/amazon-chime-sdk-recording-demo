# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

FROM ubuntu:18.04

ENV DEBIAN_FRONTEND noninteractive

RUN /usr/bin/apt-get update && \
	/usr/bin/apt-get install -y curl && \
	curl -sL https://deb.nodesource.com/setup_10.x | bash - && \
	/usr/bin/apt-get update && \
	/usr/bin/apt-get upgrade -y && \
	/usr/bin/apt-get install -y nodejs pulseaudio xvfb firefox ffmpeg xdotool unzip

COPY /recording /recording
WORKDIR /recording
RUN /usr/bin/npm install && \
	chmod +x /recording/run.sh && \
	chmod +x /recording/record.js

ENTRYPOINT ["/recording/run.sh"]