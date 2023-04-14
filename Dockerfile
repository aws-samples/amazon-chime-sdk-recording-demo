# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

FROM ubuntu:18.04

ENV DEBIAN_FRONTEND noninteractive

RUN apt-get update \
    && apt-get upgrade -y \
    && apt-get install -y curl \
    && curl -sL https://deb.nodesource.com/setup_14.x | bash - \
    && apt-get update \
    && apt-get install -y nodejs pulseaudio xvfb firefox ffmpeg xdotool unzip \
    && npm install -g npm \
    && mkdir -p /usr/src

COPY ./recording/package.json /usr/src/package.json
COPY ./recording/package-lock.json /usr/src/package-lock.json

WORKDIR /usr/src

RUN npm install

COPY ./recording /usr/src/

RUN chmod +x ./run.sh \
	  && chmod +x ./record.js

ENTRYPOINT ["/bin/bash"]

CMD [ "./run.sh" ]
