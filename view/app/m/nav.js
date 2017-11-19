// w.enquire = require('enquire.js')

module.exports = function ({data, methods, computed}) {
  data.nav = {
    links: [
      // {text: 'About Service', active: false},
      // {text: 'Terms & Conditions', active: false}
    ],
    show: true
  }
  methods.nav__click = function (item) {
    if (item.scriptId) {
      this.coverage_open(item.scriptId)
    }
  }
  methods.nav__tog = function () {
    data.nav.show = !data.nav.show
  }

  // data.stage_n = 0 // current stage-column to the left.
  // data.stage_n_inview = 1
  // data.stage_arr_id = ['people', 'inbox', 'chat']
  // data.stage_length = 3
  // computed.stage_style = function () {
  //   let vm = this
  //   var n = -((vm.stage_n * 100) / (vm.stage_n_inview))
  //   return {
  //     transform: `translateX(${n}%)`
  //   }
  // }
  // computed.stagecolumn_style = function () {
  //   let vm = this
  //   return {
  //     width: (100 / vm.stage_n_inview) + '%'
  //   }
  // }
  // computed.stage_seeall = function () {
  //   let vm = this
  //   var c = vm.stage_length <= vm.stage_n_inview
  //   if (c) { vm.stage_n = 0 }
  //   return c
  // }
  // computed.stage_atmin = function () {
  //   let vm = this
  //   return (vm.stage_n === 0 || vm.stage_seeall)
  // }
  // computed.stage_atmax = function () {
  //   let vm = this
  //   return (vm.stage_n + vm.stage_n_inview >= vm.stage_length) || vm.stage_seeall
  // }

  // methods.stage_resizing__init = function () {
  //   let vm = this
  //   // media queries within js
  //   var s = 280
  //   var tmp = 0
  //   var i = 1
  //   while (tmp < 1500) {
  //     let a = i * s
  //     let b = i
  //     tmp = a
  //     i++
  //     enquire.register(`screen and (min-width: ${a}px)`, {
  //       deferSetup: false,
  //       setup: function () {},
  //       match: function (e) {
  //         data.stage_n_inview = b
  //       },
  //       unmatch: function () {
  //         if (b === 1) {
  //           data.stage_n_inview = 1
  //         } else {
  //           data.stage_n_inview = b - 1
  //         }
  //       }
  //     })
  //   }
  // }

  // methods.in_range = function (n, o) {
  //   if (n < o.a) {
  //     return 'lt a'
  //   }
  //   if (n === o.a) {
  //     return 'eq a'
  //   }
  //   if (n > o.a && n < o.b) {
  //     return 'in'
  //   }
  //   if (n === o.b) {
  //     return 'eq b'
  //   }
  //   if (n > o.b) {
  //     return 'gt b'
  //   }
  // }

  // methods.nav__stage = function (o) {
  //   let vm = this
  //   var stage = d.qs('.stage#main')
  //   var max = vm.stage_length
  //   if (o.id) {
  //     var i = vm.stage_arr_id.indexOf(o.id)
  //     const view = vm.in_range(i, {
  //       a: vm.stage_n,
  //       b: vm.stage_n + vm.stage_n_inview
  //     })
  //     if (view === 'in' || i === -1) {
  //       return
  //     }
  //     if (view === 'eq b') {
  //       o.forward = 1
  //     }
  //     if (view === 'gt b') {
  //       o.forward = i - vm.stage_n
  //     }
  //     if (view === 'lt a') {
  //       //  x = 0 - 2
  //       o.forward = i - vm.stage_n
  //       console.log(i, vm.stage_n, o.forward)
  //     }
  //   }
  //   var a = o.forward + vm.stage_n
  //   if (a < 0 || a > max - vm.stage_n_inview) {
  //     return
  //   }
  //   vm.stage_n += o.forward
  // }
}
