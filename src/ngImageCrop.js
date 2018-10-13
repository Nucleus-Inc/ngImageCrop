crop.directive('imgCrop', ['$timeout', 'cropHost', 'cropPubSub', ($timeout, CropHost, CropPubSub) => {
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
    controller: ['$scope', function($scope) {
      $scope.events = new CropPubSub();
    }],
    link: (scope, element/*, attrs*/) => {
      // Init Events Manager
      let events = scope.events

      // Init Crop Host
      let cropHost = new CropHost(element.find('canvas'), {}, events)

      // Store Result Image to check if it's changed
      let storedResultImage

      const updateResultImage = (scope) => {
        let resultImage = cropHost.getResultImageDataURI()
        if(storedResultImage!==resultImage) {
          storedResultImage = resultImage
          if(angular.isDefined(scope.resultImage))
            scope.resultImage=resultImage
          scope.onChange({$dataURI: scope.resultImage})
        }
      }

      // Wrapper to safely exec functions within $apply on a running $digest cycle
      const fnSafeApply = (fn) => {
        return () => {
          $timeout(() => { scope.$apply((scope) => { fn(scope) }) })
        }
      }

      // Setup CropHost Event Handlers
      events
        .on('load-start', fnSafeApply((scope) => { scope.onLoadBegin({}) }))
        .on('load-done', fnSafeApply((scope) => { scope.onLoadDone({}) }))
        .on('load-error', fnSafeApply((scope) => { scope.onLoadError({}) }))
        .on('area-move area-resize', fnSafeApply((scope) => {
          if(!!scope.changeOnFly)
            updateResultImage(scope)
        }))
        .on('area-move-end area-resize-end image-updated', fnSafeApply((scope) =>{ updateResultImage(scope) }))

      // Sync CropHost with Directive's options
      scope.$watch('image', () => {
        cropHost.setNewImageSource(scope.image)
      })
      scope.$watch('areaType', () => {
        cropHost.setAreaType(scope.areaType)
        updateResultImage(scope)
      })
      scope.$watch('areaMinSize', () => {
        cropHost.setAreaMinSize(scope.areaMinSize)
        updateResultImage(scope)
      })
      scope.$watch('resultImageSize', () => {
        cropHost.setResultImageSize(scope.resultImageSize)
        updateResultImage(scope)
      })
      scope.$watch('resultImageFormat', () => {
        cropHost.setResultImageFormat(scope.resultImageFormat)
        updateResultImage(scope)
      })
      scope.$watch('resultImageQuality', () => {
        cropHost.setResultImageQuality(scope.resultImageQuality)
        updateResultImage(scope)
      })

      // Update CropHost dimensions when the directive element is resized
      scope.$watch(
        () => {
          return [element[0].clientWidth, element[0].clientHeight]
        },
        (value) => {
          cropHost.setMaxDimensions(value[0],value[1])
          updateResultImage(scope)
        },
        true
      )

      // Destroy CropHost Instance when the directive is destroying
      scope.$on('$destroy', () => { cropHost.destroy() })
    }
  }
}])
