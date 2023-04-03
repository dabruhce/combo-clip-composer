# Combo Clip Composer

Combo Clip Composer is a tool that allows users to create combo videos, highlight reels, or instructional content for fighting game players by stitching together videos and inputs based on text inputs.

## Overview

Combo Clip Composer is a command-line tool that utilizes text inputs to create video clips. It provides an easy way for users to create instructional content for fighting games by overlaying combo inputs on top of gameplay footage.

## Features

- Stitch together videos and combo inputs based on text inputs.
- Specify the position of the combo input overlay within the video.
- Customize the output directory for the generated clip.

## Getting Started

To use Combo Clip Composer, follow these steps:

1. Clone the repository using `git clone https://github.com/dabruhce/combo-clip-composer.git`.
2. Navigate to the project directory using `cd combo-clip-composer`.
3. Install the required dependencies using `yarn`.

## Usage

To use Combo Clip Composer, run the following command:

node main.js [VIDEO_PATH] "[COMBO_INPUT]" [XPos] [YPos] [OUTPUT_PATH]


Here's an explanation of each of the command-line arguments:

- `VIDEO_PATH`: The path to the video file you want to use as the base for the clip.
- `COMBO_INPUT`: The text input representing the combo sequence you want to display on the clip.
- `XPos`: The horizontal position (in pixels) where the clip should be placed within the video.
- `YPos`: The vertical position (in pixels) where the clip should be placed within the video.
- `OUTPUT_PATH`: The directory where the output clip should be saved.

## Examples

Here's an example command that creates a clip that displays the combo `d df f 2` from a video located at `./assets/tests/video/video.mp4` starting at XPos YPos and saves the output in the `./artifacts/` directory:

node main.js ./assets/tests/video/video.mp4 'd df f 2' 100 900 ./artifacts/


## Contributing

If you want to contribute to Combo Clip Composer, please read the [contributing guidelines](CONTRIBUTING.md) first.

## License

Combo Clip Composer is released under the [MIT License](LICENSE).
