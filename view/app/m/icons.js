module.exports = function ({data, methods}) {
  var icons = [
    'male',
    'female',
    'menu',
    'gps',
    '3-dots-loader',
    'arrow-right',
    'arrow-left'
  ]
  icons.forEach(function (icon) {
    Vue.component('icon-' + icon, {
      template: '#icon-' + icon,
      data: function () {
        return data
      }
    })
  })

  Vue.component('person', {
    template: '#person',
    props: ['person'],
    data: function () {
      return data
    },
    methods
  })
}
