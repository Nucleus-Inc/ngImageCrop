crop.factory('cropHost', ['$document', 'cropAreaCircle', 'cropAreaSquare', 'cropEXIF', function($document, CropAreaCircle, CropAreaSquare, cropEXIF) {
  /* STATIC S */

  // Get Element's Offset
  const getElementOffset = (elem) => {
      let box = elem.getBoundingClientRect()

      let body = document.body
      let docElem = document.documentElement

      let scrollTop = window.pageYOffset || docElem.scrollTop || body.scrollTop
      let scrollLeft = window.pageXOffset || docElem.scrollLeft || body.scrollLeft

      let clientTop = docElem.clientTop || body.clientTop || 0
      let clientLeft = docElem.clientLeft || body.clientLeft || 0

      let top  = box.top +  scrollTop - clientTop
      let left = box.left + scrollLeft - clientLeft

      return { top: Math.round(top), left: Math.round(left) }
  }

  return (elCanvas, opts, events) => {
    /* PRIVATE letIABLES */

    // Object Pointers
    let ctx=null,
        image=null,
        theArea=null

    // Dimensions
    let minCanvasDims=[300,300],
        maxCanvasDims=[300,300]

    // Result Image size
    let resImgSize=200

    // Result Image type
    let resImgFormat='image/png'

    // Result Image quality
    let resImgQuality=null

    /* PRIVATE S */

    // Draw Scene
     function drawScene() {
      // clear canvas
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

      if(image!==null) {
        // draw source image
        ctx.drawImage(image, 0, 0, ctx.canvas.width, ctx.canvas.height)

        ctx.save()

        // and make it darker
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

        ctx.restore()

        // draw Area
        theArea.draw()
      }
    }

    // Resets CropHost
    const resetCropHost = () => {
      if(image!==null) {
        theArea.setImage(image)
        let imageDims=[image.width, image.height],
            imageRatio=image.width/image.height,
            canvasDims=imageDims

        if(canvasDims[0]>maxCanvasDims[0]) {
          canvasDims[0]=maxCanvasDims[0]
          canvasDims[1]=canvasDims[0]/imageRatio
        } else if(canvasDims[0]<minCanvasDims[0]) {
          canvasDims[0]=minCanvasDims[0]
          canvasDims[1]=canvasDims[0]/imageRatio
        }
        if(canvasDims[1]>maxCanvasDims[1]) {
          canvasDims[1]=maxCanvasDims[1]
          canvasDims[0]=canvasDims[1]*imageRatio
        } else if(canvasDims[1]<minCanvasDims[1]) {
          canvasDims[1]=minCanvasDims[1]
          canvasDims[0]=canvasDims[1]*imageRatio
        }
        elCanvas.prop('width',canvasDims[0]).prop('height',canvasDims[1]).css({'margin-left': -canvasDims[0]/2+'px', 'margin-top': -canvasDims[1]/2+'px'})

        theArea.setX(ctx.canvas.width/2)
        theArea.setY(ctx.canvas.height/2)
        theArea.setSize(Math.min(200, ctx.canvas.width/2, ctx.canvas.height/2))
      } else {
        elCanvas.prop('width',0).prop('height',0).css({'margin-top': 0})
      }

      drawScene()
    }

    /**
     * Returns event.changedTouches directly if event is a TouchEvent.
     * If event is a jQuery event, return changedTouches of event.originalEvent
     */
    const getChangedTouches = (event) => {
      if(angular.isDefined(event.changedTouches)){
        return event.changedTouches
      }else{
        return event.originalEvent.changedTouches
      }
    }

    const onMouseMove = (e) => {
      if(image!==null) {
        let offset=getElementOffset(ctx.canvas),
            pageX, pageY
        if(e.type === 'touchmove') {
          pageX=getChangedTouches(e)[0].pageX
          pageY=getChangedTouches(e)[0].pageY
        } else {
          pageX=e.pageX
          pageY=e.pageY
        }
        theArea.processMouseMove(pageX-offset.left, pageY-offset.top)
        drawScene()
      }
    }

    const onMouseDown = (e) => {
      e.preventDefault()
      e.stopPropagation()
      if(image!==null) {
        let offset=getElementOffset(ctx.canvas),
            pageX, pageY
        if(e.type === 'touchstart') {
          pageX=getChangedTouches(e)[0].pageX
          pageY=getChangedTouches(e)[0].pageY
        } else {
          pageX=e.pageX
          pageY=e.pageY
        }
        theArea.processMouseDown(pageX-offset.left, pageY-offset.top)
        drawScene()
      }
    }

    const onMouseUp = (e) => {
      if(image!==null) {
        let offset=getElementOffset(ctx.canvas),
            pageX, pageY
        if(e.type === 'touchend') {
          pageX=getChangedTouches(e)[0].pageX
          pageY=getChangedTouches(e)[0].pageY
        } else {
          pageX=e.pageX
          pageY=e.pageY
        }
        theArea.processMouseUp(pageX-offset.left, pageY-offset.top)
        drawScene()
      }
    }


    this.getResultImageDataURI = () => {
      let temp_ctx, temp_canvas
      temp_canvas = angular.element('<canvas></canvas>')[0]
      temp_ctx = temp_canvas.getContext('2d')
      temp_canvas.width = resImgSize
      temp_canvas.height = resImgSize
      if(image!==null){
        temp_ctx.drawImage(image, (theArea.getX()-theArea.getSize()/2)*(image.width/ctx.canvas.width), (theArea.getY()-theArea.getSize()/2)*(image.height/ctx.canvas.height), theArea.getSize()*(image.width/ctx.canvas.width), theArea.getSize()*(image.height/ctx.canvas.height), 0, 0, resImgSize, resImgSize)
      }
      if (resImgQuality!==null ){
        return temp_canvas.toDataURL(resImgFormat, resImgQuality)
      }
      return temp_canvas.toDataURL(resImgFormat)
    }

    this.setNewImageSource = (imageSource) => {
      image=null
      resetCropHost()
      events.trigger('image-updated')
      if(!!imageSource) {
        let newImage = new Image()
        if(imageSource.substring(0,4).toLowerCase()==='http') {
          newImage.crossOrigin = 'anonymous'
        }
        newImage.onload = () => {
          events.trigger('load-done')

          cropEXIF.getData(newImage, () => {
            let orientation=cropEXIF.getTag(newImage,'Orientation')

            if([3,6,8].indexOf(orientation)>-1) {
              let canvas = document.createElement("canvas"),
                  ctx=canvas.getContext("2d"),
                  cw = newImage.width, ch = newImage.height, cx = 0, cy = 0, deg=0
              switch(orientation) {
                case 3:
                  cx=-newImage.width
                  cy=-newImage.height
                  deg=180
                  break
                case 6:
                  cw = newImage.height
                  ch = newImage.width
                  cy=-newImage.height
                  deg=90
                  break
                case 8:
                  cw = newImage.height
                  ch = newImage.width
                  cx=-newImage.width
                  deg=270
                  break
              }

              canvas.width = cw
              canvas.height = ch
              ctx.rotate(deg*Math.PI/180)
              ctx.drawImage(newImage, cx, cy)

              image=new Image()
              image.src = canvas.toDataURL("image/png")
            } else {
              image=newImage
            }
            resetCropHost()
            events.trigger('image-updated')
          })
        }
        newImage.onerror = () => {
          events.trigger('load-error')
        }
        events.trigger('load-start')
        newImage.src=imageSource
      }
    }

    this.setMaxDimensions = (width, height) => {
      maxCanvasDims=[width,height]

      if(image!==null) {
        let curWidth=ctx.canvas.width,
            curHeight=ctx.canvas.height

        let imageDims=[image.width, image.height],
            imageRatio=image.width/image.height,
            canvasDims=imageDims

        if(canvasDims[0]>maxCanvasDims[0]) {
          canvasDims[0]=maxCanvasDims[0]
          canvasDims[1]=canvasDims[0]/imageRatio
        } else if(canvasDims[0]<minCanvasDims[0]) {
          canvasDims[0]=minCanvasDims[0]
          canvasDims[1]=canvasDims[0]/imageRatio
        }
        if(canvasDims[1]>maxCanvasDims[1]) {
          canvasDims[1]=maxCanvasDims[1]
          canvasDims[0]=canvasDims[1]*imageRatio
        } else if(canvasDims[1]<minCanvasDims[1]) {
          canvasDims[1]=minCanvasDims[1]
          canvasDims[0]=canvasDims[1]*imageRatio
        }
        elCanvas.prop('width',canvasDims[0]).prop('height',canvasDims[1]).css({'margin-left': -canvasDims[0]/2+'px', 'margin-top': -canvasDims[1]/2+'px'})

        let ratioNewCurWidth=ctx.canvas.width/curWidth,
            ratioNewCurHeight=ctx.canvas.height/curHeight,
            ratioMin=Math.min(ratioNewCurWidth, ratioNewCurHeight)

        theArea.setX(theArea.getX()*ratioNewCurWidth)
        theArea.setY(theArea.getY()*ratioNewCurHeight)
        theArea.setSize(theArea.getSize()*ratioMin)
      } else {
        elCanvas.prop('width',0).prop('height',0).css({'margin-top': 0})
      }

      drawScene()

    }

    this.setAreaMinSize = (size) => {
      size=parseInt(size,10)
      if(!isNaN(size)) {
        theArea.setMinSize(size)
        drawScene()
      }
    }

    this.setResultImageSize = (size) => {
      size=parseInt(size,10)
      if(!isNaN(size)) {
        resImgSize=size
      }
    }

    this.setResultImageFormat = (format) => {
      resImgFormat = format
    }

    this.setResultImageQuality = (quality) => {
      quality = parseFloat(quality)
      if (!isNaN(quality) && quality>=0 && quality<=1){
        resImgQuality = quality
      }
    }

    this.setAreaType = (type) => {
      let curSize=theArea.getSize(),
          curMinSize=theArea.getMinSize(),
          curX=theArea.getX(),
          curY=theArea.getY()

      let AreaClass=CropAreaCircle
      if(type==='square') {
        AreaClass=CropAreaSquare
      }
      theArea = new AreaClass(ctx, events)
      theArea.setMinSize(curMinSize)
      theArea.setSize(curSize)
      theArea.setX(curX)
      theArea.setY(curY)

      // resetCropHost()
      if(image!==null) {
        theArea.setImage(image)
      }

      drawScene()
    }

    /* Life Cycle begins */

    // Init Context let
    ctx = elCanvas[0].getContext('2d')

    // Init CropArea
    theArea = new CropAreaCircle(ctx, events)

    // Init Mouse Event Listeners
    $document.on('mousemove',onMouseMove)
    elCanvas.on('mousedown',onMouseDown)
    $document.on('mouseup',onMouseUp)

    // Init Touch Event Listeners
    $document.on('touchmove',onMouseMove)
    elCanvas.on('touchstart',onMouseDown)
    $document.on('touchend',onMouseUp)

    // CropHost Destructor
    this.destroy = () => {
      $document.off('mousemove',onMouseMove)
      elCanvas.off('mousedown',onMouseDown)
      $document.off('mouseup',onMouseMove)

      $document.off('touchmove',onMouseMove)
      elCanvas.off('touchstart',onMouseDown)
      $document.off('touchend',onMouseMove)

      elCanvas.remove()
    }
  }

}])
