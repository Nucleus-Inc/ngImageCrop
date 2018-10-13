crop.factory('cropCanvas', [function() {
  // Shape = Array of [x,y] [0, 0] - center
  let shapeArrowNW=[[-0.5,-2],[-3,-4.5],[-0.5,-7],[-7,-7],[-7,-0.5],[-4.5,-3],[-2,-0.5]]
  let shapeArrowNE=[[0.5,-2],[3,-4.5],[0.5,-7],[7,-7],[7,-0.5],[4.5,-3],[2,-0.5]]
  let shapeArrowSW=[[-0.5,2],[-3,4.5],[-0.5,7],[-7,7],[-7,0.5],[-4.5,3],[-2,0.5]]
  let shapeArrowSE=[[0.5,2],[3,4.5],[0.5,7],[7,7],[7,0.5],[4.5,3],[2,0.5]]
  let shapeArrowN=[[-1.5,-2.5],[-1.5,-6],[-5,-6],[0,-11],[5,-6],[1.5,-6],[1.5,-2.5]]
  let shapeArrowW=[[-2.5,-1.5],[-6,-1.5],[-6,-5],[-11,0],[-6,5],[-6,1.5],[-2.5,1.5]]
  let shapeArrowS=[[-1.5,2.5],[-1.5,6],[-5,6],[0,11],[5,6],[1.5,6],[1.5,2.5]]
  let shapeArrowE=[[2.5,-1.5],[6,-1.5],[6,-5],[11,0],[6,5],[6,1.5],[2.5,1.5]]

  // Colors
  let colors={
    areaOutline: '#fff',
    resizeBoxStroke: '#fff',
    resizeBoxFill: '#444',
    resizeBoxArrowFill: '#fff',
    resizeCircleStroke: '#fff',
    resizeCircleFill: '#444',
    moveIconFill: '#fff'
  }

  return (ctx) => {

    /* Base functions */

    // Calculate Point
     const calcPoint = (point,offset,scale) => {
        return [scale*point[0]+offset[0], scale*point[1]+offset[1]]
    }

    // Draw Filled Polygon
    const drawFilledPolygon = (shape,fillStyle,centerCoords,scale) => {
        ctx.save()
        ctx.fillStyle = fillStyle
        ctx.beginPath()
        let pc, pc0=calcPoint(shape[0],centerCoords,scale)
        ctx.moveTo(pc0[0],pc0[1])

        for(let p in shape) {
            if (p > 0) {
                pc=calcPoint(shape[p],centerCoords,scale)
                ctx.lineTo(pc[0],pc[1])
            }
        }

        ctx.lineTo(pc0[0],pc0[1])
        ctx.fill()
        ctx.closePath()
        ctx.restore()
    }


    /* Icons */

    this.drawIconMove = (centerCoords, scale) => {
      drawFilledPolygon(shapeArrowN, colors.moveIconFill, centerCoords, scale)
      drawFilledPolygon(shapeArrowW, colors.moveIconFill, centerCoords, scale)
      drawFilledPolygon(shapeArrowS, colors.moveIconFill, centerCoords, scale)
      drawFilledPolygon(shapeArrowE, colors.moveIconFill, centerCoords, scale)
    }

    this.drawIconResizeCircle = (centerCoords, circleRadius, scale) => {
      let scaledCircleRadius=circleRadius*scale
      ctx.save()
      ctx.strokeStyle = colors.resizeCircleStroke
      ctx.lineWidth = 2
      ctx.fillStyle = colors.resizeCircleFill
      ctx.beginPath()
      ctx.arc(centerCoords[0],centerCoords[1],scaledCircleRadius,0,2*Math.PI)
      ctx.fill()
      ctx.stroke()
      ctx.closePath()
      ctx.restore()
    }

    this.drawIconResizeBoxBase = (centerCoords, boxSize, scale) => {
      let scaledBoxSize=boxSize*scale
      ctx.save()
      ctx.strokeStyle = colors.resizeBoxStroke
      ctx.lineWidth = 2
      ctx.fillStyle = colors.resizeBoxFill
      ctx.fillRect(centerCoords[0] - scaledBoxSize/2, centerCoords[1] - scaledBoxSize/2, scaledBoxSize, scaledBoxSize)
      ctx.strokeRect(centerCoords[0] - scaledBoxSize/2, centerCoords[1] - scaledBoxSize/2, scaledBoxSize, scaledBoxSize)
      ctx.restore()
    }
    this.drawIconResizeBoxNESW = (centerCoords, boxSize, scale) => {
      this.drawIconResizeBoxBase(centerCoords, boxSize, scale)
      drawFilledPolygon(shapeArrowNE, colors.resizeBoxArrowFill, centerCoords, scale)
      drawFilledPolygon(shapeArrowSW, colors.resizeBoxArrowFill, centerCoords, scale)
    }
    this.drawIconResizeBoxNWSE = (centerCoords, boxSize, scale) => {
      this.drawIconResizeBoxBase(centerCoords, boxSize, scale)
      drawFilledPolygon(shapeArrowNW, colors.resizeBoxArrowFill, centerCoords, scale)
      drawFilledPolygon(shapeArrowSE, colors.resizeBoxArrowFill, centerCoords, scale)
    }

    /* Crop Area */

    this.drawCropArea = (image, centerCoords, size, fnDrawClipPath) => {
      let xRatio=image.width/ctx.canvas.width,
          yRatio=image.height/ctx.canvas.height,
          xLeft=centerCoords[0]-size/2,
          yTop=centerCoords[1]-size/2

      ctx.save()
      ctx.strokeStyle = colors.areaOutline
      ctx.lineWidth = 2
      ctx.beginPath()
      fnDrawClipPath(ctx, centerCoords, size)
      ctx.stroke()
      ctx.clip()

      // draw part of original image
      if (size > 0) {
          ctx.drawImage(image, xLeft*xRatio, yTop*yRatio, size*xRatio, size*yRatio, xLeft, yTop, size, size)
      }

      ctx.beginPath()
      fnDrawClipPath(ctx, centerCoords, size)
      ctx.stroke()
      ctx.clip()

      ctx.restore()
    }

  }
}])
