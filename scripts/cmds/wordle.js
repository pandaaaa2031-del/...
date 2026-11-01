const { createCanvas } = require('canvas');

// Helper function to draw rounded border squares
function drawBorderSquareRadius(ctx, x, y, width, height, radius, lineWidth, color, fill = false) {
 ctx.beginPath();
 if (ctx.roundRect) {
  ctx.roundRect(x, y, width, height, radius);
 } else {
  ctx.rect(x, y, width, height); // Fallback for older canvas versions
 }
 if (fill) {
  ctx.fillStyle = color;
  ctx.fill();
 } else {
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = color;
  ctx.stroke();
 }
}

// Helper function to calculate square positions
function getPositionOfSquare(colIndex, tryNum, sizeOfOneSquare, distance, marginX, marginY, lineWidth, heightGameName) {
 const xOutSide = marginX + colIndex * (sizeOfOneSquare + distance);
 const yOutSide = marginY + heightGameName + tryNum * (sizeOfOneSquare + distance);
 const xInSide = xOutSide + lineWidth;
 const yInSide = yOutSide + lineWidth;
 return { xOutSide, yOutSide, xInSide, yInSide };
}

// Core drawing function for Wordle
function drawWordleCanvas(options) {
 let {
  canvas,
  ctx,
  canvasNumbers,
  ctxNumbers,
  canvasHightLight,
  ctxHightLight,
  tryNumber,
  row,
  col,
  numbers,
  answer,
  sizeOfOneSquare,
  distance,
  marginX,
  marginY,
  lineWidth,
  heightGameName,
  radius,
  fontNumbers,
  fontSuggest,
  fontResultWin,
  fontResultLose
 } = options;

 let isWin = null;
 
 if (numbers && numbers.length) {
  ctxNumbers.font = fontNumbers || 'bold 24px sans-serif';
  ctxNumbers.fillStyle = '#f0f0f0';
  ctxNumbers.textAlign = 'center';
  ctxNumbers.textBaseline = 'middle';

  for (let i = 0; i < col; i++) {
   const { xOutSide, yOutSide, xInSide, yInSide } = getPositionOfSquare(i, tryNumber, sizeOfOneSquare, distance, marginX, marginY, lineWidth, heightGameName);
   
   // draw background of square
   drawBorderSquareRadius(
    ctx,
    xInSide,
    yInSide,
    sizeOfOneSquare - lineWidth * 2,
    sizeOfOneSquare - lineWidth * 2,
    radius / 2,
    lineWidth,
    '#3a3a3c',
    true
   );

   // draw letter
   const x = xOutSide + sizeOfOneSquare / 2;
   const y = yOutSide + sizeOfOneSquare / 2;
   ctxNumbers.fillText(numbers[i], x, y);

   // yellow || green highlight logic (Wordle rules)
   if (
    answer.includes(numbers[i]) || numbers[i] === answer[i]
   ) {
    drawBorderSquareRadius(
     ctxHightLight,
     xOutSide,
     yOutSide,
     sizeOfOneSquare,
     sizeOfOneSquare,
     radius,
     lineWidth,
     numbers[i] == answer[i] ? '#538d4e' : '#b59f3b',
     true
    );
    drawBorderSquareRadius(
     ctxHightLight,
     xInSide,
     yInSide,
     sizeOfOneSquare - lineWidth * 2,
     sizeOfOneSquare - lineWidth * 2,
     radius / 2,
     lineWidth,
     numbers[i] == answer[i] ? '#538d4e' : '#b59f3b',
     true
    );
   }
  }

  // Hints calculation (Left: correct chars, Right: correct positions)
  let numberRight = 0;
  let numberRightPosition = 0;
  answer.split('').forEach((item, index) => {
   if (numbers.includes(item)) numberRight++;
   if (item == numbers[index]) numberRightPosition++;
  });

  ctx.font = fontSuggest || '18px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Left hint
  ctx.fillText(numberRight, marginX / 2, marginY + sizeOfOneSquare / 2 + heightGameName + tryNumber * (sizeOfOneSquare + distance));
  // Right hint
  ctx.fillText(numberRightPosition, marginX + col * (sizeOfOneSquare) + distance * (col - 1) + marginX / 2, marginY + sizeOfOneSquare / 2 + heightGameName + tryNumber * (sizeOfOneSquare + distance));

  if (
   (numberRight == answer.length && numberRightPosition == answer.length) || (tryNumber + 1 == row)
  ) {
   isWin = (numberRight == answer.length && numberRightPosition == answer.length);
   ctx.save();
   ctx.drawImage(canvasHightLight, 0, 0);
   ctx.drawImage(canvasNumbers, 0, 0);

   ctx.font = isWin ? (fontResultWin || 'bold 36px sans-serif') : (fontResultLose || 'bold 36px sans-serif');
   ctx.fillStyle = isWin ? '#538d4e' : '#d32f2f';
   ctx.globalAlpha = 0.4;
   ctx.translate(canvas.width / 2, marginY + heightGameName + (row * (sizeOfOneSquare + distance)) / 2);
   ctx.textAlign = 'center';
   ctx.textBaseline = 'middle';
   ctx.rotate(-45 * Math.PI / 180);
   ctx.fillText(isWin ? 'YOU WIN' : answer.split('').join(' '), 0, 0);
   ctx.restore();
  } else {
   ctx.drawImage(canvasNumbers, 0, 0);
  }
 }

 tryNumber++;

 const imageStream = canvas.createPNGStream();
 imageStream.path = `wordle_${Date.now()}.png`;

 return {
  ...options,
  imageStream,
  ctx,
  canvas,
  tryNumber: tryNumber,
  isWin,
  ctxHightLight,
  canvasHightLight,
  ctxNumbers,
  canvasNumbers
 };
}

module.exports = {
 config: {
  name: "wordle",
  aliases: ["wordguess", "wle"],
  version: "1.0",
  author: "AI Assistant",
  countDown: 5,
  role: 0,
  description: {
   vi: "Game đoán chữ Wordle bằng canvas",
   en: "Canvas Wordle guessing game"
  },
  category: "game",
  guide: {
   vi: "{pn}: Bắt đầu chơi game Wordle.",
   en: "{pn}: Start the Wordle game."
  }
 },

 onStart: async function({ api, event }) {
  const { threadID, messageID } = event;
  
  const answersList = ["APPLE", "TIGER", "HOUSE", "WATER", "CHAIR", "BRAIN", "SMART", "PLANT", "TRAIN", "MUSIC"];
  const answer = answersList[Math.floor(Math.random() * answersList.length)];
  const col = 5;
  const row = 6;
  const sizeOfOneSquare = 50;
  const distance = 8;
  const marginX = 50;
  const marginY = 40;
  const lineWidth = 3;
  const heightGameName = 40;
  const radius = 8;

  const width = col * sizeOfOneSquare + (col - 1) * distance + marginX * 2;
  const height = row * sizeOfOneSquare + (row - 1) * distance + marginY * 2 + heightGameName;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const canvasNumbers = createCanvas(width, height);
  const ctxNumbers = canvasNumbers.getContext('2d');

  const canvasHightLight = createCanvas(width, height);
  const ctxHightLight = canvasHightLight.getContext('2d');

  // Background (Dark mode theme like Wordle)
  ctx.fillStyle = '#121213';
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText("WORDLE GAME", width / 2, marginY + 15);

  // Draw empty board grids
  for (let r = 0; r < row; r++) {
   for (let c = 0; c < col; c++) {
    const { xOutSide, yOutSide } = getPositionOfSquare(c, r, sizeOfOneSquare, distance, marginX, marginY, lineWidth, heightGameName);
    drawBorderSquareRadius(ctx, xOutSide, yOutSide, sizeOfOneSquare, sizeOfOneSquare, radius, lineWidth, '#3a3a3c', false);
   }
  }

  const imageStream = canvas.createPNGStream();
  imageStream.path = `wordle_${Date.now()}.png`;

  return api.sendMessage({
   body: "🔤 | **WORDLE CANVAS GAME**\n📥 Reply to this message with a 5-letter English word to play!",
   attachment: imageStream
  }, threadID, (err, info) => {
   if (err || !info) return;

   if (!global.client.handleReply) global.client.handleReply = [];

   global.client.handleReply.push({
    name: this.config.name,
    messageID: info.messageID,
    author: event.senderID,
    answer,
    tryNumber: 0,
    row,
    col,
    sizeOfOneSquare,
    distance,
    marginX,
    marginY,
    lineWidth,
    heightGameName,
    radius,
    canvas,
    ctx,
    canvasNumbers,
    ctxNumbers,
    canvasHightLight,
    ctxHightLight,
    fontNumbers: 'bold 22px sans-serif',
    fontSuggest: '16px sans-serif',
    fontResultWin: 'bold 30px sans-serif',
    fontResultLose: 'bold 30px sans-serif'
   });
  }, messageID);
 },

 onReply: async function({ api, event, handleReply }) {
  const { threadID, senderID, body, messageID } = event;
  if (senderID !== handleReply.author) return;

  const numbers = body.trim().toUpperCase().split('');
  if (numbers.length !== handleReply.col) {
   return api.sendMessage(`⚠️ | Please enter exactly ${handleReply.col} letters!`, threadID, messageID);
  }

  // Run the canvas drawing builder function
  const gameResult = drawWordleCanvas({
   ...handleReply,
   numbers
  });

  const messageObj = {
   body: gameResult.isWin === true ? "🎉 | YOU WIN! Fantastic job solving the Wordle!" :
         gameResult.isWin === false ? `❌ | GAME OVER! The correct word was: **${handleReply.answer}**` :
         `🎮 | Remaining tries: ${handleReply.row - gameResult.tryNumber}. Check hints on sides!`,
   attachment: gameResult.imageStream
  };

  return api.sendMessage(messageObj, threadID, (err, info) => {
   if (err || !info) return;

   if (gameResult.isWin !== null) {
    global.client.handleReply = global.client.handleReply.filter(item => item.messageID !== handleReply.messageID);
   } else {
    const index = global.client.handleReply.findIndex(item => item.messageID === handleReply.messageID);
    if (index !== -1) {
     global.client.handleReply[index].tryNumber = gameResult.tryNumber;
     global.client.handleReply[index].messageID = info.messageID;
     global.client.handleReply[index].canvas = gameResult.canvas;
     global.client.handleReply[index].ctx = gameResult.ctx;
    }
   }
  }, messageID);
 }
};
  
