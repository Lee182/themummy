Array.prototype.last = function () { return this[this.length - 1] }

const file_to_ranges = (file) => {
  const aRange = []
  for (var func of file.functions) {
    for (var range of func.ranges) { aRange.push(range) }
  }
  return aRange
}

const ranges_to_segments = (ranges) => {
  ranges.sort((a, b) => a.startOffset - b.startOffset)
  var result = []
  var stack = []
  for (var entry of ranges) {
    var top = stack.last()
    while (top && top.endOffset <= entry.startOffset) {
      append(top.endOffset, top.count)
      stack.pop()
      top = stack.last()
    }
    append(entry.startOffset, top ? top.count : undefined)
    stack.push(entry)
  }
  while (stack.length) {
    var top = stack.pop()
    append(top.endOffset, top.count)
  }
  function append (end, count) {
    var last = result.last()
    if (last) {
      if (last.end === end) {
        return
      }
      if (last.count === count) {
        last.end = end
        return
      }
    }
    result.push({
      end: end,
      count: count
    })
  }
  return result
}

const merge_segments = (segmentsA, segmentsB) => {
  var result = []
  var indexA = 0
  var indexB = 0
  while (indexA < segmentsA.length && indexB < segmentsB.length) {
    var a = segmentsA[indexA]
    var b = segmentsB[indexB]
    var count = typeof a.count === 'number' || typeof b.count === 'number' ? (a.count || 0) + (b.count || 0) : undefined
    var snapId = _.uniq(a.end < b.end ? a.snapId :
      a.end === b.end ? _.flatten([a.snapId, b.snapId]) : b.snapId)

    var end = Math.min(a.end, b.end)
    var last = result.last()
    if (!last || last.count !== count) {
      result.push({end, count, snapId})
    } else {
      last.end = end
      last.snapId = _.uniq(last.snapId.concat(snapId))
    }

    a.end <= b.end ? indexA++ : null
    a.end >= b.end ? indexB++ : null
  }
  for (; indexA < segmentsA.length; indexA++) {
    result.push(segmentsA[indexA])
  }
  for (; indexB < segmentsB.length; indexB++) {
    result.push(segmentsB[indexB])
  }
  return result
}

const segment_to_usage = (segments, cb_used, cb_unused) => {
  segments.reduce((prev, cur) => {
    if (cur.count > 0) {
      cb_used(prev, cur) // from, to
    } else if (cur.count === 0) {
      cb_unused(prev, cur)
    }
    return cur
  })
}
const segment_to_usage_count = (segments) => {
  let count = 0
  segment_to_usage(segments, (from, to) => {
    count += to.end - from.end
  })
}

const merge_segmentss = (arr) => {
  return arr.reduce((prev, cur) => {
    return merge_segments(prev, cur)
  })
}

const merge_segmentss_snapId = (arr, arrIndex) => {
  const segsnaps = arr.map((arr2, i) => {
    return arr2.map(segment => {
      segment.snapId = [arrIndex[i]]
      return segment
    })
  })
  return segsnaps.reduce((prev, cur, i) => {
    return merge_segments(prev, cur)
  })
}

module.exports = {
  file_to_ranges,
  ranges_to_segments,
  merge_segments,
  merge_segmentss,
  merge_segmentss_snapId,
  segment_to_usage,
  segment_to_usage_count
}
