const { createCanvas, registerFont, loadImage, Image } = require('canvas');

registerFont('./assets/fonts/THEBOLDFONT/THEBOLDFONT.ttf', { family: 'THEBOLDFONT' });

//CANVAS
function estimateTextSize(text, font, fontSize) {
    const canvas = createCanvas(1, 1)
    const context = canvas.getContext('2d')
  
    context.font = `${fontSize}px ${font}`
   //  ctx.font = '50px THEBOLDFONT';
    const metrics = context.measureText(text)
  
    return { width: metrics.width, height: fontSize }
  }
  
  async function createTextCanvasOfSize(text, width, height) {
    return new Promise((resolve, reject) => {
     
      const canvasSize = estimateTextSize(text, 'THEBOLDFONT', 50);

      // Create canvas
      const canvas = createCanvas(canvasSize.width, canvasSize.height);
      const ctx = canvas.getContext('2d');
  
      // Set global alpha to 0.5 for a semi-transparent background
      ctx.globalAlpha = 0.0;
  
      // Set background color
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
  
      // Reset global alpha to 1
      ctx.globalAlpha = 1;
  
      // Set font and color
      ctx.font = '50px THEBOLDFONT';
      ctx.fillStyle = 'yellow';
  
      // Draw text
      ctx.fillText(text, 10, 50);
  
      // Get PNG buffer from canvas
      //const buffer = canvas.toBuffer('image/png');
  
     // resolve(buffer);
      resolve(canvas);
    });
  }

  async function createTextCanvas(text) {
    return new Promise((resolve, reject) => {
      // Create canvas
      const canvas = createCanvas(400, 200);
      const ctx = canvas.getContext('2d');
  
      // Set global alpha to 0.5 for a semi-transparent background
      ctx.globalAlpha = 0.0;
  
      // Set background color
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
  
      // Reset global alpha to 1
      ctx.globalAlpha = 1;
  
      // Set font and color
      ctx.font = '50px THEBOLDFONT';
      ctx.fillStyle = 'yellow';
  
      // Draw text
      ctx.fillText(text, 10, 50);
  
      // Get PNG buffer from canvas
      const buffer = canvas.toBuffer('image/png');
  
      resolve(buffer);
    });
  }

  module.exports = { createTextCanvasOfSize, estimateTextSize, createTextCanvas };