module.exports = function({
  method,  // get, post, put, delete
  url,     // relative url or full path
  data,    // if post req sets body as data
  formData,    // if file setRequestHeader('X-FileName', file.name)
  cookies,
  timeout,
  json,
  json_req,
  json_res,
  cb_progress,
  cb_readystate
}) {
  if (method === undefined) {method = 'get'}
  if (json === true) {
    json_req = true
    json_res = true
  }
  var req = new XMLHttpRequest()
  var p = new Promise(function(resolve, reject){
    var timer
    req.addEventListener('readystatechange', function(e){
      if (typeof cb_readystate === 'function') {
        cb_readystate(e)
      }
      if (req.readyState === 4) {
        clearTimeout(timer)
        if (json_res) {
          try {
            var res = JSON.parse(req.response)
          } catch(e) {
            // unable to parse res
            return reject({e, req})
          }
          return resolve(res)
        }
        return resolve(req.response)
      }
    })
    if (typeof cb_progress === 'function') {
      req.upload.addEventListener('progress', cb_progress)
    }
    req.addEventListener('error', function(e) {
      reject(e)
    })
    req.open(method, url, true)
    req.withCredentials = Boolean(cookies)
    if (json_req === true) {
      req.setRequestHeader('Content-Type', 'application/json')
    }

    if (isNaN(timeout) === false) {
      timer = setTimeout(function(){
        req.abort()
        reject(timeout+'ms timeout')
      },timeout)
    }
    if (formData) {
      return req.send(formData)
    }
    if (data === undefined || data === null) {
      return req.send()
    }
    var d = (typeof data === 'string')? data : JSON.stringify(data)
    req.send(d)
  })
  p.req = req
  p.cancel = req.abort
  return p
}
