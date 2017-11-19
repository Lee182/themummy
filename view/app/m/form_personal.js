w.form = require('../../shared/form2.js')

module.exports = function ({data, methods}) {
  data.submit_btn_txt = 'Submit'
  data.form_structure = form.structure

  Vue.component('pd-form', {
    template: '#pd-form',
    data: function () {
      return data
    }
  })
  Vue.component('pd-form-section', {
    template: '#pd-form-section',
    props: ['section', 'depth'],
    data: function () {
      // props
      var d = {section: this.section, depth: this.depth}
      d.depth = (d.depth === undefined) ? 0 : d.depth
      this.depth = d.depth
      d.hclass = 'f-heading-' + d.depth
      d.fclass = 'f-section-' + d.depth
      var o = Object.assign(d, data)
      return o
    }
  })
  Vue.component('pd-builder', {
    template: '#pd-builder',
    props: ['input', 'depth'],
    data: function () {
      var d = {input: this.input, depth: this.depth}
      d.depth = (d.depth === undefined) ? 0 : d.depth + 1
      this.depth = d.depth
      return Object.assign(d, data)
    }
  })
  Vue.component('pd-input', {
    template: '#pd-input',
    props: ['input']
  })
}
