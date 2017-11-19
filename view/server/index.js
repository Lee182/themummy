const http = require('http')
const path = require('path')
const fs = require('fs-extra')

const _ = require('lodash')
const express = require('express')
const app = express()
const server = http.Server(app)
const port = process.argv[2] || 3000
const bodyParser = require('body-parser')

app.use('/',
  express.static(path.resolve(__dirname + '/../dist')))
app.use(bodyParser.json())

const getScripts = async () => {
  let [index, filenames] = await Promise.all([
    fs.readJSON(path.resolve(__dirname, '../../cov/index-scripts-url.json')),
    fs.readdir(path.resolve(__dirname, '../../cov/scripts'))
  ])

  const files = await Promise.all(_.map(filenames, async (name) => {
    const buf = await fs.readFile(path.resolve(__dirname, `../../cov/scripts/${name}`))
    const scriptId = name.substr(0, name.length - 3)
    return {
      url: index[scriptId].url,
      scriptId,
      scriptSrc: buf.toString()
    }
  }))
  return files
}

const getIndexs = async () => {
  const filenames = await fs.readdir(path.resolve(__dirname, '../../cov/'))
  const indexs = _.filter(filenames, _.matches('index'))
  const out = {}
  await Promise.all(_.map(indexs, async (name) => {
    out[name] = await fs.readJSON(path.resolve(__dirname, '../../cov/' + name))
  }))
  return out
}

const getSnaps = async () => {
  const filenames = await fs.readdir(path.resolve(__dirname, '../../cov/snaps/'))
  const out = []
  await Promise.all(_.map(filenames, async (name) => {
    out[Number(name)] = await fs.readJSON(path.resolve(__dirname, '../../cov/snaps/' + name))
  }))
  return out
}

app.get('/coverage/indexs', async (req, res) => {
  const indexs = await getIndexs()
  res.json(indexs)
})
app.get('/coverage/files', async (req, res) => {
  const [scripts, snaps] = await Promise.all([
    getScripts(),
    getSnaps()
  ])
  res.json({scripts, snaps})
})

app.get('*', function (req, res, next) {
  // send / page for all over requests
  // TODO 404 page
  res.sendFile(path.resolve(__dirname + '/../dist/index.html'))
})

server.listen(port, function () {
  console.log('server listening at http://localhost:' + port)
})
