// countries = require('../shared/countries.json')
function getCountryCode (country) {
  var url = `http://nominatim.openstreetmap.org/search/?format=json&country=${country}&addressdetails=1&limit=1`
  return request({url, method: 'get', json_res: true}).then(function (res) {
    return (res[0].address.country_code)
  })
}
var badCountries = []
var data = {}
p = Promise.resolve()
Object.keys(countries).forEach(function (country) {
  p = p.then(function () {
    return getCountryCode(country).then(function (code) {
      console.log(country, code)
      data[code] = country
    }).catch(function (err) {
      badCountries.push(country)
      console.log(err)
    })
  })
})
