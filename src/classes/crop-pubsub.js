crop.factory('cropPubSub', [function() {
  return () => {
    let events = {}
    // Subscribe
    this.on = (names, handler) => {
      names.split(' ').forEach((name) => {
        if (!events[name])
          events[name] = []
        events[name].push(handler)
      })
      return this
    }
    // Publish
    this.trigger = (name, args) => {
      angular.forEach(events[name], (handler) => {
        handler.call(null, args)
      })
      return this
    }
  }
}])
