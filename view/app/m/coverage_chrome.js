Coverage.CoverageModel = class extends SDK.SDKModel {
  constructor (target) {
    super(target)
    this._cpuProfilerModel = target.model(SDK.CPUProfilerModel)
    this._cssModel = target.model(SDK.CSSModel)
    this._debuggerModel = target.model(SDK.DebuggerModel)
    this._coverageByURL = new Map()
    this._coverageByContentProvider = new Map()
  }

  start () {
    if (this._cssModel) {
      this._clearCSS()
      this._cssModel.startCoverage()
    }
    if (this._cpuProfilerModel) {
      this._cpuProfilerModel.startPreciseCoverage()
    }
    return !!(this._cssModel || this._cpuProfilerModel)
  }

  stop () {
    var pollPromise = this.poll()
    if (this._cpuProfilerModel) {
      this._cpuProfilerModel.stopPreciseCoverage()
    }
    if (this._cssModel) {
      this._cssModel.stopCoverage()
    }
    return pollPromise
  }

  async poll () {
    var updates = await Promise.all([
      this._takeCSSCoverage(),
      this._takeJSCoverage()
    ])
    return updates[0].concat(updates[1])
  }

  entries () {
    return Array.from(this._coverageByURL.values())
  }

  usageForRange (contentProvider, startOffset, endOffset) {
    var coverageInfo = this._coverageByContentProvider.get(contentProvider)
    return coverageInfo && coverageInfo.usageForRange(startOffset, endOffset)
  }

  _clearCSS () {
    for (var entry of this._coverageByContentProvider.values()) {
      if (entry.type() !== Coverage.CoverageType.CSS) {
        continue
      }
      var contentProvider = (entry.contentProvider())
      this._coverageByContentProvider.delete(contentProvider)
      var key = `${contentProvider.startLine}:${contentProvider.startColumn}`
      var urlEntry = this._coverageByURL.get(entry.url())
      if (!urlEntry || !urlEntry._coverageInfoByLocation.delete(key)) {
        continue
      }
      urlEntry._size -= entry._size
      urlEntry._usedSize -= entry._usedSize
      if (!urlEntry._coverageInfoByLocation.size) {
        this._coverageByURL.delete(entry.url())
      }
    }
  }

  async _takeJSCoverage () {
    if (!this._cpuProfilerModel) {
      return []
    }
    var rawCoverageData = await this._cpuProfilerModel.takePreciseCoverage()
    return this._processJSCoverage(rawCoverageData)
  }

  _processJSCoverage (scriptsCoverage) {
    var updatedEntries = []
    for (var entry of scriptsCoverage) {
      var script = this._debuggerModel.scriptForId(entry.scriptId)
      if (!script) {
        continue
      }
      var ranges = []
      for (var func of entry.functions) {
        for (var range of func.ranges) { ranges.push(range) }
      }
      var entry = this._addCoverage(
        script,
        script.contentLength,
        script.lineOffset,
        script.columnOffset,
        ranges
      )
      if (entry) {
        updatedEntries.push(entry)
      }
    }
    return updatedEntries
  }

  async _takeCSSCoverage () {
    if (!this._cssModel) {
      return []
    }
    var rawCoverageData = await this._cssModel.takeCoverageDelta()
    return this._processCSSCoverage(rawCoverageData)
  }

  _processCSSCoverage (ruleUsageList) {
    var updatedEntries = []
    var rulesByStyleSheet = new Map()
    for (var rule of ruleUsageList) {
      var styleSheetHeader = this._cssModel.styleSheetHeaderForId(rule.styleSheetId)
      if (!styleSheetHeader) {
        continue
      }
      var ranges = rulesByStyleSheet.get(styleSheetHeader)
      if (!ranges) {
        ranges = []
        rulesByStyleSheet.set(styleSheetHeader, ranges)
      }
      ranges.push({
        startOffset: rule.startOffset,
        endOffset: rule.endOffset,
        count: Number(rule.used)
      })
    }
    for (var entry of rulesByStyleSheet) {
      var styleSheetHeader = (entry[0])
      var ranges = (entry[1])
      var entry = this._addCoverage(styleSheetHeader, styleSheetHeader.contentLength, styleSheetHeader.startLine, styleSheetHeader.startColumn, ranges)
      if (entry) {
        updatedEntries.push(entry)
      }
    }
    return updatedEntries
  }
  static _convertToDisjointSegments (ranges) {
    ranges.sort((a, b) => a.startOffset - b.startOffset)
    var result = []
    var stack = []
    for (var entry of ranges) {
      var top = stack.peekLast()
      while (top && top.endOffset <= entry.startOffset) {
        append(top.endOffset, top.count)
        stack.pop()
        top = stack.peekLast()
      }
      append(entry.startOffset, top ? top.count : undefined)
      stack.push(entry)
    }
    while (stack.length) {
      var top = stack.pop()
      append(top.endOffset, top.count)
    }
    function append (end, count) {
      var last = result.peekLast()
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
  _addCoverage (contentProvider, contentLength, startLine, startColumn, ranges) {
    var url = contentProvider.contentURL()
    if (!url) {
      return null
    }
    var urlCoverage = this._coverageByURL.get(url)
    if (!urlCoverage) {
      urlCoverage = new Coverage.URLCoverageInfo(url)
      this._coverageByURL.set(url, urlCoverage)
    }
    var coverageInfo = urlCoverage._ensureEntry(contentProvider, contentLength, startLine, startColumn)
    this._coverageByContentProvider.set(contentProvider, coverageInfo)
    var segments = Coverage.CoverageModel._convertToDisjointSegments(ranges)
    if (segments.length && segments.peekLast().end < contentLength) {
      segments.push({
        end: contentLength
      })
    }
    var oldUsedSize = coverageInfo._usedSize
    coverageInfo.mergeCoverage(segments)
    if (coverageInfo._usedSize === oldUsedSize) {
      return null
    }
    urlCoverage._usedSize += coverageInfo._usedSize - oldUsedSize
    return coverageInfo
  }
}

Coverage.URLCoverageInfo = class {
  constructor (url) {
    this._url = url
    this._coverageInfoByLocation = new Map()
    this._size = 0
    this._usedSize = 0
    this._type
    this._isContentScript = false
  }
  url () {
    return this._url
  }
  type () {
    return this._type
  }
  size () {
    return this._size
  }
  usedSize () {
    return this._usedSize
  }
  unusedSize () {
    return this._size - this._usedSize
  }
  isContentScript () {
    return this._isContentScript
  }
  _ensureEntry (contentProvider, contentLength, lineOffset, columnOffset) {
    var key = `${lineOffset}:${columnOffset}`
    var entry = this._coverageInfoByLocation.get(key)
    if (entry) {
      return entry
    }
    entry = new Coverage.CoverageInfo(contentProvider, contentLength)
    if (entry.type() === Coverage.CoverageType.JavaScript && !this._coverageInfoByLocation.size) {
      this._isContentScript = (contentProvider).isContentScript()
    }
    this._coverageInfoByLocation.set(key, entry)
    this._size += contentLength
    this._type |= entry.type()
    return entry
  }
}

Coverage.CoverageInfo = class {
  constructor (contentProvider, size) {
    this._contentProvider = contentProvider
    this._size = size
    this._usedSize = 0
    if (contentProvider.contentType().isScript()) {
      this._coverageType = Coverage.CoverageType.JavaScript
    } else if (contentProvider.contentType().isStyleSheet()) {
      this._coverageType = Coverage.CoverageType.CSS
    } else {
      console.assert(false, `Unexpected resource type ${contentProvider.contentType().name} for ${contentProvider.contentURL()}`)
    }
    this._segments = []
  }
  contentProvider () {
    return this._contentProvider
  }
  url () {
    return this._contentProvider.contentURL()
  }
  type () {
    return this._coverageType
  }
  mergeCoverage (segments) {
    this._segments = Coverage.CoverageInfo._mergeCoverage(this._segments, segments)
    this._updateStats()
  }
  usageForRange (start, end) {
    var index = this._segments.upperBound(start, (position, segment) => position - segment.end)
    for (; index < this._segments.length && this._segments[index].end < end; ++index) {
      if (this._segments[index].count) {
        return true
      }
    }
    return index < this._segments.length && !!this._segments[index].count
  }
  static _mergeCoverage (segmentsA, segmentsB) {
    var result = []
    var indexA = 0
    var indexB = 0
    while (indexA < segmentsA.length && indexB < segmentsB.length) {
      var a = segmentsA[indexA]
      var b = segmentsB[indexB]
      var count = typeof a.count === 'number' || typeof b.count === 'number' ? (a.count || 0) + (b.count || 0) : undefined
      var end = Math.min(a.end, b.end)
      var last = result.peekLast()
      if (!last || last.count !== count) {
        result.push({
          end: end,
          count: count
        })
      } else {
        last.end = end
      }
      if (a.end <= b.end) {
        indexA++
      }
      if (a.end >= b.end) {
        indexB++
      }
    }
    for (; indexA < segmentsA.length; indexA++) {
      result.push(segmentsA[indexA])
    }
    for (; indexB < segmentsB.length; indexB++) {
      result.push(segmentsB[indexB])
    }
    return result
  }
  _updateStats () {
    this._usedSize = 0
    var last = 0
    for (var segment of this._segments) {
      if (segment.count) {
        this._usedSize += segment.end - last
      }
      last = segment.end
    }
  }
}

;Coverage.CoverageListView = class extends UI.VBox {
  constructor (filterCallback) {
    super(true)
    this._nodeForCoverageInfo = new Map()
    this._filterCallback = filterCallback
    this._highlightRegExp = null
    this.registerRequiredCSS('coverage/coverageListView.css')
    var columns = [{
      id: 'url',
      title: Common.UIString('URL'),
      width: '250px',
      fixedWidth: false,
      sortable: true
    }, {
      id: 'type',
      title: Common.UIString('Type'),
      width: '45px',
      fixedWidth: true,
      sortable: true
    }, {
      id: 'size',
      title: Common.UIString('Total Bytes'),
      width: '60px',
      fixedWidth: true,
      sortable: true,
      align: DataGrid.DataGrid.Align.Right
    }, {
      id: 'unusedSize',
      title: Common.UIString('Unused Bytes'),
      width: '100px',
      fixedWidth: true,
      sortable: true,
      align: DataGrid.DataGrid.Align.Right,
      sort: DataGrid.DataGrid.Order.Descending
    }, {
      id: 'bars',
      title: '',
      width: '250px',
      fixedWidth: false,
      sortable: true
    }]
    this._dataGrid = new DataGrid.SortableDataGrid(columns)
    this._dataGrid.setResizeMethod(DataGrid.DataGrid.ResizeMethod.Last)
    this._dataGrid.element.classList.add('flex-auto')
    this._dataGrid.element.addEventListener('keydown', this._onKeyDown.bind(this), false)
    this._dataGrid.addEventListener(DataGrid.DataGrid.Events.OpenedNode, this._onOpenedNode, this)
    this._dataGrid.addEventListener(DataGrid.DataGrid.Events.SortingChanged, this._sortingChanged, this)
    var dataGridWidget = this._dataGrid.asWidget()
    dataGridWidget.show(this.contentElement)
  }
  update (coverageInfo) {
    var hadUpdates = false
    var maxSize = coverageInfo.reduce((acc, entry) => Math.max(acc, entry.size()), 0)
    var rootNode = this._dataGrid.rootNode()
    for (var entry of coverageInfo) {
      var node = this._nodeForCoverageInfo.get(entry)
      if (node) {
        if (this._filterCallback(node._coverageInfo)) { hadUpdates = node._refreshIfNeeded(maxSize) || hadUpdates }
        continue
      }
      node = new Coverage.CoverageListView.GridNode(entry, maxSize)
      this._nodeForCoverageInfo.set(entry, node)
      if (this._filterCallback(node._coverageInfo)) {
        rootNode.appendChild(node)
        hadUpdates = true
      }
    }
    if (hadUpdates) {
      this._sortingChanged()
    }
  }
  reset () {
    this._nodeForCoverageInfo.clear()
    this._dataGrid.rootNode().removeChildren()
  }
  updateFilterAndHighlight (highlightRegExp) {
    this._highlightRegExp = highlightRegExp
    var hadTreeUpdates = false
    for (var node of this._nodeForCoverageInfo.values()) {
      var shouldBeVisible = this._filterCallback(node._coverageInfo)
      var isVisible = !!node.parent
      if (shouldBeVisible) {
        node._setHighlight(this._highlightRegExp)
      }
      if (shouldBeVisible === isVisible) {
        continue
      }
      hadTreeUpdates = true
      if (!shouldBeVisible) { node.remove() } else {
        this._dataGrid.rootNode().appendChild(node)
      }
    }
    if (hadTreeUpdates) {
      this._sortingChanged()
    }
  }
  _onOpenedNode () {
    this._revealSourceForSelectedNode()
  }
  _onKeyDown (event) {
    if (!isEnterKey(event)) {
      return
    }
    event.consume(true)
    this._revealSourceForSelectedNode()
  }
  async _revealSourceForSelectedNode () {
    var node = this._dataGrid.selectedNode
    if (!node) {
      return
    }
    var coverageInfo = (node)._coverageInfo
    var sourceCode = Workspace.workspace.uiSourceCodeForURL(coverageInfo.url())
    if (!sourceCode) {
      return
    }
    var content = await sourceCode.requestContent()
    if (TextUtils.isMinified(content)) {
      var formatData = await Sources.sourceFormatter.format(sourceCode)
      sourceCode = formatData.formattedSourceCode
    }
    if (this._dataGrid.selectedNode !== node) {
      return
    }
    Common.Revealer.reveal(sourceCode)
  }
  _sortingChanged () {
    var columnId = this._dataGrid.sortColumnId()
    if (!columnId) {
      return
    }
    var sortFunction
    switch (columnId) {
      case 'url':
        sortFunction = compareURL
        break
      case 'type':
        sortFunction = compareType
        break
      case 'size':
        sortFunction = compareNumericField.bind(null, 'size')
        break
      case 'bars':
      case 'unusedSize':
        sortFunction = compareNumericField.bind(null, 'unusedSize')
        break
      default:
        console.assert(false, 'Unknown sort field: ' + columnId)
        return
    }
    this._dataGrid.sortNodes(sortFunction, !this._dataGrid.isSortOrderAscending())
    function compareURL (a, b) {
      var nodeA = (a)
      var nodeB = (b)
      return nodeA._url.localeCompare(nodeB._url)
    }
    function compareNumericField (fieldName, a, b) {
      var nodeA = (a)
      var nodeB = (b)
      return nodeA._coverageInfo[fieldName]() - nodeB._coverageInfo[fieldName]() || compareURL(a, b)
    }
    function compareType (a, b) {
      var nodeA = (a)
      var nodeB = (b)
      var typeA = Coverage.CoverageListView._typeToString(nodeA._coverageInfo.type())
      var typeB = Coverage.CoverageListView._typeToString(nodeB._coverageInfo.type())
      return typeA.localeCompare(typeB) || compareURL(a, b)
    }
  }
  static _typeToString (type) {
    var types = []
    if (type & Coverage.CoverageType.CSS) {
      types.push(Common.UIString('CSS'))
    }
    if (type & Coverage.CoverageType.JavaScript) {
      types.push(Common.UIString('JS'))
    }
    return types.join('+')
  }
}

Coverage.CoverageListView.GridNode = class extends DataGrid.SortableDataGridNode {
  constructor (coverageInfo, maxSize) {
    super()
    this._coverageInfo = coverageInfo
    this._lastUsedSize
    this._url = coverageInfo.url()
    this._maxSize = maxSize
    this._highlightDOMChanges = []
    this._highlightRegExp = null
  }
  _setHighlight (highlightRegExp) {
    if (this._highlightRegExp === highlightRegExp) {
      return
    }
    this._highlightRegExp = highlightRegExp
    this.refresh()
  }
  _refreshIfNeeded (maxSize) {
    if (this._lastUsedSize === this._coverageInfo.usedSize() && maxSize === this._maxSize) {
      return false
    }
    this._lastUsedSize = this._coverageInfo.usedSize()
    this._maxSize = maxSize
    this.refresh()
    return true
  }
  createCell (columnId) {
    var cell = this.createTD(columnId)
    switch (columnId) {
      case 'url':
        cell.title = this._url
        var outer = cell.createChild('div', 'url-outer')
        var prefix = outer.createChild('div', 'url-prefix')
        var suffix = outer.createChild('div', 'url-suffix')
        var splitURL = /^(.*)(\/[^/]*)$/.exec(this._url)
        prefix.textContent = splitURL ? splitURL[1] : this._url
        suffix.textContent = splitURL ? splitURL[2] : ''
        if (this._highlightRegExp) {
          this._highlight(outer, this._url)
        }
        break
      case 'type':
        cell.textContent = Coverage.CoverageListView._typeToString(this._coverageInfo.type())
        break
      case 'size':
        cell.textContent = Number.withThousandsSeparator(this._coverageInfo.size() || 0)
        break
      case 'unusedSize':
        var unusedSize = this._coverageInfo.unusedSize() || 0
        var unusedSizeSpan = cell.createChild('span')
        var unusedPercentsSpan = cell.createChild('span', 'percent-value')
        unusedSizeSpan.textContent = Number.withThousandsSeparator(unusedSize)
        unusedPercentsSpan.textContent = Common.UIString('%.1f\xa0%%', unusedSize / this._coverageInfo.size() * 100)
        break
      case 'bars':
        var barContainer = cell.createChild('div', 'bar-container')
        var unusedSizeBar = barContainer.createChild('div', 'bar bar-unused-size')
        unusedSizeBar.style.width = (100 * this._coverageInfo.unusedSize() / this._maxSize).toFixed(4) + '%'
        var usedSizeBar = barContainer.createChild('div', 'bar bar-used-size')
        usedSizeBar.style.width = (100 * this._coverageInfo.usedSize() / this._maxSize).toFixed(4) + '%'
    }
    return cell
  }
  _highlight (element, textContent) {
    var matches = this._highlightRegExp.exec(textContent)
    if (!matches || !matches.length) {
      return
    }
    var range = new TextUtils.SourceRange(matches.index, matches[0].length)
    UI.highlightRangesWithStyleClass(element, [range], 'filter-highlight')
  }
}

;Coverage.CoverageView = class extends UI.VBox {
  constructor () {
    super(true)
    this._model = null
    this._pollTimer
    this._decorationManager = null
    this.registerRequiredCSS('coverage/coverageView.css')
    var toolbarContainer = this.contentElement.createChild('div', 'coverage-toolbar-container')
    var toolbar = new UI.Toolbar('coverage-toolbar', toolbarContainer)
    this._toggleRecordAction = (UI.actionRegistry.action('coverage.toggle-recording'))
    this._toggleRecordButton = UI.Toolbar.createActionButton(this._toggleRecordAction)
    toolbar.appendToolbarItem(this._toggleRecordButton)
    var startWithReloadAction = (UI.actionRegistry.action('coverage.start-with-reload'))
    this._startWithReloadButton = UI.Toolbar.createActionButton(startWithReloadAction)
    toolbar.appendToolbarItem(this._startWithReloadButton)
    this._clearButton = new UI.ToolbarButton(Common.UIString('Clear all'), 'largeicon-clear')
    this._clearButton.addEventListener(UI.ToolbarButton.Events.Click, this._clear.bind(this))
    toolbar.appendToolbarItem(this._clearButton)
    this._textFilterRegExp = null
    toolbar.appendSeparator()
    this._filterInput = new UI.ToolbarInput(Common.UIString('URL filter'), 0.4, 1, true)
    this._filterInput.setEnabled(false)
    this._filterInput.addEventListener(UI.ToolbarInput.Event.TextChanged, this._onFilterChanged, this)
    toolbar.appendToolbarItem(this._filterInput)
    toolbar.appendSeparator()
    this._showContentScriptsSetting = Common.settings.createSetting('showContentScripts', false)
    this._showContentScriptsSetting.addChangeListener(this._onFilterChanged, this)
    var contentScriptsCheckbox = new UI.ToolbarSettingCheckbox(this._showContentScriptsSetting, Common.UIString('Include extension content scripts'), Common.UIString('Content scripts'))
    toolbar.appendToolbarItem(contentScriptsCheckbox)
    this._coverageResultsElement = this.contentElement.createChild('div', 'coverage-results')
    this._landingPage = this._buildLandingPage()
    this._listView = new Coverage.CoverageListView(this._isVisible.bind(this, false))
    this._statusToolbarElement = this.contentElement.createChild('div', 'coverage-toolbar-summary')
    this._statusMessageElement = this._statusToolbarElement.createChild('div', 'coverage-message')
    this._landingPage.show(this._coverageResultsElement)
  }
  _buildLandingPage () {
    var recordButton = UI.createInlineButton(UI.Toolbar.createActionButton(this._toggleRecordAction))
    var reloadButton = UI.createInlineButton(UI.Toolbar.createActionButtonForId('coverage.start-with-reload'))
    var widget = new UI.VBox()
    var message = UI.formatLocalized('Click the record button %s to start capturing coverage.\n' + 'Click the reload button %s to reload and start capturing coverage.', [recordButton, reloadButton])
    message.classList.add('message')
    widget.contentElement.appendChild(message)
    widget.element.classList.add('landing-page')
    return widget
  }
  _clear () {
    this._model = null
    this._reset()
  }
  _reset () {
    if (this._decorationManager) {
      this._decorationManager.dispose()
      this._decorationManager = null
    }
    this._listView.reset()
    this._listView.detach()
    this._landingPage.show(this._coverageResultsElement)
    this._statusMessageElement.textContent = ''
    this._filterInput.setEnabled(false)
  }
  _toggleRecording () {
    var enable = !this._toggleRecordAction.toggled()
    if (enable) {
      this._startRecording()
    } else {
      this._stopRecording()
    }
  }
  _startWithReload () {
    var mainTarget = SDK.targetManager.mainTarget()
    if (!mainTarget) {
      return
    }
    var resourceTreeModel = (mainTarget.model(SDK.ResourceTreeModel))
    if (!resourceTreeModel) {
      return
    }
    this._model = null
    this._startRecording()
    resourceTreeModel.reloadPage()
  }
  _startRecording () {
    this._reset()
    var mainTarget = SDK.targetManager.mainTarget()
    if (!mainTarget) {
      return
    }
    if (!this._model) { this._model = new Coverage.CoverageModel(mainTarget) }
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.CoverageStarted)
    if (!this._model.start()) { return }
    this._decorationManager = new Coverage.CoverageDecorationManager(this._model)
    this._toggleRecordAction.setToggled(true)
    this._clearButton.setEnabled(false)
    this._startWithReloadButton.setEnabled(false)
    this._filterInput.setEnabled(true)
    if (this._landingPage.isShowing()) {
      this._landingPage.detach()
    }
    this._listView.show(this._coverageResultsElement)
    this._poll()
  }
  async _poll () {
    delete this._pollTimer
    var updates = await this._model.poll()
    this._updateViews(updates)
    this._pollTimer = setTimeout(() => this._poll(), 700)
  }
  async _stopRecording () {
    if (this._pollTimer) {
      clearTimeout(this._pollTimer)
      delete this._pollTimer
    }
    var updatedEntries = await this._model.stop()
    this._updateViews(updatedEntries)
    this._toggleRecordAction.setToggled(false)
    this._startWithReloadButton.setEnabled(true)
    this._clearButton.setEnabled(true)
  }
  async _updateViews (updatedEntries) {
    this._updateStats()
    this._listView.update(this._model.entries())
    this._decorationManager.update(updatedEntries)
  }
  _updateStats () {
    var total = 0
    var unused = 0
    for (var info of this._model.entries()) {
      if (!this._isVisible(true, info)) {
        continue
      }
      total += info.size()
      unused += info.unusedSize()
    }
    var percentUnused = total ? Math.round(100 * unused / total) : 0
    this._statusMessageElement.textContent = Common.UIString('%s of %s bytes are not used. (%d%%)', Number.bytesToString(unused), Number.bytesToString(total), percentUnused)
  }
  _onFilterChanged () {
    if (!this._listView) {
      return
    }
    var text = this._filterInput.value()
    this._textFilterRegExp = text ? createPlainTextSearchRegex(text, 'i') : null
    this._listView.updateFilterAndHighlight(this._textFilterRegExp)
    this._updateStats()
  }
  _isVisible (ignoreTextFilter, coverageInfo) {
    var url = coverageInfo.url()
    if (url.startsWith(Coverage.CoverageView._extensionBindingsURLPrefix)) { return false }
    if (coverageInfo.isContentScript() && !this._showContentScriptsSetting.get()) { return false }
    return ignoreTextFilter || !this._textFilterRegExp || this._textFilterRegExp.test(url)
  }
}

Coverage.CoverageView._extensionBindingsURLPrefix = 'extensions::'
Coverage.CoverageView.ActionDelegate = class {
  handleAction (context, actionId) {
    var coverageViewId = 'coverage'
    UI.viewManager.showView(coverageViewId).then(() => UI.viewManager.view(coverageViewId).widget()).then(widget => this._innerHandleAction((widget), actionId))
    return true
  }
  _innerHandleAction (coverageView, actionId) {
    switch (actionId) {
      case 'coverage.toggle-recording':
        coverageView._toggleRecording()
        break
      case 'coverage.start-with-reload':
        coverageView._startWithReload()
        break
      default:
        console.assert(false, `Unknown action: ${actionId}`)
    }
  }
}

;Coverage.RawLocation
Coverage.CoverageDecorationManager = class {
  constructor (coverageModel) {
    this._coverageModel = coverageModel
    this._textByProvider = new Map()
    this._uiSourceCodeByContentProvider = new Multimap()
    this._documentUISouceCodeToStylesheets = new WeakMap()
    for (var uiSourceCode of Workspace.workspace.uiSourceCodes()) {
      uiSourceCode.addLineDecoration(0, Coverage.CoverageDecorationManager._decoratorType, this)
    }
    Workspace.workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, this._onUISourceCodeAdded, this)
  }
  dispose () {
    for (var uiSourceCode of Workspace.workspace.uiSourceCodes()) { uiSourceCode.removeDecorationsForType(Coverage.CoverageDecorationManager._decoratorType) }
    Workspace.workspace.removeEventListener(Workspace.Workspace.Events.UISourceCodeAdded, this._onUISourceCodeAdded, this)
  }
  update (updatedEntries) {
    for (var entry of updatedEntries) {
      for (var uiSourceCode of this._uiSourceCodeByContentProvider.get(entry.contentProvider())) {
        uiSourceCode.removeDecorationsForType(Coverage.CoverageDecorationManager._decoratorType)
        uiSourceCode.addLineDecoration(0, Coverage.CoverageDecorationManager._decoratorType, this)
      }
    }
  }
  async usageByLine (uiSourceCode) {
    var result = []
    var sourceText = new TextUtils.Text(uiSourceCode.content() || '')
    await this._updateTexts(uiSourceCode, sourceText)
    var lineEndings = sourceText.lineEndings()
    for (var line = 0; line < sourceText.lineCount(); ++line) {
      var lineLength = lineEndings[line] - (line ? lineEndings[line - 1] : 0) - 1
      if (!lineLength) {
        result.push(undefined)
        continue
      }
      var startLocations = this._rawLocationsForSourceLocation(uiSourceCode, line, 0)
      var endLocations = this._rawLocationsForSourceLocation(uiSourceCode, line, lineLength)
      var used
      for (var startIndex = 0, endIndex = 0; startIndex < startLocations.length; ++startIndex) {
        var start = startLocations[startIndex]
        while (endIndex < endLocations.length && Coverage.CoverageDecorationManager._compareLocations(start, endLocations[endIndex]) >= 0) {
          ++endIndex
        }
        if (endIndex >= endLocations.length || endLocations[endIndex].id !== start.id) {
          continue
        }
        var end = endLocations[endIndex++]
        var text = this._textByProvider.get(end.contentProvider)
        if (!text) {
          continue
        }
        var textValue = text.value()
        var startOffset = Math.min(text.offsetFromPosition(start.line, start.column), textValue.length - 1)
        var endOffset = Math.min(text.offsetFromPosition(end.line, end.column), textValue.length - 1)
        while (startOffset <= endOffset && /\s/.test(textValue[startOffset])) {
          ++startOffset
        }
        while (startOffset <= endOffset && /\s/.test(textValue[endOffset])) {
          --endOffset
        }
        if (startOffset <= endOffset) { used = this._coverageModel.usageForRange(end.contentProvider, startOffset, endOffset) }
        if (used) { break }
      }
      result.push(used)
    }
    return result
  }
  _updateTexts (uiSourceCode, text) {
    var promises = []
    for (var line = 0; line < text.lineCount(); ++line) {
      for (var entry of this._rawLocationsForSourceLocation(uiSourceCode, line, 0)) {
        if (this._textByProvider.has(entry.contentProvider)) {
          continue
        }
        this._textByProvider.set(entry.contentProvider, null)
        this._uiSourceCodeByContentProvider.set(entry.contentProvider, uiSourceCode)
        promises.push(this._updateTextForProvider(entry.contentProvider))
      }
    }
    return Promise.all(promises)
  }
  async _updateTextForProvider (contentProvider) {
    var content = await contentProvider.requestContent()
    this._textByProvider.set(contentProvider, new TextUtils.Text(content))
  }
  _rawLocationsForSourceLocation (uiSourceCode, line, column) {
    var result = []
    var contentType = uiSourceCode.contentType()
    if (contentType.hasScripts()) {
      var location = Bindings.debuggerWorkspaceBinding.uiLocationToRawLocation(uiSourceCode, line, column)
      if (location && location.script()) {
        var script = location.script()
        if (script.isInlineScript() && contentType.isDocument()) {
          if (comparePositions(script.lineOffset, script.columnOffset, location.lineNumber, location.columnNumber) > 0 || comparePositions(script.endLine, script.endColumn, location.lineNumber, location.columnNumber) <= 0) {
            location = null
          } else {
            location.lineNumber -= script.lineOffset
            if (!location.lineNumber) {
              location.columnNumber -= script.columnOffset
            }
          }
        }
        if (location) {
          result.push({
            id: `js:${location.scriptId}`,
            contentProvider: location.script(),
            line: location.lineNumber,
            column: location.columnNumber
          })
        }
      }
    }
    if (contentType.isStyleSheet() || contentType.isDocument()) {
      var rawStyleLocations = contentType.isDocument() ? this._documentUILocationToCSSRawLocations(uiSourceCode, line, column) : Bindings.cssWorkspaceBinding.uiLocationToRawLocations(new Workspace.UILocation(uiSourceCode, line, column))
      for (var location of rawStyleLocations) {
        var header = location.header()
        if (!header) {
          continue
        }
        if (header.isInline && contentType.isDocument()) {
          location.lineNumber -= header.startLine
          if (!location.lineNumber) { location.columnNumber -= header.startColumn }
        }
        result.push({
          id: `css:${location.styleSheetId}`,
          contentProvider: location.header(),
          line: location.lineNumber,
          column: location.columnNumber
        })
      }
    }
    result.sort(Coverage.CoverageDecorationManager._compareLocations)
    function comparePositions (aLine, aColumn, bLine, bColumn) {
      return aLine - bLine || aColumn - bColumn
    }
    return result
  }
  _documentUILocationToCSSRawLocations (uiSourceCode, line, column) {
    var stylesheets = this._documentUISouceCodeToStylesheets.get(uiSourceCode)
    if (!stylesheets) {
      stylesheets = []
      var cssModel = this._coverageModel.target().model(SDK.CSSModel)
      if (!cssModel) {
        return []
      }
      for (var headerId of cssModel.styleSheetIdsForURL(uiSourceCode.url())) {
        var header = cssModel.styleSheetHeaderForId(headerId)
        if (header) {
          stylesheets.push(header)
        }
      }
      stylesheets.sort(stylesheetComparator)
      this._documentUISouceCodeToStylesheets.set(uiSourceCode, stylesheets)
    }
    var endIndex = stylesheets.upperBound(undefined, (unused, header) => line - header.startLine || column - header.startColumn)
    if (!endIndex) {
      return []
    }
    var locations = []
    var last = stylesheets[endIndex - 1]
    for (var index = endIndex - 1; index >= 0 && stylesheets[index].startLine === last.startLine && stylesheets[index].startColumn === last.startColumn; --index) {
      locations.push(new SDK.CSSLocation(stylesheets[index], line, column))
    }
    return locations
    function stylesheetComparator (a, b) {
      return a.startLine - b.startLine || a.startColumn - b.startColumn || a.id.localeCompare(b.id)
    }
  }
  static _compareLocations (a, b) {
    return a.id.localeCompare(b.id) || a.line - b.line || a.column - b.column
  }
  _onUISourceCodeAdded (event) {
    var uiSourceCode = (event.data)
    uiSourceCode.addLineDecoration(0, Coverage.CoverageDecorationManager._decoratorType, this)
  }
}

Coverage.CoverageDecorationManager._decoratorType = 'coverage'
Coverage.CoverageView.LineDecorator = class {
  decorate (uiSourceCode, textEditor) {
    var decorations = uiSourceCode.decorationsForType(Coverage.CoverageDecorationManager._decoratorType)
    if (!decorations || !decorations.size) {
      textEditor.uninstallGutter(Coverage.CoverageView.LineDecorator._gutterType)
      return
    }
    var decorationManager = (decorations.values().next().value.data())
    decorationManager.usageByLine(uiSourceCode).then(lineUsage => {
      textEditor.operation(() => this._innerDecorate(textEditor, lineUsage))
    }
    )
  }
  _innerDecorate (textEditor, lineUsage) {
    var gutterType = Coverage.CoverageView.LineDecorator._gutterType
    textEditor.uninstallGutter(gutterType)
    textEditor.installGutter(gutterType, false)
    for (var line = 0; line < lineUsage.length; ++line) {
      if (typeof lineUsage[line] !== 'boolean') { continue }
      var className = lineUsage[line] ? 'text-editor-coverage-used-marker' : 'text-editor-coverage-unused-marker'
      textEditor.setGutterDecoration(line, gutterType, createElementWithClass('div', className))
    }
  }
}
