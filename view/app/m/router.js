module.exports = function ({data, methods}) {
  // w.querystring = require('querystring')
  data.router = {}
  data.router.path = undefined
  data.router.params = {}
  data.router.paths = [
    { path: '/', afterCreated: function () {
      console.log('i am root')
      // vm.home__reqs_get()
      // vm.home__market_front()
    }}
    // { path: '/me_books', loginRequired: true},
    // { path: '/me_books/add', loginRequired: true},
    // { path: '/book/:book_id', dynamic: true},
    // { path: '/notifcations', loginRequired: true},
    // { path: '/me', loginRequired: true, afterCreated: function(){
    //   let vm = this
    //   vm.account__clear()
    //   vm.account__get()
    // }},
    // { path: '/user/:user_id', dynamic: true, afterCreated: function(){
    //   let vm = this
    //   vm.account__clear()
    //   vm.account__get()
    // }}
  ]

  var router__inited = false
  methods.router__init = function () {
    if (router__inited) { return }
    let vm = this
    w.on('popstate', vm.route__listener)
    vm.route__go(location.pathname, 'replaceState')
    router__inited = true
  }

  function dynamicPath_getParams (pathpattern, path) {
    var obj = {match: true, params: {}}
    function strNotEmpty (str) {
      return str !== ''
    }
    var pathArr = path.split('/').filter(strNotEmpty)
    var patternArr = pathpattern.split('/').filter(strNotEmpty)

    if (pathArr.length !== patternArr.length) {
      obj.match = false
      return obj
    }
    return patternArr.reduce(function (obj, str, i) {
      if (obj.match === false) { return obj }
      if (patternArr[i][0] === ':') {
        obj.params[ patternArr[i].substring(1) ] = pathArr[i]
      } else if (patternArr[i] !== pathArr[i]) {
        obj.match = false
      }
      return obj
    }, obj)
  }

  function path_mark (path, pathname) {
    path.tmpPath = path.path
    if (path.dynamic === true) {
      path.tmpPath = pathname
    }
    return path
  }

  methods.router_direct_path = function (pathname) {
    let vm = this
    let path = vm.router.paths.find(function (item) {
      if (item.dynamic === true) {
        return dynamicPath_getParams(item.path, pathname).match === true
      }
      return pathname === item.path
    })
    if (path === undefined) {
      // path not found then redirect to '/'
      path = vm.router.paths[0]
    }
    if (path.loginRequired === true) {
      // user not logged and login required redirect root
      if (!vm.is_user) {
        path = vm.router.paths[0]
      }
    }
    return Promise.resolve(path_mark(path, pathname))
  }

  methods.route__set_path = function (item) {
    let vm = this
    vm.router.path = item.path
    if (item.dynamic) {
      vm.router.params = dynamicPath_getParams(item.path, item.tmpPath).params
    } else {
      vm.router.params = {}
    }
    if (typeof item.afterCreated === 'function') {
      vm.$nextTick(function () {
        let vm = this
        item.afterCreated.call(vm)
      })
    }
  }

  methods.route__go = function (path, hist) {
    let vm = this
    return vm.router_direct_path(path).then(function (item) {
      if (hist === 'pushState' && item.tmpPath === location.pathname) {
        hist = 'replaceState'
      }
      if (hist === 'pushState' || hist === 'replaceState') {
        history[hist](
          {path: item.tmpPath},
          '#booktrade ' + item.tmpPath,
          item.tmpPath
        )
      }
      console.log('route', item.tmpPath)
      vm.route__set_path(item)
    })
  }

  methods.route__back = function () {
    var a = history.state.path
    history.go(-1)
    wait(400).then(function () {
      if (history.state === null) {
        vm.route__go('/', 'pushState')
        return
      }
      var b = history.state.path
      if (a === b) {
        console.log('last path')
        vm.route__go('/', 'pushState')
      }
    })
  }

  methods.route__listener = function (popstate) {
    let vm = this
    if (popstate.state === null) { return }
    vm.route__go(popstate.state.path)
  }
}
