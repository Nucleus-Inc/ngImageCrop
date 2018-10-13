(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['exports', 'angular'], factory);
    } else if (typeof exports === 'object') {
        factory(exports, require('angular'));
    } else {
        factory((root.ngImageCrop = {}), root.angular);
    }
}(this, function (exports, angular) {
'use strict';

var _typeof2 = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var crop = angular.module('ngImgCrop', []);
'use strict';

crop.directive('imgCrop', ['$timeout', 'cropHost', 'cropPubSub', function ($timeout, CropHost, CropPubSub) {
  return {
    restrict: 'E',
    scope: {
      image: '=',
      resultImage: '=',

      changeOnFly: '=',
      areaType: '@',
      areaMinSize: '=',
      resultImageSize: '=',
      resultImageFormat: '@',
      resultImageQuality: '=',

      onChange: '&',
      onLoadBegin: '&',
      onLoadDone: '&',
      onLoadError: '&'
    },
    template: '<canvas></canvas>',
    controller: ['$scope', function ($scope) {
      $scope.events = new CropPubSub();
    }],
    link: function link(scope, element /*, attrs*/) {
      // Init Events Manager
      var events = scope.events;

      // Init Crop Host
      var cropHost = new CropHost(element.find('canvas'), {}, events);

      // Store Result Image to check if it's changed
      var storedResultImage = void 0;

      var updateResultImage = function updateResultImage(scope) {
        var resultImage = cropHost.getResultImageDataURI();
        if (storedResultImage !== resultImage) {
          storedResultImage = resultImage;
          if (angular.isDefined(scope.resultImage)) scope.resultImage = resultImage;
          scope.onChange({ $dataURI: scope.resultImage });
        }
      };

      // Wrapper to safely exec functions within $apply on a running $digest cycle
      var fnSafeApply = function fnSafeApply(fn) {
        return function () {
          $timeout(function () {
            scope.$apply(function (scope) {
              fn(scope);
            });
          });
        };
      };

      // Setup CropHost Event Handlers
      events.on('load-start', fnSafeApply(function (scope) {
        scope.onLoadBegin({});
      })).on('load-done', fnSafeApply(function (scope) {
        scope.onLoadDone({});
      })).on('load-error', fnSafeApply(function (scope) {
        scope.onLoadError({});
      })).on('area-move area-resize', fnSafeApply(function (scope) {
        if (!!scope.changeOnFly) updateResultImage(scope);
      })).on('area-move-end area-resize-end image-updated', fnSafeApply(function (scope) {
        updateResultImage(scope);
      }));

      // Sync CropHost with Directive's options
      scope.$watch('image', function () {
        cropHost.setNewImageSource(scope.image);
      });
      scope.$watch('areaType', function () {
        cropHost.setAreaType(scope.areaType);
        updateResultImage(scope);
      });
      scope.$watch('areaMinSize', function () {
        cropHost.setAreaMinSize(scope.areaMinSize);
        updateResultImage(scope);
      });
      scope.$watch('resultImageSize', function () {
        cropHost.setResultImageSize(scope.resultImageSize);
        updateResultImage(scope);
      });
      scope.$watch('resultImageFormat', function () {
        cropHost.setResultImageFormat(scope.resultImageFormat);
        updateResultImage(scope);
      });
      scope.$watch('resultImageQuality', function () {
        cropHost.setResultImageQuality(scope.resultImageQuality);
        updateResultImage(scope);
      });

      // Update CropHost dimensions when the directive element is resized
      scope.$watch(function () {
        return [element[0].clientWidth, element[0].clientHeight];
      }, function (value) {
        cropHost.setMaxDimensions(value[0], value[1]);
        updateResultImage(scope);
      }, true);

      // Destroy CropHost Instance when the directive is destroying
      scope.$on('$destroy', function () {
        cropHost.destroy();
      });
    }
  };
}]);
'use strict';

crop.factory('cropAreaCircle', ['cropArea', function (CropArea) {
  var _this = this,
      _arguments = arguments;

  var CropAreaCircle = function CropAreaCircle() {
    CropArea.apply(_this, _arguments);

    _this._boxResizeBaseSize = 20;
    _this._boxResizeNormalRatio = 0.9;
    _this._boxResizeHoverRatio = 1.2;
    _this._iconMoveNormalRatio = 0.9;
    _this._iconMoveHoverRatio = 1.2;

    _this._boxResizeNormalSize = _this._boxResizeBaseSize * _this._boxResizeNormalRatio;
    _this._boxResizeHoverSize = _this._boxResizeBaseSize * _this._boxResizeHoverRatio;

    _this._posDragStartX = 0;
    _this._posDragStartY = 0;
    _this._posResizeStartX = 0;
    _this._posResizeStartY = 0;
    _this._posResizeStartSize = 0;

    _this._boxResizeIsHover = false;
    _this._areaIsHover = false;
    _this._boxResizeIsDragging = false;
    _this._areaIsDragging = false;
  };

  CropAreaCircle.prototype = new CropArea();

  CropAreaCircle.prototype._calcCirclePerimeterCoords = function (angleDegrees) {
    var hSize = _this._size / 2;
    var angleRadians = angleDegrees * (Math.PI / 180),
        circlePerimeterX = _this._x + hSize * Math.cos(angleRadians),
        circlePerimeterY = _this._y + hSize * Math.sin(angleRadians);
    return [circlePerimeterX, circlePerimeterY];
  };

  CropAreaCircle.prototype._calcResizeIconCenterCoords = function () {
    return _this._calcCirclePerimeterCoords(-45);
  };

  CropAreaCircle.prototype._isCoordWithinArea = function (coord) {
    return Math.sqrt((coord[0] - _this._x) * (coord[0] - _this._x) + (coord[1] - _this._y) * (coord[1] - _this._y)) < _this._size / 2;
  };
  CropAreaCircle.prototype._isCoordWithinBoxResize = function (coord) {
    var resizeIconCenterCoords = _this._calcResizeIconCenterCoords();
    var hSize = _this._boxResizeHoverSize / 2;
    return coord[0] > resizeIconCenterCoords[0] - hSize && coord[0] < resizeIconCenterCoords[0] + hSize && coord[1] > resizeIconCenterCoords[1] - hSize && coord[1] < resizeIconCenterCoords[1] + hSize;
  };

  CropAreaCircle.prototype._drawArea = function (ctx, centerCoords, size) {
    ctx.arc(centerCoords[0], centerCoords[1], size / 2, 0, 2 * Math.PI);
  };

  CropAreaCircle.prototype.draw = function () {
    CropArea.prototype.draw.apply(_this, _arguments);

    // draw move icon
    _this._cropCanvas.drawIconMove([_this._x, _this._y], _this._areaIsHover ? _this._iconMoveHoverRatio : _this._iconMoveNormalRatio);

    // draw resize cubes
    _this._cropCanvas.drawIconResizeBoxNESW(_this._calcResizeIconCenterCoords(), _this._boxResizeBaseSize, _this._boxResizeIsHover ? _this._boxResizeHoverRatio : _this._boxResizeNormalRatio);
  };

  CropAreaCircle.prototype.processMouseMove = function (mouseCurX, mouseCurY) {
    var cursor = 'default';
    var res = false;

    _this._boxResizeIsHover = false;
    _this._areaIsHover = false;

    if (_this._areaIsDragging) {
      _this._x = mouseCurX - _this._posDragStartX;
      _this._y = mouseCurY - _this._posDragStartY;
      _this._areaIsHover = true;
      cursor = 'move';
      res = true;
      _this._events.trigger('area-move');
    } else if (_this._boxResizeIsDragging) {
      cursor = 'nesw-resize';
      var iFR = void 0,
          iFX = void 0,
          iFY = void 0;
      iFX = mouseCurX - _this._posResizeStartX;
      iFY = _this._posResizeStartY - mouseCurY;
      if (iFX > iFY) {
        iFR = _this._posResizeStartSize + iFY * 2;
      } else {
        iFR = _this._posResizeStartSize + iFX * 2;
      }

      _this._size = Math.max(_this._minSize, iFR);
      _this._boxResizeIsHover = true;
      res = true;
      _this._events.trigger('area-resize');
    } else if (_this._isCoordWithinBoxResize([mouseCurX, mouseCurY])) {
      cursor = 'nesw-resize';
      _this._areaIsHover = false;
      _this._boxResizeIsHover = true;
      res = true;
    } else if (_this._isCoordWithinArea([mouseCurX, mouseCurY])) {
      cursor = 'move';
      _this._areaIsHover = true;
      res = true;
    }

    _this._dontDragOutside();
    angular.element(_this._ctx.canvas).css({ 'cursor': cursor });

    return res;
  };

  CropAreaCircle.prototype.processMouseDown = function (mouseDownX, mouseDownY) {
    if (_this._isCoordWithinBoxResize([mouseDownX, mouseDownY])) {
      _this._areaIsDragging = false;
      _this._areaIsHover = false;
      _this._boxResizeIsDragging = true;
      _this._boxResizeIsHover = true;
      _this._posResizeStartX = mouseDownX;
      _this._posResizeStartY = mouseDownY;
      _this._posResizeStartSize = _this._size;
      _this._events.trigger('area-resize-start');
    } else if (_this._isCoordWithinArea([mouseDownX, mouseDownY])) {
      _this._areaIsDragging = true;
      _this._areaIsHover = true;
      _this._boxResizeIsDragging = false;
      _this._boxResizeIsHover = false;
      _this._posDragStartX = mouseDownX - _this._x;
      _this._posDragStartY = mouseDownY - _this._y;
      _this._events.trigger('area-move-start');
    }
  };

  CropAreaCircle.prototype.processMouseUp = function () /*mouseUpX, mouseUpY*/{
    if (_this._areaIsDragging) {
      _this._areaIsDragging = false;
      _this._events.trigger('area-move-end');
    }
    if (_this._boxResizeIsDragging) {
      _this._boxResizeIsDragging = false;
      _this._events.trigger('area-resize-end');
    }
    _this._areaIsHover = false;
    _this._boxResizeIsHover = false;

    _this._posDragStartX = 0;
    _this._posDragStartY = 0;
  };

  return CropAreaCircle;
}]);
'use strict';

crop.factory('cropAreaSquare', ['cropArea', function (CropArea) {
  var _this = this,
      _arguments = arguments;

  var CropAreaSquare = function CropAreaSquare() {
    CropArea.apply(_this, _arguments);

    _this._resizeCtrlBaseRadius = 10;
    _this._resizeCtrlNormalRatio = 0.75;
    _this._resizeCtrlHoverRatio = 1;
    _this._iconMoveNormalRatio = 0.9;
    _this._iconMoveHoverRatio = 1.2;

    _this._resizeCtrlNormalRadius = _this._resizeCtrlBaseRadius * _this._resizeCtrlNormalRatio;
    _this._resizeCtrlHoverRadius = _this._resizeCtrlBaseRadius * _this._resizeCtrlHoverRatio;

    _this._posDragStartX = 0;
    _this._posDragStartY = 0;
    _this._posResizeStartX = 0;
    _this._posResizeStartY = 0;
    _this._posResizeStartSize = 0;

    _this._resizeCtrlIsHover = -1;
    _this._areaIsHover = false;
    _this._resizeCtrlIsDragging = -1;
    _this._areaIsDragging = false;
  };

  CropAreaSquare.prototype = new CropArea();

  CropAreaSquare.prototype._calcSquareCorners = function () {
    var hSize = _this._size / 2;
    return [[_this._x - hSize, _this._y - hSize], [_this._x + hSize, _this._y - hSize], [_this._x - hSize, _this._y + hSize], [_this._x + hSize, _this._y + hSize]];
  };

  CropAreaSquare.prototype._calcSquareDimensions = function () {
    var hSize = _this._size / 2;
    return {
      left: _this._x - hSize,
      top: _this._y - hSize,
      right: _this._x + hSize,
      bottom: _this._y + hSize
    };
  };

  CropAreaSquare.prototype._isCoordWithinArea = function (coord) {
    var squareDimensions = _this._calcSquareDimensions();
    return coord[0] >= squareDimensions.left && coord[0] <= squareDimensions.right && coord[1] >= squareDimensions.top && coord[1] <= squareDimensions.bottom;
  };

  CropAreaSquare.prototype._isCoordWithinResizeCtrl = function (coord) {
    var resizeIconsCenterCoords = _this._calcSquareCorners();
    var res = -1;
    for (var i = 0, len = resizeIconsCenterCoords.length; i < len; i++) {
      var resizeIconCenterCoords = resizeIconsCenterCoords[i];
      if (coord[0] > resizeIconCenterCoords[0] - _this._resizeCtrlHoverRadius && coord[0] < resizeIconCenterCoords[0] + _this._resizeCtrlHoverRadius && coord[1] > resizeIconCenterCoords[1] - _this._resizeCtrlHoverRadius && coord[1] < resizeIconCenterCoords[1] + _this._resizeCtrlHoverRadius) {
        res = i;
        break;
      }
    }
    return res;
  };

  CropAreaSquare.prototype._drawArea = function (ctx, centerCoords, size) {
    var hSize = size / 2;
    ctx.rect(centerCoords[0] - hSize, centerCoords[1] - hSize, size, size);
  };

  CropAreaSquare.prototype.draw = function () {
    CropArea.prototype.draw.apply(_this, _arguments);

    // draw move icon
    _this._cropCanvas.drawIconMove([_this._x, _this._y], _this._areaIsHover ? _this._iconMoveHoverRatio : _this._iconMoveNormalRatio);

    // draw resize cubes
    var resizeIconsCenterCoords = _this._calcSquareCorners();
    for (var i = 0, len = resizeIconsCenterCoords.length; i < len; i++) {
      var resizeIconCenterCoords = resizeIconsCenterCoords[i];
      _this._cropCanvas.drawIconResizeCircle(resizeIconCenterCoords, _this._resizeCtrlBaseRadius, _this._resizeCtrlIsHover === i ? _this._resizeCtrlHoverRatio : _this._resizeCtrlNormalRatio);
    }
  };

  CropAreaSquare.prototype.processMouseMove = function (mouseCurX, mouseCurY) {
    var cursor = 'default';
    var res = false;

    _this._resizeCtrlIsHover = -1;
    _this._areaIsHover = false;

    if (_this._areaIsDragging) {
      _this._x = mouseCurX - _this._posDragStartX;
      _this._y = mouseCurY - _this._posDragStartY;
      _this._areaIsHover = true;
      cursor = 'move';
      res = true;
      _this._events.trigger('area-move');
    } else if (_this._resizeCtrlIsDragging > -1) {
      var xMulti = void 0,
          yMulti = void 0;
      switch (_this._resizeCtrlIsDragging) {
        case 0:
          // Top Left
          xMulti = -1;
          yMulti = -1;
          cursor = 'nwse-resize';
          break;
        case 1:
          // Top Right
          xMulti = 1;
          yMulti = -1;
          cursor = 'nesw-resize';
          break;
        case 2:
          // Bottom Left
          xMulti = -1;
          yMulti = 1;
          cursor = 'nesw-resize';
          break;
        case 3:
          // Bottom Right
          xMulti = 1;
          yMulti = 1;
          cursor = 'nwse-resize';
          break;
      }
      var iFX = (mouseCurX - _this._posResizeStartX) * xMulti;
      var iFY = (mouseCurY - _this._posResizeStartY) * yMulti;
      var iFR = void 0;
      if (iFX > iFY) {
        iFR = _this._posResizeStartSize + iFY;
      } else {
        iFR = _this._posResizeStartSize + iFX;
      }
      var wasSize = _this._size;
      _this._size = Math.max(_this._minSize, iFR);
      var posModifier = (_this._size - wasSize) / 2;
      _this._x += posModifier * xMulti;
      _this._y += posModifier * yMulti;
      _this._resizeCtrlIsHover = _this._resizeCtrlIsDragging;
      res = true;
      _this._events.trigger('area-resize');
    } else {
      var hoveredResizeBox = _this._isCoordWithinResizeCtrl([mouseCurX, mouseCurY]);
      if (hoveredResizeBox > -1) {
        switch (hoveredResizeBox) {
          case 0:
            cursor = 'nwse-resize';
            break;
          case 1:
            cursor = 'nesw-resize';
            break;
          case 2:
            cursor = 'nesw-resize';
            break;
          case 3:
            cursor = 'nwse-resize';
            break;
        }
        _this._areaIsHover = false;
        _this._resizeCtrlIsHover = hoveredResizeBox;
        res = true;
      } else if (_this._isCoordWithinArea([mouseCurX, mouseCurY])) {
        cursor = 'move';
        _this._areaIsHover = true;
        res = true;
      }
    }

    _this._dontDragOutside();
    angular.element(_this._ctx.canvas).css({ 'cursor': cursor });

    return res;
  };

  CropAreaSquare.prototype.processMouseDown = function (mouseDownX, mouseDownY) {
    var isWithinResizeCtrl = _this._isCoordWithinResizeCtrl([mouseDownX, mouseDownY]);
    if (isWithinResizeCtrl > -1) {
      _this._areaIsDragging = false;
      _this._areaIsHover = false;
      _this._resizeCtrlIsDragging = isWithinResizeCtrl;
      _this._resizeCtrlIsHover = isWithinResizeCtrl;
      _this._posResizeStartX = mouseDownX;
      _this._posResizeStartY = mouseDownY;
      _this._posResizeStartSize = _this._size;
      _this._events.trigger('area-resize-start');
    } else if (_this._isCoordWithinArea([mouseDownX, mouseDownY])) {
      _this._areaIsDragging = true;
      _this._areaIsHover = true;
      _this._resizeCtrlIsDragging = -1;
      _this._resizeCtrlIsHover = -1;
      _this._posDragStartX = mouseDownX - _this._x;
      _this._posDragStartY = mouseDownY - _this._y;
      _this._events.trigger('area-move-start');
    }
  };

  CropAreaSquare.prototype.processMouseUp = function () /*mouseUpX, mouseUpY*/{
    if (_this._areaIsDragging) {
      _this._areaIsDragging = false;
      _this._events.trigger('area-move-end');
    }
    if (_this._resizeCtrlIsDragging > -1) {
      _this._resizeCtrlIsDragging = -1;
      _this._events.trigger('area-resize-end');
    }
    _this._areaIsHover = false;
    _this._resizeCtrlIsHover = -1;

    _this._posDragStartX = 0;
    _this._posDragStartY = 0;
  };

  return CropAreaSquare;
}]);
'use strict';

crop.factory('cropArea', ['cropCanvas', function (CropCanvas) {
  var _this = this;

  var CropArea = function CropArea(ctx, events) {
    _this._ctx = ctx;
    _this._events = events;

    _this._minSize = 80;

    _this._cropCanvas = new CropCanvas(ctx);

    _this._image = new Image();
    _this._x = 0;
    _this._y = 0;
    _this._size = 200;
  };

  /* GETTERS/SETTERS */

  CropArea.prototype.getImage = function () {
    return _this._image;
  };
  CropArea.prototype.setImage = function (image) {
    _this._image = image;
  };

  CropArea.prototype.getX = function () {
    return _this._x;
  };
  CropArea.prototype.setX = function (x) {
    _this._x = x;
    _this._dontDragOutside();
  };

  CropArea.prototype.getY = function () {
    return _this._y;
  };
  CropArea.prototype.setY = function (y) {
    _this._y = y;
    _this._dontDragOutside();
  };

  CropArea.prototype.getSize = function () {
    return _this._size;
  };
  CropArea.prototype.setSize = function (size) {
    _this._size = Math.max(_this._minSize, size);
    _this._dontDragOutside();
  };

  CropArea.prototype.getMinSize = function () {
    return _this._minSize;
  };
  CropArea.prototype.setMinSize = function (size) {
    _this._minSize = size;
    _this._size = Math.max(_this._minSize, _this._size);
    _this._dontDragOutside();
  };

  /* S */
  CropArea.prototype._dontDragOutside = function () {
    var h = _this._ctx.canvas.height,
        w = _this._ctx.canvas.width;
    if (_this._size > w) {
      _this._size = w;
    }
    if (_this._size > h) {
      _this._size = h;
    }
    if (_this._x < _this._size / 2) {
      _this._x = _this._size / 2;
    }
    if (_this._x > w - _this._size / 2) {
      _this._x = w - _this._size / 2;
    }
    if (_this._y < _this._size / 2) {
      _this._y = _this._size / 2;
    }
    if (_this._y > h - _this._size / 2) {
      _this._y = h - _this._size / 2;
    }
  };

  CropArea.prototype._drawArea = function () {};

  CropArea.prototype.draw = function () {
    // draw crop area
    _this._cropCanvas.drawCropArea(_this._image, [_this._x, _this._y], _this._size, _this._drawArea);
  };

  CropArea.prototype.processMouseMove = function () {};

  CropArea.prototype.processMouseDown = function () {};

  CropArea.prototype.processMouseUp = function () {};

  return CropArea;
}]);
'use strict';

crop.factory('cropCanvas', [function () {
  var _this = this;

  // Shape = Array of [x,y] [0, 0] - center
  var shapeArrowNW = [[-0.5, -2], [-3, -4.5], [-0.5, -7], [-7, -7], [-7, -0.5], [-4.5, -3], [-2, -0.5]];
  var shapeArrowNE = [[0.5, -2], [3, -4.5], [0.5, -7], [7, -7], [7, -0.5], [4.5, -3], [2, -0.5]];
  var shapeArrowSW = [[-0.5, 2], [-3, 4.5], [-0.5, 7], [-7, 7], [-7, 0.5], [-4.5, 3], [-2, 0.5]];
  var shapeArrowSE = [[0.5, 2], [3, 4.5], [0.5, 7], [7, 7], [7, 0.5], [4.5, 3], [2, 0.5]];
  var shapeArrowN = [[-1.5, -2.5], [-1.5, -6], [-5, -6], [0, -11], [5, -6], [1.5, -6], [1.5, -2.5]];
  var shapeArrowW = [[-2.5, -1.5], [-6, -1.5], [-6, -5], [-11, 0], [-6, 5], [-6, 1.5], [-2.5, 1.5]];
  var shapeArrowS = [[-1.5, 2.5], [-1.5, 6], [-5, 6], [0, 11], [5, 6], [1.5, 6], [1.5, 2.5]];
  var shapeArrowE = [[2.5, -1.5], [6, -1.5], [6, -5], [11, 0], [6, 5], [6, 1.5], [2.5, 1.5]];

  // Colors
  var colors = {
    areaOutline: '#fff',
    resizeBoxStroke: '#fff',
    resizeBoxFill: '#444',
    resizeBoxArrowFill: '#fff',
    resizeCircleStroke: '#fff',
    resizeCircleFill: '#444',
    moveIconFill: '#fff'
  };

  return function (ctx) {

    /* Base functions */

    // Calculate Point
    var calcPoint = function calcPoint(point, offset, scale) {
      return [scale * point[0] + offset[0], scale * point[1] + offset[1]];
    };

    // Draw Filled Polygon
    var drawFilledPolygon = function drawFilledPolygon(shape, fillStyle, centerCoords, scale) {
      ctx.save();
      ctx.fillStyle = fillStyle;
      ctx.beginPath();
      var pc = void 0,
          pc0 = calcPoint(shape[0], centerCoords, scale);
      ctx.moveTo(pc0[0], pc0[1]);

      for (var p in shape) {
        if (p > 0) {
          pc = calcPoint(shape[p], centerCoords, scale);
          ctx.lineTo(pc[0], pc[1]);
        }
      }

      ctx.lineTo(pc0[0], pc0[1]);
      ctx.fill();
      ctx.closePath();
      ctx.restore();
    };

    /* Icons */

    _this.drawIconMove = function (centerCoords, scale) {
      drawFilledPolygon(shapeArrowN, colors.moveIconFill, centerCoords, scale);
      drawFilledPolygon(shapeArrowW, colors.moveIconFill, centerCoords, scale);
      drawFilledPolygon(shapeArrowS, colors.moveIconFill, centerCoords, scale);
      drawFilledPolygon(shapeArrowE, colors.moveIconFill, centerCoords, scale);
    };

    _this.drawIconResizeCircle = function (centerCoords, circleRadius, scale) {
      var scaledCircleRadius = circleRadius * scale;
      ctx.save();
      ctx.strokeStyle = colors.resizeCircleStroke;
      ctx.lineWidth = 2;
      ctx.fillStyle = colors.resizeCircleFill;
      ctx.beginPath();
      ctx.arc(centerCoords[0], centerCoords[1], scaledCircleRadius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      ctx.closePath();
      ctx.restore();
    };

    _this.drawIconResizeBoxBase = function (centerCoords, boxSize, scale) {
      var scaledBoxSize = boxSize * scale;
      ctx.save();
      ctx.strokeStyle = colors.resizeBoxStroke;
      ctx.lineWidth = 2;
      ctx.fillStyle = colors.resizeBoxFill;
      ctx.fillRect(centerCoords[0] - scaledBoxSize / 2, centerCoords[1] - scaledBoxSize / 2, scaledBoxSize, scaledBoxSize);
      ctx.strokeRect(centerCoords[0] - scaledBoxSize / 2, centerCoords[1] - scaledBoxSize / 2, scaledBoxSize, scaledBoxSize);
      ctx.restore();
    };
    _this.drawIconResizeBoxNESW = function (centerCoords, boxSize, scale) {
      _this.drawIconResizeBoxBase(centerCoords, boxSize, scale);
      drawFilledPolygon(shapeArrowNE, colors.resizeBoxArrowFill, centerCoords, scale);
      drawFilledPolygon(shapeArrowSW, colors.resizeBoxArrowFill, centerCoords, scale);
    };
    _this.drawIconResizeBoxNWSE = function (centerCoords, boxSize, scale) {
      _this.drawIconResizeBoxBase(centerCoords, boxSize, scale);
      drawFilledPolygon(shapeArrowNW, colors.resizeBoxArrowFill, centerCoords, scale);
      drawFilledPolygon(shapeArrowSE, colors.resizeBoxArrowFill, centerCoords, scale);
    };

    /* Crop Area */

    _this.drawCropArea = function (image, centerCoords, size, fnDrawClipPath) {
      var xRatio = image.width / ctx.canvas.width,
          yRatio = image.height / ctx.canvas.height,
          xLeft = centerCoords[0] - size / 2,
          yTop = centerCoords[1] - size / 2;

      ctx.save();
      ctx.strokeStyle = colors.areaOutline;
      ctx.lineWidth = 2;
      ctx.beginPath();
      fnDrawClipPath(ctx, centerCoords, size);
      ctx.stroke();
      ctx.clip();

      // draw part of original image
      if (size > 0) {
        ctx.drawImage(image, xLeft * xRatio, yTop * yRatio, size * xRatio, size * yRatio, xLeft, yTop, size, size);
      }

      ctx.beginPath();
      fnDrawClipPath(ctx, centerCoords, size);
      ctx.stroke();
      ctx.clip();

      ctx.restore();
    };
  };
}]);
"use strict";

var _typeof = typeof Symbol === "function" && _typeof2(Symbol.iterator) === "symbol" ? function (obj) {
  return typeof obj === 'undefined' ? 'undefined' : _typeof2(obj);
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj === 'undefined' ? 'undefined' : _typeof2(obj);
};

/**
 * EXIF service is based on the exif-js library (https://github.com/jseidelin/exif-js)
 */
crop.service('cropEXIF', [function () {
  var debug = false;

  var ExifTags = this.Tags = {

    // version tags
    0x9000: "ExifVersion", // EXIF version
    0xA000: "FlashpixVersion", // Flashpix format version

    // colorspace tags
    0xA001: "ColorSpace", // Color space information tag

    // image configuration
    0xA002: "PixelXDimension", // Valid width of meaningful image
    0xA003: "PixelYDimension", // Valid height of meaningful image
    0x9101: "ComponentsConfiguration", // Information about channels
    0x9102: "CompressedBitsPerPixel", // Compressed bits per pixel

    // user information
    0x927C: "MakerNote", // Any desired information written by the manufacturer
    0x9286: "UserComment", // Comments by user

    // related file
    0xA004: "RelatedSoundFile", // Name of related sound file

    // date and time
    0x9003: "DateTimeOriginal", // Date and time when the original image was generated
    0x9004: "DateTimeDigitized", // Date and time when the image was stored digitally
    0x9290: "SubsecTime", // Fractions of seconds for DateTime
    0x9291: "SubsecTimeOriginal", // Fractions of seconds for DateTimeOriginal
    0x9292: "SubsecTimeDigitized", // Fractions of seconds for DateTimeDigitized

    // picture-taking conditions
    0x829A: "ExposureTime", // Exposure time (in seconds)
    0x829D: "FNumber", // F number
    0x8822: "ExposureProgram", // Exposure program
    0x8824: "SpectralSensitivity", // Spectral sensitivity
    0x8827: "ISOSpeedRatings", // ISO speed rating
    0x8828: "OECF", // Optoelectric conversion factor
    0x9201: "ShutterSpeedValue", // Shutter speed
    0x9202: "ApertureValue", // Lens aperture
    0x9203: "BrightnessValue", // Value of brightness
    0x9204: "ExposureBias", // Exposure bias
    0x9205: "MaxApertureValue", // Smallest F number of lens
    0x9206: "SubjectDistance", // Distance to subject in meters
    0x9207: "MeteringMode", // Metering mode
    0x9208: "LightSource", // Kind of light source
    0x9209: "Flash", // Flash status
    0x9214: "SubjectArea", // Location and area of main subject
    0x920A: "FocalLength", // Focal length of the lens in mm
    0xA20B: "FlashEnergy", // Strobe energy in BCPS
    0xA20C: "SpatialFrequencyResponse", //
    0xA20E: "FocalPlaneXResolution", // Number of pixels in width direction per FocalPlaneResolutionUnit
    0xA20F: "FocalPlaneYResolution", // Number of pixels in height direction per FocalPlaneResolutionUnit
    0xA210: "FocalPlaneResolutionUnit", // Unit for measuring FocalPlaneXResolution and FocalPlaneYResolution
    0xA214: "SubjectLocation", // Location of subject in image
    0xA215: "ExposureIndex", // Exposure index selected on camera
    0xA217: "SensingMethod", // Image sensor type
    0xA300: "FileSource", // Image source (3 == DSC)
    0xA301: "SceneType", // Scene type (1 == directly photographed)
    0xA302: "CFAPattern", // Color filter array geometric pattern
    0xA401: "CustomRendered", // Special processing
    0xA402: "ExposureMode", // Exposure mode
    0xA403: "WhiteBalance", // 1 = auto white balance, 2 = manual
    0xA404: "DigitalZoomRation", // Digital zoom ratio
    0xA405: "FocalLengthIn35mmFilm", // Equivalent foacl length assuming 35mm film camera (in mm)
    0xA406: "SceneCaptureType", // Type of scene
    0xA407: "GainControl", // Degree of overall image gain adjustment
    0xA408: "Contrast", // Direction of contrast processing applied by camera
    0xA409: "Saturation", // Direction of saturation processing applied by camera
    0xA40A: "Sharpness", // Direction of sharpness processing applied by camera
    0xA40B: "DeviceSettingDescription", //
    0xA40C: "SubjectDistanceRange", // Distance to subject

    // other tags
    0xA005: "InteroperabilityIFDPointer",
    0xA420: "ImageUniqueID" // Identifier assigned uniquely to each image
  };

  var TiffTags = this.TiffTags = {
    0x0100: "ImageWidth",
    0x0101: "ImageHeight",
    0x8769: "ExifIFDPointer",
    0x8825: "GPSInfoIFDPointer",
    0xA005: "InteroperabilityIFDPointer",
    0x0102: "BitsPerSample",
    0x0103: "Compression",
    0x0106: "PhotometricInterpretation",
    0x0112: "Orientation",
    0x0115: "SamplesPerPixel",
    0x011C: "PlanarConfiguration",
    0x0212: "YCbCrSubSampling",
    0x0213: "YCbCrPositioning",
    0x011A: "XResolution",
    0x011B: "YResolution",
    0x0128: "ResolutionUnit",
    0x0111: "StripOffsets",
    0x0116: "RowsPerStrip",
    0x0117: "StripByteCounts",
    0x0201: "JPEGInterchangeFormat",
    0x0202: "JPEGInterchangeFormatLength",
    0x012D: "TransferFunction",
    0x013E: "WhitePoint",
    0x013F: "PrimaryChromaticities",
    0x0211: "YCbCrCoefficients",
    0x0214: "ReferenceBlackWhite",
    0x0132: "DateTime",
    0x010E: "ImageDescription",
    0x010F: "Make",
    0x0110: "Model",
    0x0131: "Software",
    0x013B: "Artist",
    0x8298: "Copyright"
  };

  var GPSTags = this.GPSTags = {
    0x0000: "GPSVersionID",
    0x0001: "GPSLatitudeRef",
    0x0002: "GPSLatitude",
    0x0003: "GPSLongitudeRef",
    0x0004: "GPSLongitude",
    0x0005: "GPSAltitudeRef",
    0x0006: "GPSAltitude",
    0x0007: "GPSTimeStamp",
    0x0008: "GPSSatellites",
    0x0009: "GPSStatus",
    0x000A: "GPSMeasureMode",
    0x000B: "GPSDOP",
    0x000C: "GPSSpeedRef",
    0x000D: "GPSSpeed",
    0x000E: "GPSTrackRef",
    0x000F: "GPSTrack",
    0x0010: "GPSImgDirectionRef",
    0x0011: "GPSImgDirection",
    0x0012: "GPSMapDatum",
    0x0013: "GPSDestLatitudeRef",
    0x0014: "GPSDestLatitude",
    0x0015: "GPSDestLongitudeRef",
    0x0016: "GPSDestLongitude",
    0x0017: "GPSDestBearingRef",
    0x0018: "GPSDestBearing",
    0x0019: "GPSDestDistanceRef",
    0x001A: "GPSDestDistance",
    0x001B: "GPSProcessingMethod",
    0x001C: "GPSAreaInformation",
    0x001D: "GPSDateStamp",
    0x001E: "GPSDifferential"
  };

  var StringValues = this.StringValues = {
    ExposureProgram: {
      0: "Not defined",
      1: "Manual",
      2: "Normal program",
      3: "Aperture priority",
      4: "Shutter priority",
      5: "Creative program",
      6: "Action program",
      7: "Portrait mode",
      8: "Landscape mode"
    },
    MeteringMode: {
      0: "Unknown",
      1: "Average",
      2: "CenterWeightedAverage",
      3: "Spot",
      4: "MultiSpot",
      5: "Pattern",
      6: "Partial",
      255: "Other"
    },
    LightSource: {
      0: "Unknown",
      1: "Daylight",
      2: "Fluorescent",
      3: "Tungsten (incandescent light)",
      4: "Flash",
      9: "Fine weather",
      10: "Cloudy weather",
      11: "Shade",
      12: "Daylight fluorescent (D 5700 - 7100K)",
      13: "Day white fluorescent (N 4600 - 5400K)",
      14: "Cool white fluorescent (W 3900 - 4500K)",
      15: "White fluorescent (WW 3200 - 3700K)",
      17: "Standard light A",
      18: "Standard light B",
      19: "Standard light C",
      20: "D55",
      21: "D65",
      22: "D75",
      23: "D50",
      24: "ISO studio tungsten",
      255: "Other"
    },
    Flash: {
      0x0000: "Flash did not fire",
      0x0001: "Flash fired",
      0x0005: "Strobe return light not detected",
      0x0007: "Strobe return light detected",
      0x0009: "Flash fired, compulsory flash mode",
      0x000D: "Flash fired, compulsory flash mode, return light not detected",
      0x000F: "Flash fired, compulsory flash mode, return light detected",
      0x0010: "Flash did not fire, compulsory flash mode",
      0x0018: "Flash did not fire, auto mode",
      0x0019: "Flash fired, auto mode",
      0x001D: "Flash fired, auto mode, return light not detected",
      0x001F: "Flash fired, auto mode, return light detected",
      0x0020: "No flash function",
      0x0041: "Flash fired, red-eye reduction mode",
      0x0045: "Flash fired, red-eye reduction mode, return light not detected",
      0x0047: "Flash fired, red-eye reduction mode, return light detected",
      0x0049: "Flash fired, compulsory flash mode, red-eye reduction mode",
      0x004D: "Flash fired, compulsory flash mode, red-eye reduction mode, return light not detected",
      0x004F: "Flash fired, compulsory flash mode, red-eye reduction mode, return light detected",
      0x0059: "Flash fired, auto mode, red-eye reduction mode",
      0x005D: "Flash fired, auto mode, return light not detected, red-eye reduction mode",
      0x005F: "Flash fired, auto mode, return light detected, red-eye reduction mode"
    },
    SensingMethod: {
      1: "Not defined",
      2: "One-chip color area sensor",
      3: "Two-chip color area sensor",
      4: "Three-chip color area sensor",
      5: "Color sequential area sensor",
      7: "Trilinear sensor",
      8: "Color sequential linear sensor"
    },
    SceneCaptureType: {
      0: "Standard",
      1: "Landscape",
      2: "Portrait",
      3: "Night scene"
    },
    SceneType: {
      1: "Directly photographed"
    },
    CustomRendered: {
      0: "Normal process",
      1: "Custom process"
    },
    WhiteBalance: {
      0: "Auto white balance",
      1: "Manual white balance"
    },
    GainControl: {
      0: "None",
      1: "Low gain up",
      2: "High gain up",
      3: "Low gain down",
      4: "High gain down"
    },
    Contrast: {
      0: "Normal",
      1: "Soft",
      2: "Hard"
    },
    Saturation: {
      0: "Normal",
      1: "Low saturation",
      2: "High saturation"
    },
    Sharpness: {
      0: "Normal",
      1: "Soft",
      2: "Hard"
    },
    SubjectDistanceRange: {
      0: "Unknown",
      1: "Macro",
      2: "Close view",
      3: "Distant view"
    },
    FileSource: {
      3: "DSC"
    },

    Components: {
      0: "",
      1: "Y",
      2: "Cb",
      3: "Cr",
      4: "R",
      5: "G",
      6: "B"
    }
  };

  function addEvent(element, event, handler) {
    if (element.addEventListener) {
      element.addEventListener(event, handler, false);
    } else if (element.attachEvent) {
      element.attachEvent("on" + event, handler);
    }
  }

  function imageHasData(img) {
    return !!img.exifdata;
  }

  function base64ToArrayBuffer(base64, contentType) {
    contentType = contentType || base64.match(/^data\:([^\;]+)\;base64,/mi)[1] || ''; // e.g. 'data:image/jpeg;base64,...' => 'image/jpeg'
    base64 = base64.replace(/^data\:([^\;]+)\;base64,/gmi, '');
    var binary = atob(base64);
    var len = binary.length;
    var buffer = new ArrayBuffer(len);
    var view = new Uint8Array(buffer);
    for (var i = 0; i < len; i++) {
      view[i] = binary.charCodeAt(i);
    }
    return buffer;
  }

  function objectURLToBlob(url, callback) {
    var _this = this;

    var http = new XMLHttpRequest();
    http.open("GET", url, true);
    http.responseType = "blob";
    http.onload = function (e) {
      if (_this.status == 200 || _this.status === 0) {
        callback(_this.response);
      }
    };
    http.send();
  }

  function getImageData(img, callback) {
    var _this2 = this;

    function handleBinaryFile(binFile) {
      var data = findEXIFinJPEG(binFile);
      var iptcdata = findIPTCinJPEG(binFile);
      img.exifdata = data || {};
      img.iptcdata = iptcdata || {};
      if (callback) {
        callback.call(img);
      }
    }

    if (img.src) {
      if (/^data\:/i.test(img.src)) {
        // Data URI
        var arrayBuffer = base64ToArrayBuffer(img.src);
        handleBinaryFile(arrayBuffer);
      } else if (/^blob\:/i.test(img.src)) {
        // Object URL
        var fileReader = new FileReader();
        fileReader.onload = function (e) {
          handleBinaryFile(e.target.result);
        };
        objectURLToBlob(img.src, function (blob) {
          fileReader.readAsArrayBuffer(blob);
        });
      } else {
        var http = new XMLHttpRequest();
        http.onload = function () {
          if (_this2.status == 200 || _this2.status === 0) {
            handleBinaryFile(http.response);
          } else {
            throw "Could not load image";
          }
          http = null;
        };
        http.open("GET", img.src, true);
        http.responseType = "arraybuffer";
        http.send(null);
      }
    } else if (window.FileReader && (img instanceof window.Blob || img instanceof window.File)) {
      var _fileReader = new FileReader();
      _fileReader.onload = function (e) {
        if (debug) console.log("Got file of length " + e.target.result.byteLength);
        handleBinaryFile(e.target.result);
      };

      _fileReader.readAsArrayBuffer(img);
    }
  }

  function findEXIFinJPEG(file) {
    var dataView = new DataView(file);

    if (debug) console.log("Got file of length " + file.byteLength);
    if (dataView.getUint8(0) != 0xFF || dataView.getUint8(1) != 0xD8) {
      if (debug) console.log("Not a valid JPEG");
      return false; // not a valid jpeg
    }

    var offset = 2,
        length = file.byteLength,
        marker = void 0;

    while (offset < length) {
      if (dataView.getUint8(offset) != 0xFF) {
        if (debug) console.log("Not a valid marker at offset " + offset + ", found: " + dataView.getUint8(offset));
        return false; // not a valid marker, something is wrong
      }

      marker = dataView.getUint8(offset + 1);
      if (debug) console.log(marker);

      // we could implement handling for other markers here,
      // but we're only looking for 0xFFE1 for EXIF data

      if (marker == 225) {
        if (debug) console.log("Found 0xFFE1 marker");

        return readEXIFData(dataView, offset + 4, dataView.getUint16(offset + 2) - 2);

        // offset += 2 + file.getShortAt(offset+2, true);
      } else {
        offset += 2 + dataView.getUint16(offset + 2);
      }
    }
  }

  function findIPTCinJPEG(file) {
    var dataView = new DataView(file);

    if (debug) console.log("Got file of length " + file.byteLength);
    if (dataView.getUint8(0) != 0xFF || dataView.getUint8(1) != 0xD8) {
      if (debug) console.log("Not a valid JPEG");
      return false; // not a valid jpeg
    }

    var offset = 2,
        length = file.byteLength;

    var isFieldSegmentStart = function isFieldSegmentStart(dataView, offset) {
      return dataView.getUint8(offset) === 0x38 && dataView.getUint8(offset + 1) === 0x42 && dataView.getUint8(offset + 2) === 0x49 && dataView.getUint8(offset + 3) === 0x4D && dataView.getUint8(offset + 4) === 0x04 && dataView.getUint8(offset + 5) === 0x04;
    };

    while (offset < length) {

      if (isFieldSegmentStart(dataView, offset)) {

        // Get the length of the name header (which is padded to an even number of bytes)
        var nameHeaderLength = dataView.getUint8(offset + 7);
        if (nameHeaderLength % 2 !== 0) nameHeaderLength += 1;
        // Check for pre photoshop 6 format
        if (nameHeaderLength === 0) {
          // Always 4
          nameHeaderLength = 4;
        }

        var startOffset = offset + 8 + nameHeaderLength;
        var sectionLength = dataView.getUint16(offset + 6 + nameHeaderLength);

        return readIPTCData(file, startOffset, sectionLength);

        break;
      }

      // Not the marker, continue searching
      offset++;
    }
  }
  var IptcFieldMap = {
    0x78: 'caption',
    0x6E: 'credit',
    0x19: 'keywords',
    0x37: 'dateCreated',
    0x50: 'byline',
    0x55: 'bylineTitle',
    0x7A: 'captionWriter',
    0x69: 'headline',
    0x74: 'copyright',
    0x0F: 'category'
  };
  function readIPTCData(file, startOffset, sectionLength) {
    var dataView = new DataView(file);
    var data = {};
    var fieldValue = void 0,
        fieldName = void 0,
        dataSize = void 0,
        segmentType = void 0,
        segmentSize = void 0;
    var segmentStartPos = startOffset;
    while (segmentStartPos < startOffset + sectionLength) {
      if (dataView.getUint8(segmentStartPos) === 0x1C && dataView.getUint8(segmentStartPos + 1) === 0x02) {
        segmentType = dataView.getUint8(segmentStartPos + 2);
        if (segmentType in IptcFieldMap) {
          dataSize = dataView.getInt16(segmentStartPos + 3);
          segmentSize = dataSize + 5;
          fieldName = IptcFieldMap[segmentType];
          fieldValue = getStringFromDB(dataView, segmentStartPos + 5, dataSize);
          // Check if we already stored a value with this name
          if (data.hasOwnProperty(fieldName)) {
            // Value already stored with this name, create multivalue field
            if (data[fieldName] instanceof Array) {
              data[fieldName].push(fieldValue);
            } else {
              data[fieldName] = [data[fieldName], fieldValue];
            }
          } else {
            data[fieldName] = fieldValue;
          }
        }
      }
      segmentStartPos++;
    }
    return data;
  }

  function readTags(file, tiffStart, dirStart, strings, bigEnd) {
    var entries = file.getUint16(dirStart, !bigEnd),
        tags = {},
        entryOffset = void 0,
        tag = void 0,
        i = void 0;

    for (i = 0; i < entries; i++) {
      entryOffset = dirStart + i * 12 + 2;
      tag = strings[file.getUint16(entryOffset, !bigEnd)];
      if (!tag && debug) console.log("Unknown tag: " + file.getUint16(entryOffset, !bigEnd));
      tags[tag] = readTagValue(file, entryOffset, tiffStart, dirStart, bigEnd);
    }
    return tags;
  }

  function readTagValue(file, entryOffset, tiffStart, dirStart, bigEnd) {
    var type = file.getUint16(entryOffset + 2, !bigEnd),
        numValues = file.getUint32(entryOffset + 4, !bigEnd),
        valueOffset = file.getUint32(entryOffset + 8, !bigEnd) + tiffStart,
        offset = void 0,
        vals = void 0,
        val = void 0,
        n = void 0,
        numerator = void 0,
        denominator = void 0;

    switch (type) {
      case 1: // byte, 8-bit unsigned int
      case 7:
        // undefined, 8-bit byte, value depending on field
        if (numValues == 1) {
          return file.getUint8(entryOffset + 8, !bigEnd);
        } else {
          offset = numValues > 4 ? valueOffset : entryOffset + 8;
          vals = [];
          for (n = 0; n < numValues; n++) {
            vals[n] = file.getUint8(offset + n);
          }
          return vals;
        }

      case 2:
        // ascii, 8-bit byte
        offset = numValues > 4 ? valueOffset : entryOffset + 8;
        return getStringFromDB(file, offset, numValues - 1);

      case 3:
        // short, 16 bit int
        if (numValues == 1) {
          return file.getUint16(entryOffset + 8, !bigEnd);
        } else {
          offset = numValues > 2 ? valueOffset : entryOffset + 8;
          vals = [];
          for (n = 0; n < numValues; n++) {
            vals[n] = file.getUint16(offset + 2 * n, !bigEnd);
          }
          return vals;
        }

      case 4:
        // long, 32 bit int
        if (numValues == 1) {
          return file.getUint32(entryOffset + 8, !bigEnd);
        } else {
          vals = [];
          for (n = 0; n < numValues; n++) {
            vals[n] = file.getUint32(valueOffset + 4 * n, !bigEnd);
          }
          return vals;
        }

      case 5:
        // rational = two long values, first is numerator, second is denominator
        if (numValues == 1) {
          numerator = file.getUint32(valueOffset, !bigEnd);
          denominator = file.getUint32(valueOffset + 4, !bigEnd);
          val = new Number(numerator / denominator);
          val.numerator = numerator;
          val.denominator = denominator;
          return val;
        } else {
          vals = [];
          for (n = 0; n < numValues; n++) {
            numerator = file.getUint32(valueOffset + 8 * n, !bigEnd);
            denominator = file.getUint32(valueOffset + 4 + 8 * n, !bigEnd);
            vals[n] = new Number(numerator / denominator);
            vals[n].numerator = numerator;
            vals[n].denominator = denominator;
          }
          return vals;
        }

      case 9:
        // slong, 32 bit signed int
        if (numValues == 1) {
          return file.getInt32(entryOffset + 8, !bigEnd);
        } else {
          vals = [];
          for (n = 0; n < numValues; n++) {
            vals[n] = file.getInt32(valueOffset + 4 * n, !bigEnd);
          }
          return vals;
        }

      case 10:
        // signed rational, two slongs, first is numerator, second is denominator
        if (numValues == 1) {
          return file.getInt32(valueOffset, !bigEnd) / file.getInt32(valueOffset + 4, !bigEnd);
        } else {
          vals = [];
          for (n = 0; n < numValues; n++) {
            vals[n] = file.getInt32(valueOffset + 8 * n, !bigEnd) / file.getInt32(valueOffset + 4 + 8 * n, !bigEnd);
          }
          return vals;
        }
    }
  }

  function getStringFromDB(buffer, start, length) {
    var outstr = "";
    for (var n = start; n < start + length; n++) {
      outstr += String.fromCharCode(buffer.getUint8(n));
    }
    return outstr;
  }

  function readEXIFData(file, start) {
    if (getStringFromDB(file, start, 4) != "Exif") {
      if (debug) console.log("Not valid EXIF data! " + getStringFromDB(file, start, 4));
      return false;
    }

    var bigEnd = void 0,
        tags = void 0,
        tag = void 0,
        exifData = void 0,
        gpsData = void 0,
        tiffOffset = start + 6;

    // test for TIFF validity and endianness
    if (file.getUint16(tiffOffset) == 0x4949) {
      bigEnd = false;
    } else if (file.getUint16(tiffOffset) == 0x4D4D) {
      bigEnd = true;
    } else {
      if (debug) console.log("Not valid TIFF data! (no 0x4949 or 0x4D4D)");
      return false;
    }

    if (file.getUint16(tiffOffset + 2, !bigEnd) != 0x002A) {
      if (debug) console.log("Not valid TIFF data! (no 0x002A)");
      return false;
    }

    var firstIFDOffset = file.getUint32(tiffOffset + 4, !bigEnd);

    if (firstIFDOffset < 0x00000008) {
      if (debug) console.log("Not valid TIFF data! (First offset less than 8)", file.getUint32(tiffOffset + 4, !bigEnd));
      return false;
    }

    tags = readTags(file, tiffOffset, tiffOffset + firstIFDOffset, TiffTags, bigEnd);

    if (tags.ExifIFDPointer) {
      exifData = readTags(file, tiffOffset, tiffOffset + tags.ExifIFDPointer, ExifTags, bigEnd);
      for (tag in exifData) {
        switch (tag) {
          case "LightSource":
          case "Flash":
          case "MeteringMode":
          case "ExposureProgram":
          case "SensingMethod":
          case "SceneCaptureType":
          case "SceneType":
          case "CustomRendered":
          case "WhiteBalance":
          case "GainControl":
          case "Contrast":
          case "Saturation":
          case "Sharpness":
          case "SubjectDistanceRange":
          case "FileSource":
            exifData[tag] = StringValues[tag][exifData[tag]];
            break;

          case "ExifVersion":
          case "FlashpixVersion":
            exifData[tag] = String.fromCharCode(exifData[tag][0], exifData[tag][1], exifData[tag][2], exifData[tag][3]);
            break;

          case "ComponentsConfiguration":
            exifData[tag] = StringValues.Components[exifData[tag][0]] + StringValues.Components[exifData[tag][1]] + StringValues.Components[exifData[tag][2]] + StringValues.Components[exifData[tag][3]];
            break;
        }
        tags[tag] = exifData[tag];
      }
    }

    if (tags.GPSInfoIFDPointer) {
      gpsData = readTags(file, tiffOffset, tiffOffset + tags.GPSInfoIFDPointer, GPSTags, bigEnd);
      for (tag in gpsData) {
        switch (tag) {
          case "GPSVersionID":
            gpsData[tag] = gpsData[tag][0] + "." + gpsData[tag][1] + "." + gpsData[tag][2] + "." + gpsData[tag][3];
            break;
        }
        tags[tag] = gpsData[tag];
      }
    }

    return tags;
  }

  this.getData = function (img, callback) {
    if ((img instanceof Image || img instanceof HTMLImageElement) && !img.complete) return false;

    if (!imageHasData(img)) {
      getImageData(img, callback);
    } else {
      if (callback) {
        callback.call(img);
      }
    }
    return true;
  };

  this.getTag = function (img, tag) {
    if (!imageHasData(img)) return;
    return img.exifdata[tag];
  };

  this.getAllTags = function (img) {
    if (!imageHasData(img)) return {};
    var a = void 0,
        data = img.exifdata,
        tags = {};
    for (a in data) {
      if (data.hasOwnProperty(a)) {
        tags[a] = data[a];
      }
    }
    return tags;
  };

  this.pretty = function (img) {
    if (!imageHasData(img)) return "";
    var a = void 0,
        data = img.exifdata,
        strPretty = "";
    for (a in data) {
      if (data.hasOwnProperty(a)) {
        if (_typeof(data[a]) == "object") {
          if (data[a] instanceof Number) {
            strPretty += a + " : " + data[a] + " [" + data[a].numerator + "/" + data[a].denominator + "]\r\n";
          } else {
            strPretty += a + " : [" + data[a].length + " values]\r\n";
          }
        } else {
          strPretty += a + " : " + data[a] + "\r\n";
        }
      }
    }
    return strPretty;
  };

  this.readFromBinaryFile = function (file) {
    return findEXIFinJPEG(file);
  };
}]);
'use strict';

crop.factory('cropHost', ['$document', 'cropAreaCircle', 'cropAreaSquare', 'cropEXIF', function ($document, CropAreaCircle, CropAreaSquare, cropEXIF) {
  var _this = this;

  /* STATIC S */

  // Get Element's Offset
  var getElementOffset = function getElementOffset(elem) {
    var box = elem.getBoundingClientRect();

    var body = document.body;
    var docElem = document.documentElement;

    var scrollTop = window.pageYOffset || docElem.scrollTop || body.scrollTop;
    var scrollLeft = window.pageXOffset || docElem.scrollLeft || body.scrollLeft;

    var clientTop = docElem.clientTop || body.clientTop || 0;
    var clientLeft = docElem.clientLeft || body.clientLeft || 0;

    var top = box.top + scrollTop - clientTop;
    var left = box.left + scrollLeft - clientLeft;

    return { top: Math.round(top), left: Math.round(left) };
  };

  return function (elCanvas, opts, events) {
    /* PRIVATE letIABLES */

    // Object Pointers
    var ctx = null,
        image = null,
        theArea = null;

    // Dimensions
    var minCanvasDims = [300, 300],
        maxCanvasDims = [300, 300];

    // Result Image size
    var resImgSize = 200;

    // Result Image type
    var resImgFormat = 'image/png';

    // Result Image quality
    var resImgQuality = null;

    /* PRIVATE S */

    // Draw Scene
    function drawScene() {
      // clear canvas
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      if (image !== null) {
        // draw source image
        ctx.drawImage(image, 0, 0, ctx.canvas.width, ctx.canvas.height);

        ctx.save();

        // and make it darker
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        ctx.restore();

        // draw Area
        theArea.draw();
      }
    }

    // Resets CropHost
    var resetCropHost = function resetCropHost() {
      if (image !== null) {
        theArea.setImage(image);
        var imageDims = [image.width, image.height],
            imageRatio = image.width / image.height,
            canvasDims = imageDims;

        if (canvasDims[0] > maxCanvasDims[0]) {
          canvasDims[0] = maxCanvasDims[0];
          canvasDims[1] = canvasDims[0] / imageRatio;
        } else if (canvasDims[0] < minCanvasDims[0]) {
          canvasDims[0] = minCanvasDims[0];
          canvasDims[1] = canvasDims[0] / imageRatio;
        }
        if (canvasDims[1] > maxCanvasDims[1]) {
          canvasDims[1] = maxCanvasDims[1];
          canvasDims[0] = canvasDims[1] * imageRatio;
        } else if (canvasDims[1] < minCanvasDims[1]) {
          canvasDims[1] = minCanvasDims[1];
          canvasDims[0] = canvasDims[1] * imageRatio;
        }
        elCanvas.prop('width', canvasDims[0]).prop('height', canvasDims[1]).css({ 'margin-left': -canvasDims[0] / 2 + 'px', 'margin-top': -canvasDims[1] / 2 + 'px' });

        theArea.setX(ctx.canvas.width / 2);
        theArea.setY(ctx.canvas.height / 2);
        theArea.setSize(Math.min(200, ctx.canvas.width / 2, ctx.canvas.height / 2));
      } else {
        elCanvas.prop('width', 0).prop('height', 0).css({ 'margin-top': 0 });
      }

      drawScene();
    };

    /**
     * Returns event.changedTouches directly if event is a TouchEvent.
     * If event is a jQuery event, return changedTouches of event.originalEvent
     */
    var getChangedTouches = function getChangedTouches(event) {
      if (angular.isDefined(event.changedTouches)) {
        return event.changedTouches;
      } else {
        return event.originalEvent.changedTouches;
      }
    };

    var onMouseMove = function onMouseMove(e) {
      if (image !== null) {
        var offset = getElementOffset(ctx.canvas),
            pageX = void 0,
            pageY = void 0;
        if (e.type === 'touchmove') {
          pageX = getChangedTouches(e)[0].pageX;
          pageY = getChangedTouches(e)[0].pageY;
        } else {
          pageX = e.pageX;
          pageY = e.pageY;
        }
        theArea.processMouseMove(pageX - offset.left, pageY - offset.top);
        drawScene();
      }
    };

    var onMouseDown = function onMouseDown(e) {
      e.preventDefault();
      e.stopPropagation();
      if (image !== null) {
        var offset = getElementOffset(ctx.canvas),
            pageX = void 0,
            pageY = void 0;
        if (e.type === 'touchstart') {
          pageX = getChangedTouches(e)[0].pageX;
          pageY = getChangedTouches(e)[0].pageY;
        } else {
          pageX = e.pageX;
          pageY = e.pageY;
        }
        theArea.processMouseDown(pageX - offset.left, pageY - offset.top);
        drawScene();
      }
    };

    var onMouseUp = function onMouseUp(e) {
      if (image !== null) {
        var offset = getElementOffset(ctx.canvas),
            pageX = void 0,
            pageY = void 0;
        if (e.type === 'touchend') {
          pageX = getChangedTouches(e)[0].pageX;
          pageY = getChangedTouches(e)[0].pageY;
        } else {
          pageX = e.pageX;
          pageY = e.pageY;
        }
        theArea.processMouseUp(pageX - offset.left, pageY - offset.top);
        drawScene();
      }
    };

    _this.getResultImageDataURI = function () {
      var temp_ctx = void 0,
          temp_canvas = void 0;
      temp_canvas = angular.element('<canvas></canvas>')[0];
      temp_ctx = temp_canvas.getContext('2d');
      temp_canvas.width = resImgSize;
      temp_canvas.height = resImgSize;
      if (image !== null) {
        temp_ctx.drawImage(image, (theArea.getX() - theArea.getSize() / 2) * (image.width / ctx.canvas.width), (theArea.getY() - theArea.getSize() / 2) * (image.height / ctx.canvas.height), theArea.getSize() * (image.width / ctx.canvas.width), theArea.getSize() * (image.height / ctx.canvas.height), 0, 0, resImgSize, resImgSize);
      }
      if (resImgQuality !== null) {
        return temp_canvas.toDataURL(resImgFormat, resImgQuality);
      }
      return temp_canvas.toDataURL(resImgFormat);
    };

    _this.setNewImageSource = function (imageSource) {
      image = null;
      resetCropHost();
      events.trigger('image-updated');
      if (!!imageSource) {
        var newImage = new Image();
        if (imageSource.substring(0, 4).toLowerCase() === 'http') {
          newImage.crossOrigin = 'anonymous';
        }
        newImage.onload = function () {
          events.trigger('load-done');

          cropEXIF.getData(newImage, function () {
            var orientation = cropEXIF.getTag(newImage, 'Orientation');

            if ([3, 6, 8].indexOf(orientation) > -1) {
              var canvas = document.createElement("canvas"),
                  _ctx = canvas.getContext("2d"),
                  cw = newImage.width,
                  ch = newImage.height,
                  cx = 0,
                  cy = 0,
                  deg = 0;
              switch (orientation) {
                case 3:
                  cx = -newImage.width;
                  cy = -newImage.height;
                  deg = 180;
                  break;
                case 6:
                  cw = newImage.height;
                  ch = newImage.width;
                  cy = -newImage.height;
                  deg = 90;
                  break;
                case 8:
                  cw = newImage.height;
                  ch = newImage.width;
                  cx = -newImage.width;
                  deg = 270;
                  break;
              }

              canvas.width = cw;
              canvas.height = ch;
              _ctx.rotate(deg * Math.PI / 180);
              _ctx.drawImage(newImage, cx, cy);

              image = new Image();
              image.src = canvas.toDataURL("image/png");
            } else {
              image = newImage;
            }
            resetCropHost();
            events.trigger('image-updated');
          });
        };
        newImage.onerror = function () {
          events.trigger('load-error');
        };
        events.trigger('load-start');
        newImage.src = imageSource;
      }
    };

    _this.setMaxDimensions = function (width, height) {
      maxCanvasDims = [width, height];

      if (image !== null) {
        var curWidth = ctx.canvas.width,
            curHeight = ctx.canvas.height;

        var imageDims = [image.width, image.height],
            imageRatio = image.width / image.height,
            canvasDims = imageDims;

        if (canvasDims[0] > maxCanvasDims[0]) {
          canvasDims[0] = maxCanvasDims[0];
          canvasDims[1] = canvasDims[0] / imageRatio;
        } else if (canvasDims[0] < minCanvasDims[0]) {
          canvasDims[0] = minCanvasDims[0];
          canvasDims[1] = canvasDims[0] / imageRatio;
        }
        if (canvasDims[1] > maxCanvasDims[1]) {
          canvasDims[1] = maxCanvasDims[1];
          canvasDims[0] = canvasDims[1] * imageRatio;
        } else if (canvasDims[1] < minCanvasDims[1]) {
          canvasDims[1] = minCanvasDims[1];
          canvasDims[0] = canvasDims[1] * imageRatio;
        }
        elCanvas.prop('width', canvasDims[0]).prop('height', canvasDims[1]).css({ 'margin-left': -canvasDims[0] / 2 + 'px', 'margin-top': -canvasDims[1] / 2 + 'px' });

        var ratioNewCurWidth = ctx.canvas.width / curWidth,
            ratioNewCurHeight = ctx.canvas.height / curHeight,
            ratioMin = Math.min(ratioNewCurWidth, ratioNewCurHeight);

        theArea.setX(theArea.getX() * ratioNewCurWidth);
        theArea.setY(theArea.getY() * ratioNewCurHeight);
        theArea.setSize(theArea.getSize() * ratioMin);
      } else {
        elCanvas.prop('width', 0).prop('height', 0).css({ 'margin-top': 0 });
      }

      drawScene();
    };

    _this.setAreaMinSize = function (size) {
      size = parseInt(size, 10);
      if (!isNaN(size)) {
        theArea.setMinSize(size);
        drawScene();
      }
    };

    _this.setResultImageSize = function (size) {
      size = parseInt(size, 10);
      if (!isNaN(size)) {
        resImgSize = size;
      }
    };

    _this.setResultImageFormat = function (format) {
      resImgFormat = format;
    };

    _this.setResultImageQuality = function (quality) {
      quality = parseFloat(quality);
      if (!isNaN(quality) && quality >= 0 && quality <= 1) {
        resImgQuality = quality;
      }
    };

    _this.setAreaType = function (type) {
      var curSize = theArea.getSize(),
          curMinSize = theArea.getMinSize(),
          curX = theArea.getX(),
          curY = theArea.getY();

      var AreaClass = CropAreaCircle;
      if (type === 'square') {
        AreaClass = CropAreaSquare;
      }
      theArea = new AreaClass(ctx, events);
      theArea.setMinSize(curMinSize);
      theArea.setSize(curSize);
      theArea.setX(curX);
      theArea.setY(curY);

      // resetCropHost()
      if (image !== null) {
        theArea.setImage(image);
      }

      drawScene();
    };

    /* Life Cycle begins */

    // Init Context let
    ctx = elCanvas[0].getContext('2d');

    // Init CropArea
    theArea = new CropAreaCircle(ctx, events);

    // Init Mouse Event Listeners
    $document.on('mousemove', onMouseMove);
    elCanvas.on('mousedown', onMouseDown);
    $document.on('mouseup', onMouseUp);

    // Init Touch Event Listeners
    $document.on('touchmove', onMouseMove);
    elCanvas.on('touchstart', onMouseDown);
    $document.on('touchend', onMouseUp);

    // CropHost Destructor
    _this.destroy = function () {
      $document.off('mousemove', onMouseMove);
      elCanvas.off('mousedown', onMouseDown);
      $document.off('mouseup', onMouseMove);

      $document.off('touchmove', onMouseMove);
      elCanvas.off('touchstart', onMouseDown);
      $document.off('touchend', onMouseMove);

      elCanvas.remove();
    };
  };
}]);
'use strict';

crop.factory('cropPubSub', [function () {
  var _this = this;

  return function () {
    var events = {};
    // Subscribe
    _this.on = function (names, handler) {
      names.split(' ').forEach(function (name) {
        if (!events[name]) events[name] = [];
        events[name].push(handler);
      });
      return _this;
    };
    // Publish
    _this.trigger = function (name, args) {
      angular.forEach(events[name], function (handler) {
        handler.call(null, args);
      });
      return _this;
    };
  };
}]);

exports.ngImageCrop = NgImageCrop;
}));
