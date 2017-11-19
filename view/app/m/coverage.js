w.KolorWheel = require('kolorwheel')
w.prism = require('prismjs')
const cbase = new KolorWheel('#ab0000')
const ctarget = cbase.abs('#00ab59', 101)

Array.prototype.last = function () { return this[this.length - 1] }
const coverage = require('./coverage_utils.js')
const bs = require('binary-search')

module.exports = function ({data, methods}) {
  data.coverage = {}
  data.coverage.root = 'https://blogjono.com/'
  data.coverage.active = false
  data.coverage.scripts = {}
  data.coverage.indexs = {}
  data.coverage.scriptId = ''

  methods.script__toLineOffset = function (src) {
    let sum = 0
    const offset = _.reduce(src.split('\n'), (arr, line) => {
      sum += line.length + 1
      arr.push(sum)
      return arr
    }, [])
    offset[offset.length - 1] -= 1
    return offset
  }

  methods.fScript__toLineOffset2 = function (sSrc, iMaxChars = 80) {
    let iLineoffset = 0
    let iNewLineOffset = 0
    let aoLine = []
    let str = ''
    let l = sSrc.length - 1
    sSrc.split('').forEach((sChar, iIndex)=>{
      const bNewLine = sChar === '\n'
      const bSoftLine = str.length === iMaxChars
      str += sChar
      if (bNewLine || bSoftLine || iIndex === l) {
        aoLine.push({text: str, iLineoffset, iNewLineOffset, iIndex})
        str = ''
        iNewLineOffset = bNewLine ? iNewLineOffset + 1 : iNewLineOffset
        iLineoffset = bNewLine ? 0 : iLineoffset +1
      }
    })
    return aoLine
  }

  methods.coverage_getScriptsSrc = function () {
    const vm = this
    w.request({url: '/coverage/files', json: true}).then(({scripts, snaps}) => {
      vm.coverage.scripts = _.reduce(scripts, (o, script) => {
        o[script.scriptId] = script
        return o
      }, {})
      vm.coverage.snaps = snaps
    })
  }

  methods.coverage_getIndexs = function () {
    let vm = this
    return w.request({url: '/coverage/indexs', json: true}).then((indexs) => {
      vm.coverage.indexs = indexs
      vm.nav.links = _.map(indexs['index-scripts-url.json'], ({url, scriptId}) => {
        const text = url.split(vm.coverage.root).join('')
        return {text, scriptId}
      })
    })
  }

  methods.coverage_open = function (scriptId) {
    let vm = this
    vm.coverage.scriptId = scriptId
    vm.load_coverage_view(vm.coverage.scripts[scriptId])
    vm.coverage.active = true
  }

  methods.coverage_percent = function ({percent}) {
    return typeof percent !== 'number' ? '' :
      percent >= 1 ? '✔' :
      percent <= 0 ? '✘' :
        Math.floor(percent * 100)
  }

  methods.load_coverage_view = function (script) {
    console.time('load_coverage_view')
    let vm = this
    script.aoLine = vm.fScript__toLineOffset2(script.scriptSrc)
    const { scriptId, scriptSrc, aoLine } = script


    // cm.setValue(scriptSrc)
    console.log(coverage)
    // load all script snaps
    const aSnapIndex = vm.coverage.indexs['index-script-snaps.json'][scriptId]

    const snaps = aSnapIndex.map(snapId => {
      return _.find(vm.coverage.snaps[snapId], {scriptId})
    })
    const rangess = _.map(snaps, (snap) => {
      return coverage.file_to_ranges(snap)
    })
    const segmentss = _.map(rangess, (ranges) => {
      return coverage.ranges_to_segments(ranges)
    })
    const segments_withid = coverage.merge_segmentss_snapId(segmentss, aSnapIndex)

    let count = 0
    coverage.segment_to_usage(segments_withid,
      (from, to) => {
        // used
        count += to.end - from.end
        methods.fhighlight({aoLine, oFrom: from, oTo: to})
        // const fromPos = vm.offset_to_position(from, lineOffset)
        // const toPos = vm.offset_to_position(to, lineOffset)
        // cm.markText(fromPos, toPos, {className: `david to-${to.snapId} count-${to.count}`})
      },
      (from, to) => {
        // unused
        // const fromPos = vm.offset_to_position(from, lineOffset)
        // const toPos = vm.offset_to_position(to, lineOffset)
        // cm.markText(fromPos, toPos, {className: `goliath from-${to.snapId} count-${to.count}`})
      })
      console.timeEnd('load_coverage_view')
      
      vm.comparerr()

    const i = _.findIndex(vm.nav.links, {scriptId: Number(scriptId)})
    const item = vm.nav.links[i]
    item.percent = count / aoLine.last().iIndex
    Vue.set(vm.nav.links, i, item)
    // generate percentage
  }

  methods.percent_to_color = (percent) => {
    if (percent === undefined) { return 'transparent' }
    const n = percent > 1 ? 100 :
              percent < 0 ? 0 : Math.floor(percent * 100)
    return ctarget.get(n).getHex()
  }

  methods.fhighlight = function({aoLine, oFrom, oTo}) {
    let oLineFrom = vm.findLine(aoLine, oFrom.end)
    let oLineTo = vm.findLine(aoLine, oTo.end)

    let bOneLine = oLineFrom.line === oLineTo.line
    let fmark = methods.fmark.bind(vm, oFrom, oTo)

    if (bOneLine) {
      aoLine[oLineFrom.line].text = vm.lineSplit({sText: aoLine[oLineFrom.line].text, iCutStart: oLineFrom.ch, iCutEnd: oLineTo.ch, fMap: fmark})      
    }
    if (!bOneLine) {
      aoLine[oLineFrom.line].text = vm.lineSplit({sText: aoLine[oLineFrom.line].text, iCutStart: oLineFrom.ch, iCutEnd: 81, fMap: fmark})

      methods.fEach_between(oLineFrom.line, oLineTo.line, (i)=>{
        aoLine[i].text = vm.lineSplit({bFull: true, sText: aoLine[i].text, fMap: fmark})
      })
      
      if (aoLine[oLineTo.line] !== undefined) {
        aoLine[oLineTo.line].text = vm.lineSplit({sText: aoLine[oLineTo.line].text, iCutStart: 0, iCutEnd: oLineTo.ch, fMap: fmark})
      }
    }
    // split lineFrom insert object, modifys aoLine
    // split lineTo insect oxject, modifys aoLine
    // if lines in between a , b foreach split line at 0
  }

  methods.fmark = (oFrom, oTo, sText)=>{
    return {sText, oFrom, oTo}
  }

  methods.fEach_between = function(iStart, iEnd, fMap) {
    for (let i = iStart + 1; i < iEnd; i++) {
      fMap(i)
    }
  }

  methods.f_string_empty = (s)=>(s === '' && typeof s === 'string' ? false : true)

  methods.lineSplit = function({sText, iCutStart, iCutEnd, fMap, bFull = false}) {
    let vm = this
    if (typeof sText === 'string') {
      if (bFull) {
        return [fMap(sText)]
      }
      let out =  _.filter([
        sText.substring(0, iCutStart),
        fMap(sText.substring(iCutStart, iCutEnd-1)),
        sText.substring(iCutEnd-1, 81)      
      ], vm.f_string_empty)
      let outs = vm.sText_str(out)
      if (outs !== sText) {
        debugger
      }
      return out
    }

    if (Array.isArray(sText)) {
      const last = sText.last()
      if (typeof last === 'string') {
        const l = vm.sText_length(sText)
        iCutStart = iCutStart - l + last.length -1
        iCutEnd = iCutEnd - l + last.length
        const ls = vm.sText_str(sText)
        sText[sText.length - 1] = methods.lineSplit({
          sText: last,
          iCutStart,
          iCutEnd,
          fMap, bFull
        })
        let out = _.flatten(sText)
        const l2 = vm.sText_length(out)
        ls2 = vm.sText_str(out)
        if (l !== l2) {
          debugger
        }
        
        return out
      }
    }
    return sText
  }

  methods.sText_length = function(sText){
    return sText.reduce((acc, node)=>{
      return acc + (typeof node === 'string' ? node.length : node.sText.length)
    }, 0)
  }

  methods.sText_str = function(sText){
    return sText.reduce((acc, node)=>{
      return acc + (typeof node === 'string' ? node : node.sText)
    }, '')
  }

  methods.findLine = (aoLine, offset)=>{
    const res = bs(aoLine, offset, (a,b)=>{return a.iIndex - b})
    const line = (res < 0 ? Math.abs(res + 1) : res)
    const lastIndex = line === 0 ? 0 : aoLine[line - 1].iIndex
    const ch = offset - lastIndex
    return {line, ch}
  }

  methods.offset_to_position = (segment, lineOffset) => {
    const offset = segment.end
    // if (offset === 0) { return {line: 1, ch: 1} }
    const result = bs(lineOffset, offset, (a, b) => {
      return a - b
    })
    const line = result < 0 ? Math.abs(result + 1) : result
    const ch = offset - lineOffset[line - 1]
    return {line, ch}
  }


  methods.comparerr = function(){
    let vm = this
    let c = vm.coverage.scriptId
    let a =  vm.coverage.scripts[c].scriptSrc
    let b = vm.coverage.scripts[c].aoLine.reduce((str, node)=>{
      if (typeof node.text === 'string') {
        str += node.text
      }
      if (Array.isArray(node.text)) {
        str += node.text.reduce((acc, text)=>{
          return acc + (typeof text === 'string' ? text : text.sText)
        }, '')
      }
      return str
    }, '')
    console.log(a === b, a.length, b.length)
  }

}



// vm.lineSplit({sText: 'abcde', iCutStart: 1, iCutEnd: 3, fMap: (a)=>({a:a})})
