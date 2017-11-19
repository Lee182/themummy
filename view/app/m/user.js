module.exports = function ({data, methods}) {
  data.user = undefined
  data.geoLocateLoading = false
  data.geoLocatedRecent = false // got location in last 5 mins
  data.login = {
    nickname: '',
    age: 18,
    sex: 'male',
    loci: {}
  }
  methods.geoLocateMe = function (e) {
    e.preventDefault()
    let vm = this
    if (vm.geoLocateLoading) {
      return // prevent multiple requests
    }
    vm.geoLocateLoading = true
    navigator.geolocation.getCurrentPosition(
      vm.geoLociSuccess, vm.geoLociFail)
  }
  methods.geoLociFail = function (e) {
    console.log('geoLociFail', e)
    vm.geoLocateLoading = false
  }
  methods.geoLociSuccess = function (e) {
    let vm = this
    var lat = e.coords.latitude
    var lon = e.coords.longitude
    // api at http://wiki.openstreetmap.org/wiki/Nominatim
    var url = `http://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`
    console.log(url)
    request({url, method: 'get', json_res: true}).then(function (res) {
      console.log(res.address)
      vm.login.loci = res.address
      vm.geoLocateLoading = false
      vm.geoLocatedRecent = true
      setTimeout(function () {
        vm.geoLocatedRecent = false
      }, 5 * 60 * 1000) // 5mins
    })
  }

  methods.loginSetGender = function (e, sex) {
    e.preventDefault()
    let vm = this
    if (sex === 'male' || sex === 'female') {
      vm.login.sex = sex
    }
  }
  methods.signUp = function (e) {
    let vm = this
    e.preventDefault()
    request({
      url: '/login',
      method: 'post',
      data: vm.login,
      json: true
    }).then((res) => {
      if (res.login_success) {
        vm.user = res.user
      }
      if (res.err) {
        alert(JSON.stringify(res.err, null, 4))
      }
    })
  }
  methods.signUpSuccess = (a) => {
    let vm = this
    vm.user = {}
    console.log(a)
  }
  methods.signUpError = function () {}
  methods.signUPVip = function () {
    // more fns that involve payment
  }
  methods.logout = function () {
    let vm = this
    vm.nav.show = false
    request({
      url: '/logout',
      method: 'post',
      json: true,
      data: {
        me: vm.user
      }
    }).then((res) => {
      console.log(res)
      vm.user = undefined
    }).catch((err) => {
      console.log(err)
    })
    // TODO redirect to nice thankyou feedback, and review page
  }
  methods.logoutVIP = function () {
    // option for royalty where message data is kept on the server
  }

  methods.getFlag = function (loci) {
    var o = {}
    if (loci.country_code !== undefined) {
      o[loci.country_code] = true
    }
    return o
  }
}
