// tools loading
require('./lib/jonoShortcuts.js')
w.Vue = require('vue/dist/vue.common.js')
// w.wait = require('./lib/wait.js')
w.request = require('./lib/request.js')
w._ = require('lodash')
// w.loadImg = require('./lib/loadImage.js')
// w.cp = require('../shared/cpJSON.js')

w.modules = {
  user: require('./m/user.js'),
  nav_side: require('./m/nav.js'),
  icons: require('./m/icons.js'),
  router: require('./m/router.js'),
  people: require('./m/people.js'),
  coverage: require('./m/coverage.js')
}

w.on('storage', function (e) {
  console.log(e)
})
w.on('load', function (e) {
  console.log(e)
})

vueobj = {
  el: '#app',
  data: {},
  computed: {},
  watch: {},
  methods: {},
  filters: {},

  // https://vuejs.org/v2/guide/instance.html#Lifecycle-Diagram
  beforeCreate: function () {},
  created: function () {
    let vm = this
    vm.router__init()
    vm.coverage_getIndexs().then(() => {
      vm.coverage_getScriptsSrc()
    })
  },
  beforeMount: function () {},
  mounted: function () {
    let vm = this
    // vm.stage_resizing__init()
  },
  beforeUpdate: function () {},
  updated: function () {},
  beforeDestroy: function () {},
  destroyed: function () {}
}

Object.keys(modules).forEach(function (name) {
  if (typeof modules[name] !== 'function') { return }
  modules[name](vueobj)
})

w.vm = new Vue(vueobj)
