// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const { spawn } = require('child_process');
const { S3Uploader } = require('./utils/upload');

const MEETING_URL = process.env.MEETING_URL || 'Not present in environment';
console.log(`[recording process] MEETING_URL: ${MEETING_URL}`);

const args = process.argv.slice(2);
const BUCKET_NAME = args[0];
console.log(`[recording process] BUCKET_NAME: ${BUCKET_NAME}`);
const BROWSER_SCREEN_WIDTH = args[1];
const BROWSER_SCREEN_HEIGHT = args[2];
console.log(`[recording process] BROWSER_SCREEN_WIDTH: ${BROWSER_SCREEN_WIDTH}, BROWSER_SCREEN_HEIGHT: ${BROWSER_SCREEN_HEIGHT}`);

const VIDEO_BITRATE = 3000;
const VIDEO_FRAMERATE = 30;
const VIDEO_GOP = VIDEO_FRAMERATE * 2;
const AUDIO_BITRATE = '160k';
const AUDIO_SAMPLERATE = 44100;
const AUDIO_CHANNELS = 2
const DISPLAY = process.env.DISPLAY;

const transcodeStreamToOutput = spawn('ffmpeg',[
    '-hide_banner',
    '-loglevel', 'error',
    // disable interaction via stdin
    '-nostdin',
    // screen image size
    '-s', `${BROWSER_SCREEN_WIDTH}x${BROWSER_SCREEN_HEIGHT}`,
    // video frame rate
    '-r', `${VIDEO_FRAMERATE}`,
    // hides the mouse cursor from the resulting video
    '-draw_mouse', '0',
    // grab the x11 display as video input
    '-f', 'x11grab',
        '-i', `${DISPLAY}`,
    // grab pulse as audio input
    '-f', 'pulse', 
        '-ac', '2',
        '-i', 'default',
    // codec video with libx264
    '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-profile:v', 'main',
        '-preset', 'veryfast',
        '-x264opts', 'nal-hrd=cbr:no-scenecut',
        '-minrate', `${VIDEO_BITRATE}`,
        '-maxrate', `${VIDEO_BITRATE}`,
        '-g', `${VIDEO_GOP}`,
    // apply a fixed delay to the audio stream in order to synchronize it with the video stream
    '-filter_complex', 'adelay=delays=1000|1000',
    // codec audio with aac
    '-c:a', 'aac',
        '-b:a', `${AUDIO_BITRATE}`,
        '-ac', `${AUDIO_CHANNELS}`,
        '-ar', `${AUDIO_SAMPLERATE}`,
    // adjust fragmentation to prevent seeking(resolve issue: muxer does not support non seekable output)
    '-movflags', 'frag_keyframe+empty_moov',
    // set output format to mp4 and output file to stdout
    '-f', 'mp4', '-'
    ]
);

transcodeStreamToOutput.stderr.on('data', data => {
    console.log(`[transcodeStreamToOutput process] stderr: ${(new Date()).toISOString()} ffmpeg: ${data}`);
});

const timestamp = new Date();
const fileTimestamp = timestamp.toISOString().substring(0,19);
const year = timestamp.getFullYear();
const month = timestamp.getMonth() + 1;
const day = timestamp.getDate();
const hour = timestamp.getUTCHours();
const fileName = `${year}/${month}/${day}/${hour}/${fileTimestamp}.mp4`;
new S3Uploader(BUCKET_NAME, fileName).uploadStream(transcodeStreamToOutput.stdout);

// event handler for docker stop, not exit until upload completes
process.on('SIGTERM', (code, signal) => {
    console.log(`[recording process] exited with code ${code} and signal ${signal}(SIGTERM)`);
    process.kill(transcodeStreamToOutput.pid, 'SIGTERM');
});

// debug use - event handler for ctrl + c
process.on('SIGINT', (code, signal) => {
    console.log(`[recording process] exited with code ${code} and signal ${signal}(SIGINT)`)
    process.kill('SIGTERM');
});

process.on('exit', function(code) {
    console.log('[recording process] exit code', code);
});