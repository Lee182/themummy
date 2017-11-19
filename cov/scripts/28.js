(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
require('./lib/jonoShortcuts.js')
var scroll_setup = require('./scroll_setup.js')
var txt = require('./txt.js')

var vue_o = {
  el: '#app',
  data: {
    txt,
    nav: {
      items: [
        {id: 'about', name: 'about'},
        {id: 'webdev', name: 'web development'},
        {id: 'contact', name: 'contact'}
      ],
      show_menu: false,
      active: 'about',
      smallscreen: false
    }
  },
  methods: {
    newtab: function (url) {
      var win = window.open(url, '_blank')
      win.addEventListener('load', () => {
        win.focus()
        console.log('ok')
      })
      console.log('ok')
      return win
    },
    send_email: function (e) {
      // form submit event
      let vm = this
      let name = d.qs('#inputName').value
      let email = d.qs('#inputEmail').value
      let body = d.qs('#message').value
      var str = `mailto:jono-lee@hotmail.co.uk?subject=${name}, contact form blogjono.com &body=${body}`
      vm.newtab(str)
      e.preventDefault()
    }
  },

  mounted: function () {
    let vm = this
    vm.nav_resizing__init()
    vm.scroll__init()
  }
}
scroll_setup(vue_o) // TODO improve nav item active, by percentage of el in view

w.vm = new Vue(vue_o)

},{"./lib/jonoShortcuts.js":5,"./scroll_setup.js":6,"./txt.js":7}],2:[function(require,module,exports){
/*!
 * enquire.js v2.1.2 - Awesome Media Queries in JavaScript
 * Copyright (c) 2014 Nick Williams - http://wicky.nillia.ms/enquire.js
 * License: MIT (http://www.opensource.org/licenses/mit-license.php)
 */

!function(a,b,c){var d=window.matchMedia;"undefined"!=typeof module&&module.exports?module.exports=c(d):"function"==typeof define&&define.amd?define(function(){return b[a]=c(d)}):b[a]=c(d)}("enquire",this,function(a){"use strict";function b(a,b){var c,d=0,e=a.length;for(d;e>d&&(c=b(a[d],d),c!==!1);d++);}function c(a){return"[object Array]"===Object.prototype.toString.apply(a)}function d(a){return"function"==typeof a}function e(a){this.options=a,!a.deferSetup&&this.setup()}function f(b,c){this.query=b,this.isUnconditional=c,this.handlers=[],this.mql=a(b);var d=this;this.listener=function(a){d.mql=a,d.assess()},this.mql.addListener(this.listener)}function g(){if(!a)throw new Error("matchMedia not present, legacy browsers require a polyfill");this.queries={},this.browserIsIncapable=!a("only all").matches}return e.prototype={setup:function(){this.options.setup&&this.options.setup(),this.initialised=!0},on:function(){!this.initialised&&this.setup(),this.options.match&&this.options.match()},off:function(){this.options.unmatch&&this.options.unmatch()},destroy:function(){this.options.destroy?this.options.destroy():this.off()},equals:function(a){return this.options===a||this.options.match===a}},f.prototype={addHandler:function(a){var b=new e(a);this.handlers.push(b),this.matches()&&b.on()},removeHandler:function(a){var c=this.handlers;b(c,function(b,d){return b.equals(a)?(b.destroy(),!c.splice(d,1)):void 0})},matches:function(){return this.mql.matches||this.isUnconditional},clear:function(){b(this.handlers,function(a){a.destroy()}),this.mql.removeListener(this.listener),this.handlers.length=0},assess:function(){var a=this.matches()?"on":"off";b(this.handlers,function(b){b[a]()})}},g.prototype={register:function(a,e,g){var h=this.queries,i=g&&this.browserIsIncapable;return h[a]||(h[a]=new f(a,i)),d(e)&&(e={match:e}),c(e)||(e=[e]),b(e,function(b){d(b)&&(b={match:b}),h[a].addHandler(b)}),this},unregister:function(a,b){var c=this.queries[a];return c&&(b?c.removeHandler(b):(c.clear(),delete this.queries[a])),this}},new g});

},{}],3:[function(require,module,exports){
module.exports = function(){
  var events = {}
  var eventsystem = {
    on: function (eventName, fn) {
      events[eventName] = events[eventName] || []
      events[eventName].push(fn)
    },
    off: function(eventName, fn) {
      if (events[eventName]) {
        for (var i = 0; i < events[eventName].length; i++) {
          if (events[eventName][i] === fn) {
            events[eventName].splice(i, 1)
            break
          }
        }
      }
    },
    emit: function (eventName, data) {
      if (events[eventName]) {
        events[eventName].forEach(function(fn) {
          fn(data)
        })
      }
    }
  }
  eventsystem.events = events
  return eventsystem
}

},{}],4:[function(require,module,exports){
// spy = require('jonoScrollspy.js')
// scrollableEl = d.qs('.main')
// myspy = spy(scrollableEl)
// spy.init()
// cb = function({case: true|false, el}){}
// spy.watch(el, cb)
// spy.watch(anotherEl, cb)

var eventsSystem = require('./eventSystem.js')

function spy(scrollableEl) {
  var eve = eventsSystem()
  _frame = scrollableEl
  _watchin = []
  function init(){
    scrollableEl.on('scroll', refresh)
    w.on('resize', refresh)
  }
  function destroy(){
    scrollableEl.off('scroll', refresh)
    w.off('resize', refresh)
  }
  function refresh() {
    // update could be throttled
    _watchin = _watchin.map(function(o){
      let scrolloci = _frame.scrollTop

      if (o.el === 'top') {
        if (scrolloci === 0) {
          o.cb()
        }
        return o
      }
      if (o.el === 'bottom') {
        if (scrolloci === _frame.scrollTopMax) {
          o.cb()
        }
        return o
      }
      // o.frect = _frame.getBoundingClientRect()
      // o.erect = o.el.getBoundingClientRect()
      let y = -1*(_frame.getBoundingClientRect().top - o.el.getBoundingClientRect().top - _frame.scrollTop)
      let cond = scrolloci >= y

      if (cond === true && o.cond === false ||
      cond === false && o.cond === true /* scrolling up */) {
        if (typeof o.cb === 'function') {
          o.cb({
            is_scrolling_down: cond,
            is_scrolling_up: !cond,
            el: o.el
          })
        }
      }

      o.y = y
      o.scrolloci = scrolloci
      o.cond = cond
      return o
    })
  }
  function watch(el, cb) {
    _watchin.push({
      el: el,
      cb: cb
    })
  }
  return {
    init: init,
    destroy: destroy,
    refresh: refresh,
    watch: watch,
    _watchin: _watchin
  }
}

module.exports = spy

},{"./eventSystem.js":3}],5:[function(require,module,exports){
// Base Browser stuff
window.w = window
w.D = Document
w.d = document

Element.prototype.qs = Element.prototype.querySelector
Element.prototype.qsa = Element.prototype.querySelectorAll
D.prototype.qs = Document.prototype.querySelector
D.prototype.qsa = Document.prototype.querySelectorAll

EventTarget.prototype.on = EventTarget.prototype.addEventListener
EventTarget.prototype.off = EventTarget.prototype.removeEventListener
EventTarget.prototype.emit = EventTarget.prototype.dispatchEvent

// http://stackoverflow.com/questions/11761881/javascript-dom-find-element-index-in-container
Element.prototype.getNodeIndex = function() {
  var node = this
  var index = 0;
  while ( (node = node.previousSibling) ) {
    if (node.nodeType != 3 || !/^\s*$/.test(node.data)) {
        index++;
    }
  }
  return index;
}

NodeList.prototype.toArray = function() {
  return Array.prototype.map.call(this, function(item){
    return item
  })
}

HTMLCollection.prototype.toArray = function() {
  return NodeList.prototype.toArray.call(this)
}

Node.prototype.prependChild = function(el) {
  var parentNode = this
  parentNode.insertBefore(el, parentNode.firstChild)
}

},{}],6:[function(require,module,exports){
var enquire = require('./lib/enquire.min.js')
w.zenscroll = require('zenscroll')
w.spyScroll = require('./lib/jonoScrollspy.js')

module.exports = function({data, methods}) {

  methods.nav_resizing__init = function(){
    let vm = this
    // media queries within js
    enquire.register('screen and (max-width: 500px)', {
      deferSetup: false,
      setup: function() {},
      match : function() {
        vm.nav.smallscreen = true
      },
      unmatch : function() {
        vm.nav.smallscreen = false
        vm.nav.show_menu = false
      }
    })
  }


  var main = undefined

  // scroll whereabouts and animated scroll
  methods.scroll__init = function() {
    let vm = this

    main = d.qs('.main')
    var spy = spyScroll(main)
    spy.init()

    function spyCb(o){
      // console.log('spy:',o)
      if (o.is_scrolling_down){
        vm.nav.active = o.el.id
      }
      if (o.is_scrolling_up) {
        // vm.nav.active = o.el.id
        // goto prev el
        let i = vm.nav.items.findIndex(function(item){
          return item.id === o.el.id
        })
        if (i === 0) {i++}
        var item = vm.nav.items[i-1]
        vm.nav.active = item.id
      }
    }

    vm.nav.items.forEach(function(item){
      spy.watch(d.qs('#'+item.id), spyCb)
    })
    spy.watch('bottom', function(){
      const last = vm.nav.items[vm.nav.items.length-1]
      console.log('spy: bottom')
      vm.nav.active = last.id
    })
    spy.watch('top', function(){
      const first = vm.nav.items[0]
      console.log('spy: top')
      vm.nav.active = first.id
    })


    w.zs = zenscroll.createScroller(main, 500, 0)

  }

  methods.nav_scroll = function(id) {
    let vm = this
    let el = d.qs('#'+id)
    if (el === null || main === undefined || zs === undefined) {return}
    let y = -1*(main.getBoundingClientRect().top - el.getBoundingClientRect().top - main.scrollTop)
    y = Math.round(y)

    console.log("nav_scroll:", id, y)
    if ( zs.moving() ) { zs.stop() }
    zs.toY(y, 500, function(){
      vm.nav.active = id
    })
  }
}

},{"./lib/enquire.min.js":2,"./lib/jonoScrollspy.js":4,"zenscroll":8}],7:[function(require,module,exports){
module.exports = {
  fullname: 'Jonathan T L Lee',
  section2: {
    scrollid: 'about',
    heading: 'About me',
    portrait: '/headshot.jpg', // 'https://avatars3.githubusercontent.com/u/11339630?v=3&s=466',
    portrait_alt: 'a portrait photo of Jonathan Lee smiling',
    para: `
Hello!
<br><br>
I'm a Javascript Fullstack Developer from Mansfield, GB.
<br><br>
Welcome to my portfolio page, here you can see the product/s of my web development learning.
<br><br>
So take a look and feel free to message/contact me :)
`
  },
  section4: {
    scrollid: 'webdev',
    heading: 'Web Development',
    gallery: [
      {
        heading: 'opentorah.uk',
        para: 'Is atm a dual pane bible reader with hebrew and english. Tools used were nodejs, mongodb and expressjs.',
        img: '/portfolio/opentorah.png',
        external_link: 'http://opentorah.uk/reader/pro.c3'
      },
      {
        heading: 'Naughts and Crosses',
        para: 'Want a game of naughts and crosses. sure have some fun. I used browserify inorder to separate the logic and the view javascript',
        img: '/portfolio/xo.png',
        // external_link: 'http://s.codepen.io/Lee182/debug/KgyqrX'
        external_link: '/projects/fcc-f-naughts_and_crosses/'
      },
      {
        heading: 'Wikipedia Searcher',
        para: 'Search wikipedia with ease',
        img: '/portfolio/wiki.png',
        // external_link: 'http://s.codepen.io/Lee182/debug/zBJXxy'
        external_link: '/projects/fcc-f-wiki_viewer/'
      },
      {
        heading: 'Camper Leaderboard',
        para: 'Dynamic table made with the help of vuejs',
        img: '/portfolio/camper-leaderboard.png',
        // external_link: 'http://s.codepen.io/Lee182/debug/mAqKxo'
        external_link: '/projects/fcc-fd-camper_leaderboard/'
      },
      {
        heading: 'Simon Game',
        para: 'The simon memory game made with javascript.',
        img: '/portfolio/simon-game.png',
        // external_link: 'http://s.codepen.io/Lee182/debug/mOmaWr'
        external_link: '/projects/fcc-f-simon_memory_game/'
      },
      {
        heading: 'Pomodoro Clock',
        para: 'Helps you to have a break whilst working',
        img: '/portfolio/pomodoro.png',
        // external_link: 'http://s.codepen.io/Lee182/debug/MbozLo'
        external_link: '/projects/fcc-f-pomodoro_clock/'
      },
      {
        heading: 'Url Shortener',
        para: 'Uses a base62 encoding (ie alphabet uppercase & lowercase, and numbers), to convert a number to a string which is used as a path for a given url. Project utilises nodejs and mongodb',
        img: '/portfolio/url-shortener.png',
        external_link: 'https://url.blogjono.com/'
      },
      {
        heading: 'Voting App',
        para: 'Uses socket.io to cast votes, and add options to vote for. Auth via twitter login',
        img: '/portfolio/voting-app.png',
        external_link: 'https://vote.blogjono.com/'
      },
      {
        heading: 'twnight',
        para: 'Twitter Nightlife; uses the yelp api, and puts your twitter handle on a rsvp list. uses mongodb expiresAt key to automatically remove the document data.',
        img: '/portfolio/twnight.png',
        external_link: 'https://twnight.blogjono.com/'
      },
      {
        heading: 'Stock market chart',
        para: 'Track the stock market, uses yahoo-finance api, and sends the data over the websockets in bson(binary json) format, given that most of the data is numbers.',
        img: '/portfolio/fccstocks.png',
        external_link: 'https://stocks.blogjono.com/'
      },
      {
        heading: 'Pinterest clone',
        para: 'Basic Image hosting site, uses vuejs with my own created routing. Also image upload to nodejs.',
        img: '/portfolio/fcc-pin.png',
        external_link: 'https://fcc-pin.blogjono.com/'
      },
      {
        heading: '#booktrade',
        para: 'book trading single page webapp, self hosted with LetsEncrypt and expressjs.',
        img: '/portfolio/booktrade.png',
        external_link: 'https://booktrade.blogjono.com/'
      }

    ],
    comingsoon: [1]
  },
  section5: {
    scrollid: 'contact',
    heading: 'Contact Me'
  },
  social: {
    facebook: 'https://facebook.com/jleey96',
    github: 'https://github.com/Lee182',
    soundcloud: 'https://soundcloud.com/jonolee182',
    youtube: 'https://www.youtube.com/user/TheJTLLee',
    linkedin: 'https://uk.linkedin.com/in/jonathan-lee-48b222100',
    freecodecamp: 'https://freecodecamp.com/Lee182',
    codepen: 'http://codepen.io/Lee182/'
  }
}

},{}],8:[function(require,module,exports){
/**
 * Zenscroll 3.3.0
 * https://github.com/zengabor/zenscroll/
 *
 * Copyright 2015–2016 Gabor Lenard
 *
 * This is free and unencumbered software released into the public domain.
 * 
 * Anyone is free to copy, modify, publish, use, compile, sell, or
 * distribute this software, either in source code form or as a compiled
 * binary, for any purpose, commercial or non-commercial, and by any
 * means.
 * 
 * In jurisdictions that recognize copyright laws, the author or authors
 * of this software dedicate any and all copyright interest in the
 * software to the public domain. We make this dedication for the benefit
 * of the public at large and to the detriment of our heirs and
 * successors. We intend this dedication to be an overt act of
 * relinquishment in perpetuity of all present and future rights to this
 * software under copyright law.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
 * OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
 * ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 * 
 * For more information, please refer to <http://unlicense.org>
 *
 */

/*jshint devel:true, asi:true */

/*global define, module */


(function (root, factory) {
	if (typeof define === "function" && define.amd) {
		define([], factory())
	} else if (typeof module === "object" && module.exports) {
		module.exports = factory()
	} else {
		root.zenscroll = factory()
	}
}(this, function () {
	"use strict"
	
	// Detect if the browser already supports native smooth scrolling (e.g., Firefox 36+ and Chrome 49+) and it is enabled:
	var isNativeSmoothScrollEnabledOn = function (elem) {
		return ("getComputedStyle" in window) &&
			window.getComputedStyle(elem)["scroll-behavior"] === "smooth"
	}

	// Exit if it’s not a browser environment:
	if (typeof window === "undefined" || !("document" in window)) {
		return {}
	}

	var createScroller = function (scrollContainer, defaultDuration, edgeOffset) {

		defaultDuration = defaultDuration || 999 //ms
		if (!edgeOffset && edgeOffset !== 0) {
			// When scrolling, this amount of distance is kept from the edges of the scrollContainer:
			edgeOffset = 9 //px
		}

		var scrollTimeoutId
		var setScrollTimeoutId = function (newValue) {
			scrollTimeoutId = newValue
		}
		var docElem = document.documentElement
		
		var getScrollTop = function () {
			if (scrollContainer) {
				return scrollContainer.scrollTop
			} else {
				return window.scrollY || docElem.scrollTop
			}
		}

		var getViewHeight = function () {
			if (scrollContainer) {
				return Math.min(scrollContainer.offsetHeight, window.innerHeight)
			} else {
				return window.innerHeight || docElem.clientHeight
			}
		}

		var getRelativeTopOf = function (elem) {
			if (scrollContainer) {
				return elem.offsetTop
			} else {
				return elem.getBoundingClientRect().top + getScrollTop() - docElem.offsetTop
			}
		}

		/**
		 * Immediately stops the current smooth scroll operation
		 */
		var stopScroll = function () {
			clearTimeout(scrollTimeoutId)
			setScrollTimeoutId(0)
		}

		/**
		 * Scrolls to a specific vertical position in the document.
		 *
		 * @param {endY} The vertical position within the document.
		 * @param {duration} Optionally the duration of the scroll operation.
		 *        If 0 or not provided it is automatically calculated based on the 
		 *        distance and the default duration.
		 * @param {onDone} Callback function to be invoken once the scroll finishes.
		 */
		var scrollToY = function (endY, duration, onDone) {
			stopScroll()
			if (isNativeSmoothScrollEnabledOn(scrollContainer ? scrollContainer : document.body)) {
				(scrollContainer || window).scrollTo(0, endY)
				if (onDone) {
					onDone()
				}
			} else {
				var startY = getScrollTop()
				var distance = Math.max(endY,0) - startY
				duration = duration || Math.min(Math.abs(distance), defaultDuration)
				var startTime = new Date().getTime();
				(function loopScroll() {
					setScrollTimeoutId(setTimeout(function () {
						var p = Math.min((new Date().getTime() - startTime) / duration, 1) // percentage
						var y = Math.max(Math.floor(startY + distance*(p < 0.5 ? 2*p*p : p*(4 - p*2)-1)), 0)
						if (scrollContainer) {
							scrollContainer.scrollTop = y
						} else {
							window.scrollTo(0, y)
						}
						if (p < 1 && (getViewHeight() + y) < (scrollContainer || docElem).scrollHeight) {
							loopScroll()
						} else {
							setTimeout(stopScroll, 99) // with cooldown time
							if (onDone) {
								onDone()
							}
						}
					}, 9))
				})()
			}
		}

		/**
		 * Scrolls to the top of a specific element.
		 *
		 * @param {elem} The element.
		 * @param {duration} Optionally the duration of the scroll operation.
		 *        A value of 0 is ignored.
		 * @param {onDone} Callback function to be invoken once the scroll finishes.
		 * @returns {endY} The new vertical scoll position that will be valid once the scroll finishes.
		 */
		var scrollToElem = function (elem, duration, onDone) {
			var endY = getRelativeTopOf(elem) - edgeOffset
			scrollToY(endY, duration, onDone)
			return endY
		}

		/**
		 * Scrolls an element into view if necessary.
		 *
		 * @param {elem} The element.
		 * @param {duration} Optionally the duration of the scroll operation.
		 *        A value of 0 is ignored.
		 * @param {onDone} Callback function to be invoken once the scroll finishes.
		 */
		var scrollIntoView = function (elem, duration, onDone) {
			var elemHeight = elem.getBoundingClientRect().height
			var elemTop = getRelativeTopOf(elem)
			var elemBottom = elemTop + elemHeight
			var containerHeight = getViewHeight()
			var containerTop = getScrollTop()
			var containerBottom = containerTop + containerHeight
			if ((elemTop - edgeOffset) < containerTop || (elemHeight + edgeOffset) > containerHeight) {
				// Element is clipped at top or is higher than screen.
				scrollToElem(elem, duration, onDone)
			} else if ((elemBottom + edgeOffset) > containerBottom) {
				// Element is clipped at the bottom.
				scrollToY(elemBottom - containerHeight + edgeOffset, duration, onDone)
			} else if (onDone) {
				onDone()
			}
		}

		/**
		 * Scrolls to the center of an element.
		 *
		 * @param {elem} The element.
		 * @param {duration} Optionally the duration of the scroll operation.
		 * @param {offset} Optionally the offset of the top of the element from the center of the screen.
		 *        A value of 0 is ignored.
		 * @param {onDone} Callback function to be invoken once the scroll finishes.
		 */
		var scrollToCenterOf = function (elem, duration, offset, onDone) {
			scrollToY(
				Math.max(
					getRelativeTopOf(elem) - getViewHeight()/2 + (offset || elem.getBoundingClientRect().height/2), 
					0
				), 
				duration,
				onDone
			)
		}

		/**
		 * Changes default settings for this scroller.
		 *
		 * @param {newDefaultDuration} New value for default duration, used for each scroll method by default.
		 *        Ignored if 0 or falsy.
		 * @param {newEdgeOffset} New value for the edge offset, used by each scroll method by default.
		 */
		var setup = function (newDefaultDuration, newEdgeOffset) {
			if (newDefaultDuration) {
				defaultDuration = newDefaultDuration
			}
			if (newEdgeOffset === 0 || newEdgeOffset) {
				edgeOffset = newEdgeOffset
			}
		}

		return {
			setup: setup,
			to: scrollToElem,
			toY: scrollToY,
			intoView: scrollIntoView,
			center: scrollToCenterOf,
			stop: stopScroll,
			moving: function () { return !!scrollTimeoutId },
			getY: getScrollTop
		}

	}

	// Create a scroller for the browser window, omitting parameters:
	var defaultScroller = createScroller()

	// Create listeners for the documentElement only & exclude IE8-
	if ("addEventListener" in window && !(isNativeSmoothScrollEnabledOn(document.body) || window.noZensmooth)) {
		if ("scrollRestoration" in history) {
			history.scrollRestoration = "manual"
			window.addEventListener("popstate", function (event) {
				if (event.state && "scrollY" in event.state) {
					defaultScroller.toY(event.state.scrollY)
				}
			}, false)
		}
		var replaceUrl = function (hash, newY) {
			try {
				history.replaceState({scrollY:defaultScroller.getY()}, "") // remember the scroll position before scrolling
				history.pushState({scrollY:newY}, "", window.location.href.split("#")[0] + hash) // remember the new scroll position (which will be after scrolling)
			} catch (e) {
				// To avoid the Security exception in Chrome when the page was opened via the file protocol, e.g., file://index.html
			}
		}
		window.addEventListener("click", function (event) {
			var anchor = event.target
			while (anchor && anchor.tagName !== "A") {
				anchor = anchor.parentNode
			}
			// Only handle links that were clicked with the primary button, without modifier keys:
			if (!anchor || event.which !== 1 || event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) {
				return
			}
			var href = anchor.getAttribute("href") || ""
			if (href.indexOf("#") === 0) {
				if (href === "#") {
					event.preventDefault()
					defaultScroller.toY(0)
					replaceUrl("", 0)
				} else {
					var targetId = anchor.hash.substring(1)
					var targetElem = document.getElementById(targetId)
					if (targetElem) {
						event.preventDefault()
						replaceUrl("#" + targetId, defaultScroller.to(targetElem))
					}
				}
			}
		}, false)
	}

	return {
		// Expose the "constructor" that can create a new scroller:
		createScroller: createScroller,
		// Surface the methods of the default scroller:
		setup: defaultScroller.setup,
		to: defaultScroller.to,
		toY: defaultScroller.toY,
		intoView: defaultScroller.intoView,
		center: defaultScroller.center,
		stop: defaultScroller.stop,
		moving: defaultScroller.moving
	}

}));

},{}]},{},[1]);
