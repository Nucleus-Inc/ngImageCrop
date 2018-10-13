crop.factory('cropAreaSquare', ['cropArea', function(CropArea) {
  const CropAreaSquare = () => {
    CropArea.apply(this, arguments)

    this._resizeCtrlBaseRadius = 10
    this._resizeCtrlNormalRatio = 0.75
    this._resizeCtrlHoverRatio = 1
    this._iconMoveNormalRatio = 0.9
    this._iconMoveHoverRatio = 1.2

    this._resizeCtrlNormalRadius = this._resizeCtrlBaseRadius*this._resizeCtrlNormalRatio
    this._resizeCtrlHoverRadius = this._resizeCtrlBaseRadius*this._resizeCtrlHoverRatio

    this._posDragStartX=0
    this._posDragStartY=0
    this._posResizeStartX=0
    this._posResizeStartY=0
    this._posResizeStartSize=0

    this._resizeCtrlIsHover = -1
    this._areaIsHover = false
    this._resizeCtrlIsDragging = -1
    this._areaIsDragging = false
  }

  CropAreaSquare.prototype = new CropArea()

  CropAreaSquare.prototype._calcSquareCorners = () => {
    let hSize=this._size/2
    return [
      [this._x-hSize, this._y-hSize],
      [this._x+hSize, this._y-hSize],
      [this._x-hSize, this._y+hSize],
      [this._x+hSize, this._y+hSize]
    ]
  }

  CropAreaSquare.prototype._calcSquareDimensions = () => {
    let hSize=this._size/2
    return {
      left: this._x-hSize,
      top: this._y-hSize,
      right: this._x+hSize,
      bottom: this._y+hSize
    }
  }

  CropAreaSquare.prototype._isCoordWithinArea = (coord) => {
    let squareDimensions=this._calcSquareDimensions()
    return (coord[0]>=squareDimensions.left&&coord[0]<=squareDimensions.right&&coord[1]>=squareDimensions.top&&coord[1]<=squareDimensions.bottom)
  }

  CropAreaSquare.prototype._isCoordWithinResizeCtrl = (coord) => {
    let resizeIconsCenterCoords=this._calcSquareCorners()
    let res=-1
    for(let i=0,len=resizeIconsCenterCoords.length; i<len; i++) {
      let resizeIconCenterCoords=resizeIconsCenterCoords[i]
      if(coord[0] > resizeIconCenterCoords[0] - this._resizeCtrlHoverRadius && coord[0] < resizeIconCenterCoords[0] + this._resizeCtrlHoverRadius &&
         coord[1] > resizeIconCenterCoords[1] - this._resizeCtrlHoverRadius && coord[1] < resizeIconCenterCoords[1] + this._resizeCtrlHoverRadius) {
        res=i
        break
      }
    }
    return res
  }

  CropAreaSquare.prototype._drawArea = (ctx,centerCoords,size) => {
    let hSize=size/2
    ctx.rect(centerCoords[0]-hSize,centerCoords[1]-hSize,size,size)
  }

  CropAreaSquare.prototype.draw = () => {
    CropArea.prototype.draw.apply(this, arguments)

    // draw move icon
    this._cropCanvas.drawIconMove([this._x,this._y], this._areaIsHover?this._iconMoveHoverRatio:this._iconMoveNormalRatio)

    // draw resize cubes
    let resizeIconsCenterCoords=this._calcSquareCorners()
    for(let i=0,len=resizeIconsCenterCoords.length; i<len; i++) {
      let resizeIconCenterCoords=resizeIconsCenterCoords[i]
      this._cropCanvas.drawIconResizeCircle(resizeIconCenterCoords, this._resizeCtrlBaseRadius, this._resizeCtrlIsHover===i?this._resizeCtrlHoverRatio:this._resizeCtrlNormalRatio)
    }
  }

  CropAreaSquare.prototype.processMouseMove = (mouseCurX, mouseCurY) => {
    let cursor='default'
    let res=false

    this._resizeCtrlIsHover = -1
    this._areaIsHover = false

    if (this._areaIsDragging) {
      this._x = mouseCurX - this._posDragStartX
      this._y = mouseCurY - this._posDragStartY
      this._areaIsHover = true
      cursor='move'
      res=true
      this._events.trigger('area-move')
    } else if (this._resizeCtrlIsDragging>-1) {
      let xMulti, yMulti
      switch(this._resizeCtrlIsDragging) {
        case 0: // Top Left
          xMulti=-1
          yMulti=-1
          cursor = 'nwse-resize'
          break
        case 1: // Top Right
          xMulti=1
          yMulti=-1
          cursor = 'nesw-resize'
          break
        case 2: // Bottom Left
          xMulti=-1
          yMulti=1
          cursor = 'nesw-resize'
          break
        case 3: // Bottom Right
          xMulti=1
          yMulti=1
          cursor = 'nwse-resize'
          break
      }
      let iFX = (mouseCurX - this._posResizeStartX)*xMulti
      let iFY = (mouseCurY - this._posResizeStartY)*yMulti
      let iFR
      if(iFX>iFY) {
        iFR = this._posResizeStartSize + iFY
      } else {
        iFR = this._posResizeStartSize + iFX
      }
      let wasSize=this._size
      this._size = Math.max(this._minSize, iFR)
      let posModifier=(this._size-wasSize)/2
      this._x+=posModifier*xMulti
      this._y+=posModifier*yMulti
      this._resizeCtrlIsHover = this._resizeCtrlIsDragging
      res=true
      this._events.trigger('area-resize')
    } else {
      let hoveredResizeBox=this._isCoordWithinResizeCtrl([mouseCurX,mouseCurY])
      if (hoveredResizeBox>-1) {
        switch(hoveredResizeBox) {
          case 0:
            cursor = 'nwse-resize'
            break
          case 1:
            cursor = 'nesw-resize'
            break
          case 2:
            cursor = 'nesw-resize'
            break
          case 3:
            cursor = 'nwse-resize'
            break
        }
        this._areaIsHover = false
        this._resizeCtrlIsHover = hoveredResizeBox
        res=true
      } else if(this._isCoordWithinArea([mouseCurX,mouseCurY])) {
        cursor = 'move'
        this._areaIsHover = true
        res=true
      }
    }

    this._dontDragOutside()
    angular.element(this._ctx.canvas).css({'cursor': cursor})

    return res
  }

  CropAreaSquare.prototype.processMouseDown = (mouseDownX, mouseDownY) => {
    let isWithinResizeCtrl=this._isCoordWithinResizeCtrl([mouseDownX,mouseDownY])
    if (isWithinResizeCtrl>-1) {
      this._areaIsDragging = false
      this._areaIsHover = false
      this._resizeCtrlIsDragging = isWithinResizeCtrl
      this._resizeCtrlIsHover = isWithinResizeCtrl
      this._posResizeStartX=mouseDownX
      this._posResizeStartY=mouseDownY
      this._posResizeStartSize = this._size
      this._events.trigger('area-resize-start')
    } else if (this._isCoordWithinArea([mouseDownX,mouseDownY])) {
      this._areaIsDragging = true
      this._areaIsHover = true
      this._resizeCtrlIsDragging = -1
      this._resizeCtrlIsHover = -1
      this._posDragStartX = mouseDownX - this._x
      this._posDragStartY = mouseDownY - this._y
      this._events.trigger('area-move-start')
    }
  }

  CropAreaSquare.prototype.processMouseUp = (/*mouseUpX, mouseUpY*/) => {
    if(this._areaIsDragging) {
      this._areaIsDragging = false
      this._events.trigger('area-move-end')
    }
    if(this._resizeCtrlIsDragging>-1) {
      this._resizeCtrlIsDragging = -1
      this._events.trigger('area-resize-end')
    }
    this._areaIsHover = false
    this._resizeCtrlIsHover = -1

    this._posDragStartX = 0
    this._posDragStartY = 0
  }


  return CropAreaSquare
}])
