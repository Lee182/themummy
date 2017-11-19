module.exports = function ({computed, data, methods}) {
  data.people = {
    arr: [],
    n_current_page: 1,
    n_viewcount: 40
  }
  methods.f__people_online = function (offset, length) {
    return request({
      url: '/people_online',
      method: 'post',
      json: true,
      data: {
        offset: 0,
        length: 200
      }
    })
  }
  methods.f__people_online_system = function () {
    let vm = this
    const { n_viewcount, n_current_page } = vm.people
    const n_offset = (n_current_page - 1) * n_viewcount
    const n_get_length = n_viewcount + 1
    vm.f__people_online(n_offset, n_get_length)
    .then((res) => {
      vm.people.arr = res.filter((person) => {
        if (!vm.user) { return true }
        return person.id !== vm.user.id
      }).splice(0, n_viewcount)
    })
  }
  let interval_poll
  methods.f__people_start_poll = function () {
    if (interval_poll === undefined) {
      vm.f__people_online_system()
      interval_poll = setInterval(vm.f__people_online_system, 5000)
    }
  }
  methods.f__people_stop_poll = function () {
    if (interval_poll !== undefined) {
      clearInterval(interval_poll)
      interval_poll = undefined
    }
  }
}
