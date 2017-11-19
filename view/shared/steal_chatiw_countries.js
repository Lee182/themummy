// goto chatiw.com
// require('jonoShortcuts')
var data = {}
var countrySelectEl = d.qs('#countries')
var countryOptions = countrySelectEl.children.toArray()

var wait = function (ms) {
  return new Promise(function (resolve, reject) {
    setTimeout(resolve, ms)
  })
}
function el2txt (el) {
  return el.textContent.trim()
}
function selectCountry (name, val) {
  countrySelectEl.selectedIndex = val
  $('select[name=zone]').load('ville.php?country_id=' + Number(val))
  $('#zone').show()
  return wait(2000).then(function () {
    extractStates(name)
    return wait(200)
  })
}
function extractStates (name) {
  var el = d.qs('#zone select[name="zone"]').children
  console.log(name)
  data[name] = el.toArray()
  .reduce(function (arr, el) {
    var txt = el2txt(el)
    if (txt === '') { return arr }
    arr.push(txt)
    return arr
  }, [])
}
//
// usage
var p = Promise.resolve()
countryOptions.forEach(function (el, i) {
  let name = el2txt(el)
  let val = Number(el.value)
  if (name === '') { return }
  p = p.then(function () {
    return selectCountry(name, val)
  })
})

p.then(function (a) {
  console.log('done')
  alert('done')
})

// after seeing palestine at the bottom of the countries list i am now woriied to be working on this...
