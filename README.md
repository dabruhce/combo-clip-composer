# Combo Clip Composer

Combo Clip Composer is a tool that allows users to create combo videos, highlight reels, or instructional content for fighting game players by stitching together videos and inputs based on text inputs.

## Overview

Combo Clip Composer is a command-line tool that uses text inputs to create video clips. It provides an easy way for users to create instructional content for fighting games by overlaying combo inputs on top of gameplay footage.

## Features

- Stitch together videos and combo inputs based on text inputs.
- Specify the position of the combo input overlay within the video.
- Customize the output directory for the generated clip.
- Download video from youtube, turn it into a combo video

## Getting Started

To use Combo Clip Composer, follow these steps:

1. Clone the repository using `git clone https://github.com/dabruhce/combo-clip-composer.git`.
2. Navigate to the project directory using `cd combo-clip-composer`.
3. Install the required dependencies using `yarn`.

## Usage Local

To use Combo Clip Composer on a local file, run the following command:

node main.js [VIDEO_PATH] "[COMBO_INPUT]" [XPos] [YPos] [OUTPUT_PATH]


Here's an explanation of each of the command-line arguments:

- `VIDEO_PATH`: The path to the video file you want to use as the base for the clip.
- `COMBO_INPUT`: The text input representing the combo sequence you want to display on the clip.
- `XPos`: The horizontal position (in pixels) where the clip should be placed within the video.
- `YPos`: The vertical position (in pixels) where the clip should be placed within the video.
- `OUTPUT_PATH`: The directory where the output clip should be saved.

## Usage Youtube
To use Combo Clip Composer on video from youtube, run the following command:

node main-pipeline.js [VIDEO_ID] [DOWNLOAD_DESTINATION_VIDEO] [DOWNLOAD_DESTINATION_AUDIO] [FINAL_DESTINATION] "[COMBO_INPUT]" [XPos] [YPos]


Here's an explanation of each of the command-line arguments:

- `VIDEO_ID`: Youtube video id of the clip.
- `DOWNLOAD_DESTINATION_VIDEO`: destination to save video.
- `DOWNLOAD_DESTINATION_AUDIO`: destination to save audio.
- `FINAL_DESTINATION`: final destination
- `COMBO_INPUT`: The text input representing the combo sequence you want to display on the clip.
- `XPos`: The horizontal position (in pixels) where the clip should be placed within the video.
- `YPos`: The vertical position (in pixels) where the clip should be placed within the video.
## Examples

Here's an example command that creates a clip that displays the combo `d df f 2` from a video located at `./assets/tests/video/video.mp4` starting at XPos YPos and saves the output in the `./artifacts/` directory:

node main.js ./assets/tests/video/video.mp4 "d df f 2" 100 900 ./artifacts/

node main-pipeline.js xHdlyUh0e5Q ./artifacts/pipeline/temp-pipeline-video.mp4 ./artifacts/pipeline/temp-pipeline-audio.aac ./artifacts/pipeline/final-pipeline-video.mp4 "d df f 2" 100 900

## Adding custom images
Combo Clip Composer is intended to be easy to add and customize without knowing how to code. If users want to add or replace images in this POC they can add or replace images in './assets/games/Tekken7/images' or './assets/games/common/images'. 

Caveats, 
1. images must be SVG
2. when you refer to an image it will take the entire string as a compare
3. dont use commas


### adding new images example
````bash
cp ./assets/tests/image/smile.svg ./assets/games/common/images/smile.svg
node main.js ./assets/tests/video/video.mp4 "d df f 2 smile" 100 900 ./artifacts/
````

### replacing images
Users can replace existing images in ./assets/games/Tekken7/images & ./assets/games/common/images with ones they prefer.



### Example of Youtube video before and after
This shows the before and after of running a job which
- pulls xHdlyUh0e5Q to the local PC in highest audio/video quality
- reassembles audio/video
- breaks video into frames
- inserts the combo images on all frames
- reassembles the video from the frames

[![Before Pipeline Video](https://img.youtube.com/vi/xHdlyUh0e5Q/0.jpg)](https://www.youtube.com/watch?v=xHdlyUh0e5Q)

[![After Pipeline Video](https://img.youtube.com/vi/6P9Be5N8zHs/0.jpg)](https://www.youtube.com/watch?v=6P9Be5N8zHs)

### Example of using custom image, from adding new images example
[![Video](https://img.youtube.com/vi/MYL4ngDcN80/0.jpg)](https://www.youtube.com/watch?v=MYL4ngDcN80)


## Contributing

If you want to contribute to Combo Clip Composer, please read the [contributing guidelines](CONTRIBUTING.md) first.

Arrow & Button Images from https://github.com/dabruhce/tk7movespretty

## License

Combo Clip Composer is released under the [MIT License](LICENSE).
