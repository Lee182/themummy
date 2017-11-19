const chromeDebug = require('chrome-remote-interface')
const chromeLauncher = require('chrome-launcher')
const path = require('path')
const fs = require('fs-extra')
const _ = require('lodash')

// jonos keys
// m stands for methods
// mc stands for call
// s stands for store
// ss stands for store.set
// sg stands for store.get
// sl stands for store lock
// slg stands for store lock get
// sls stands for store lock set

const m = {}
const s = {}
const sl = {}
const sls = (fnName, varName, val) => {
  // fnName or fnNames to lock requests to
}
const ss = (apath, value) => {
  _.set(s, apath, value)
}
const sg = (apath) => {
  return _.get(s, apath)
}
const ms = (strPath, fn) => {
  if (typeof fn !== 'function') {
    throw new Error(`m is only a store of methods`)
  }
  if (_.get(m, strPath)) {
    throw new Error(`m name already taken`)
  }
  _.set(m, strPath, fn)
}
const mg = (strPath) => {
  const fn = _.get(m, strPath)
  if (typeof fn !== 'function') {
    throw new Error(`m at "${strPath}" is not a function`)
  }
  return fn
}
const mc = (strPath, ...args) => {
  console.timeEnd('    ')
  const fn = mg(strPath)
  console.log(`m: ${strPath}`)
  console.time('    ')
  return fn(...args)
}

ms('setup', () => {
  ss('out path', path.resolve('./cov'))
  ss('snaps path', path.join(sg('out path'), 'snaps'))
  ss('scripts path', path.join(sg('out path'), 'scripts'))
  ss('scripts', {})
})

ms('chrome launch', () => {
  return chromeLauncher.launch({
    startingUrl: 'about:blank',
    chromePath: '/bin/chromium',
    port: 1111
  }).catch(err=>{
    console.log(err)
  })
})

ms('chrometools setup', (client, tools) => {
  return Promise.all([
    _.map(tools, (tool) => { return client[tool].enable() })
  ])
})

ms('chrometools save script', async (scriptId, Debugger) => {
  try {
    const {scriptSource} = await Debugger.getScriptSource({scriptId})
    await fs.outputFile(path.resolve(sg('scripts path'), `${scriptId}.js`), scriptSource)
  } catch (err) {
    console.log(err)
  }
})

ms('string ends with .js', (name) => {
  const l = name.length
  return name.substr(l - 3, 3) === '.js'
})

ms('string omit ext', (n = 3) => {
  return (name) => {
    const l = name.length
    return name.substr(0, l - n)
  }
})

ms('write scriptUrls', async () => {
  let scriptfiles = await fs.readdir(sg('scripts path'))
  scriptfiles = _.filter(scriptfiles, mg('string ends with .js'))
  scriptfiles = _.map(scriptfiles, mc('string omit ext', 3))
  const scriptIndexObj = _.cloneDeep(sg('scripts'))
  const scriptIndexArr = _.map(scriptIndexObj, (value) => { return value })
  _.remove(scriptIndexArr, (script) => {
    return !_.includes(scriptfiles, script.scriptId)
  })
  const index = _.reduce(scriptIndexArr, (o, script) => {
    _.set(script, 'scriptId', Number(script.scriptId))
    return _.set(o, script.scriptId, script)
  }, {})
  await fs.outputJSON(
    path.resolve(sg('out path'), 'index-scripts-url.json'),
    index,
    {spaces: 2}
  )
})

ms('coverage setup', async (client) => {
  await mc('page goto', client, 'about:blank')
  await Promise.all([
    client.Profiler.start(),
    client.Profiler.startPreciseCoverage()
  ])
})

ms('coverage snapsave', (() => {
  let i = 0
  return async (snap) => {
    ss(`coverage.snaps[${i}]`, snap)
    await fs.outputJSON(`${sg('snaps path')}/${i}`, snap, {spaces: 2})
    i++
  }
})())

ms('coverage snapshot', async (client, bRetartProfiler = true) => {
  let {result: snap} = await client.Profiler.takePreciseCoverage()
  snap = _.filter(snap, (o) => { return o.url !== '' }),
  // snap = _.map(snap, fn => {
  //   fn.functions = fn.functions.filter(fn => {
  //     return (fn.ranges.length === 1 && fn.ranges[0].count > 0) || fn.ranges.length > 1
  //   })
  //   return fn
  // })

  await mc('coverage snapsave', snap)
  const saveabelScriptIds = _.reduce(snap, (arr, file) => {
    const script = sg(['scripts', file.scriptId])
    if (script !== undefined) {
      return arr
    }
    ss(['scripts', file.scriptId], _.pick(file, ['scriptId', 'url']))
    arr.push(file.scriptId)
    return arr
  }, [])
  await Promise.all(_.map(saveabelScriptIds, (id) => {
    return mc('chrometools save script', id, client.Debugger)
  }))
  if (bRetartProfiler) {
    await client.Profiler.startPreciseCoverage()
  }
})

ms('rm cov, scripts', () => {
  fs.remove(sg('out path'))
  // return Promise.all([
  //   fs.remove(sg('snaps path')),
  //   fs.remove(sg('scripts path'))
  // ])
})

ms('page hookload once', (client, fn) => {
  client.Page.loadEventFired(_.once(() => {
    mc(fn, client)
  }))
})

ms('page goto', (client, url) => {
  return client.Page.navigate({url})
})

ms('page firstload', async (client) => {
  try {
    await mc('user script', client)
    await client.close()
  } catch (err) {
    console.error(err)
    client.close()
  }
})

ms('wait s', (n) => {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, n * 1000)
  })
})

ms('user script', async (client) => {
  await mc('coverage snapshot', client)
  await mc('click', client, '.nav > div:nth-child(2)')
  await mc('wait s', 1)
  await mc('coverage snapshot', client)
  await mc('click', client, '#webdev > div > div:nth-child(2)')
  await mc('wait s', 20)
  await mc('coverage snapshot', client, false)
  await mc('end')
})

ms('click xy', async (client, {x, y, button = 'left', clickCount = 1}) => {
  const options = { x, y, button, clickCount }
  options.type = 'mousePressed'
  await client.Input.dispatchMouseEvent(options)
  options.type = 'mouseReleased'
  await client.Input.dispatchMouseEvent(options)
})

ms('click', async (client, selector) => {
  const el = await mc('querySelector', client, selector)
  const rect = await mc('el to rect', client, el)
  // todo error if no rect
  // todo error if size is too small
  let x = []
  let y = []
  _.each(rect.model.padding, (n, i) => {
    const tmp = (i % 2 === 0) ? x : y
    tmp.push(n)
  })
  x = mc('arr average', x)
  y = mc('arr average', y)
  await mc('click xy', client, {x, y})
})

ms('arr average', (arr) => {
  const sum = _.reduce(arr, (total, n) => {
    return n + total
  }, 0)
  return sum / arr.length
})

ms('querySelector', async (client, selector) => {
  const {DOM} = client
  const doc = await DOM.getDocument()
  const el = await DOM.querySelector({
    selector,
    nodeId: doc.root.nodeId
  })
  return el
})

ms('el to rect', async (client, el) => {
  const {DOM} = client
  const rect = await DOM.getBoxModel({nodeId: el.nodeId})
  return rect
})

ms('write indexs', async () => {
  let fileIndex = {}
  let snapIndex = {}
  const snapsdir = sg('snaps path')
  const snapfilenames = await fs.readdir(snapsdir)
  await Promise.all(_.map(snapfilenames, async (filename) => {
    const snap = await fs.readJSON(path.resolve(snapsdir, filename))

    _.each(snap, (coverage) => {
      // scirpt ref snaps
      if (fileIndex[coverage.scriptId] === undefined) {
        fileIndex[coverage.scriptId] = []
      }
      fileIndex[coverage.scriptId].push(Number(filename))

      // snap ref scripts
      if (snapIndex[filename] === undefined) {
        snapIndex[filename] = []
      }
      snapIndex[filename].push(Number(coverage.scriptId))
    })
  }))
  snapIndex = mc('sort index', snapIndex)
  fileIndex = mc('sort index', fileIndex)
  await Promise.all([
    fs.writeJSON(path.resolve(sg('out path'), 'index-snap-scripts.json'), snapIndex, {spaces: 2}),
    fs.writeJSON(path.resolve(sg('out path'), 'index-script-snaps.json'), fileIndex, {spaces: 2})
  ])
})

ms('sort index', (index) => {
  return _.chain(_.keys(index))
  .sortBy()
  .reduce((o, ikey) => {
    return _.set(o, ikey, _.sortBy(index[ikey]))
  }, {})
  .value()
})

ms('main', async (client) => {
  try {
    await mc('setup')
    await mc('rm cov, scripts')
    await mc('chrometools setup', client, ['Network', 'Page', 'Profiler', 'Debugger', 'Runtime', 'DOM'])
    await mc('coverage setup', client)
    await mc('page hookload once', client, 'page firstload')
    await mc('page goto', client, 'https://blogjono.com')
  } catch (err) {
    console.error(err)
    client.close(() => {
      process.exit()
    })
  }
})

ms('start', async () => {
  const chrome = await mc('chrome launch')
  ss('chrome', chrome)
  const chromedebug = chromeDebug({port: 1111}, mg('main'))
  chromedebug.on('error', (err) => {
    // cannot connect to the remote endpoint
    console.error(err)
    debugger
  })
})

ms('end', async() => {
  await Promise.all([
    mc('write scriptUrls'),
    mc('write indexs'),
    sg('chrome').kill()
  ])
})

mc('start')
