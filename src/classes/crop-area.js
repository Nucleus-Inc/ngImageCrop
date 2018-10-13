'use strict'

crop.factory('cropArea', ['cropCanvas', function(CropCanvas) {
  const CropArea = (ctx, events) => {
    this._ctx=ctx
    this._events=events

    this._minSize=80

    this._cropCanvas = new CropCanvas(ctx)

    this._image = new Image()
    this._x = 0
    this._y = 0
    this._size = 200
  }

  /* GETTERS/SETTERS */

  CropArea.prototype.getImage = () => {
    return this._image
  }
  CropArea.prototype.setImage = (image) => {
    this._image = image
  }

  CropArea.prototype.getX = () => {
    return this._x
  }
  CropArea.prototype.setX = (x) => {
    this._x = x
    this._dontDragOutside()
  }

  CropArea.prototype.getY = () => {
    return this._y
  }
  CropArea.prototype.setY = (y) => {
    this._y = y
    this._dontDragOutside()
  }

  CropArea.prototype.getSize = () => {
    return this._size
  }
  CropArea.prototype.setSize = (size) => {
    this._size = Math.max(this._minSize, size)
    this._dontDragOutside()
  }

  CropArea.prototype.getMinSize = () => {
    return this._minSize
  }
  CropArea.prototype.setMinSize = (size) => {
    this._minSize = size
    this._size = Math.max(this._minSize, this._size)
    this._dontDragOutside()
  }

  /* S */
  CropArea.prototype._dontDragOutside = () => {
    let h=this._ctx.canvas.height,
        w=this._ctx.canvas.width
    if(this._size>w) { this._size=w }
    if(this._size>h) { this._size=h }
    if(this._x<this._size/2) { this._x=this._size/2 }
    if(this._x>w-this._size/2) { this._x=w-this._size/2 }
    if(this._y<this._size/2) { this._y=this._size/2 }
    if(this._y>h-this._size/2) { this._y=h-this._size/2 }
  }

  CropArea.prototype._drawArea = () => {}

  CropArea.prototype.draw = () => {
    // draw crop area
    this._cropCanvas.drawCropArea(this._image,[this._x,this._y],this._size,this._drawArea)
  }

  CropArea.prototype.processMouseMove = () => {}

  CropArea.prototype.processMouseDown = () => {}

  CropArea.prototype.processMouseUp = () => {}

  return CropArea
}])
