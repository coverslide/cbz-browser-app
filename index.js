'use strict'

module.exports = CbzApp

var http = require('http')
var dot = require('dot')
var JsonChunkReader = require('json-chunk-reader')

var Toolbar = require('./toolbar')
var Viewer = require('./viewer')
var Browser = require('./browser')
var Queue = require('./queue')
var window = require('global/window')

require('mkee')(CbzApp)

//delegates all events between individual components
function CbzApp(options){
  this.options = options
  options.prefix = options.prefix || 'cbz-app'
  options.hashchange = 'onhashchange' in window

  this.parentElement = options.parentElement

  this.prefix = options.prefix

  this.parentElement.innerHTML = this.templates.appSkeleton.call(this)

  this.cache = {} //TODO: use indexedDB so this can be persistent

  this.root = options.root || (''+window.location).replace(/^http/,'ws')

  this.toolbar = new Toolbar(options)
  this.viewer = new Viewer(options)
  this.browser = new Browser(options)
  this.queue = new Queue(options)

  this.browser.on('directory-request', this.directoryHandler.bind(this))
  this.browser.on('file-request', this.fileHandler.bind(this))

  this.queue.on('filechunk-request', this.fileChunkHandler.bind(this))
  this.queue.on('file-selected', this.fileSelected.bind(this))
  this.queue.on('entry-added', this.entryAdded.bind(this))
  this.queue.on('entry-selected', this.entrySelected.bind(this))

  this.toolbar.on('request-next', this.requestNext.bind(this))
  this.toolbar.on('request-prev', this.requestPrev.bind(this))


  if(options.hashchange) window.addEventListener('hashchange', this.onHashChange.bind(this), false)
  
  if(window.location.hash){
    this.firstLoad = true
    this.browser.once('directory-request-finished', this.onHashChange.bind(this))
  }

  this.toolbar.setBrowserVisibility(true)
  this.browser.requestDirectory('/')
}

CbzApp.prototype.onHashChange = function(e){
  var hash = window.location.hash.replace(/^#!/,'')
  this.navigateToHash(hash)
}

CbzApp.prototype.navigateToHash = function(hash){
  var permalink = hash.split('::')
  var path = decodeURIComponent(permalink[0])
  var index = permalink[1]

  this.drillDown(path, +index || 1)
}

CbzApp.prototype.drillDown = function(path, index){
  var _this = this
  if(this.queue.currentFile == path) return this.firstLoad = false, this.queue.selectFileAtIndex(index - 1)

  var sections = path.split('/')

  for(var i = sections.length; i > 1 ; i--){
    var newPath = sections.slice(0, i).join('/')
    var element = this.browser.getFileElement(newPath)
    if(element){
      var elementType = element.getAttribute('data-type')
      var elementOpen = element.getAttribute('data-opened')

      //zoom in on this element
      // TODO: organize this better
      if(this.firstLoad){
        var browserElement = this.browser.element
        var beHeight = browserElement.offsetHeight
        var beScroll = browserElement.scrollTop
        var elementTop = function(){
          var currentElement = element
          var currentTop = 0
          do{
            currentTop += currentElement.offsetTop
            currentElement = currentElement.offsetParent
          }while(currentElement != browserElement)

          return currentTop
        }()

        browserElement.scrollTop = elementTop
      }

      if(elementType == 'file'){
        this.queue.once('file-request-finished', function(){
          _this.drillDown(path, index)
        })
        this.browser.requestFile(newPath, true)
      } else if(elementType == 'directory' && !elementOpen){
        this.browser.once('directory-request-finished', function(){
          _this.drillDown(path, index)
        })
        this.browser.requestDirectory(newPath)
      }
      this.firstLoad = false
      break
    }
  }
}

CbzApp.prototype.directoryHandler = function(path){
  var _this = this
  var url = '/json-dir?path=' + encodeURIComponent(path) + '&chunked=true'
  var request = http.get({path:url}, function(res){
    var jsonChunkReader = new JsonChunkReader
    res.pipe(jsonChunkReader)
    _this.toolbar.setBrowserVisibility(true)
    _this.browser.streamDirectory(path, jsonChunkReader)
  })
}

CbzApp.prototype.fileHandler = function(path){
  var _this = this
  var url = '/cbz-info?path=' + encodeURIComponent(path) + '&chunked=true'
  var request = http.get({path:url}, function(res){
    var jsonChunkReader = new JsonChunkReader
    res.pipe(jsonChunkReader)
    _this.toolbar.setQueueVisibility(true)
    _this.queue.showFileContents(path, jsonChunkReader)
  })
}

CbzApp.prototype.fileChunkHandler = function(path, filename, cd){
  this.viewer.viewFile(path, filename, cd)
}

CbzApp.prototype.fileSelected = function(path){
  this.toolbar.setPrevEnabled(false)
  this.toolbar.setNextEnabled(false)
}
CbzApp.prototype.entryAdded = function(path, index){
  if(index > 0)
    this.toolbar.setNextEnabled(true)
}

CbzApp.prototype.entrySelected = function(path, filename, index, count){
  this.toolbar.setNextEnabled(index < count)
  this.toolbar.setPrevEnabled(index > 0)
}

CbzApp.prototype.requestNext = function(){
  this.queue.requestNext()
}

CbzApp.prototype.requestPrev = function(){
  this.queue.requestPrev()
}

CbzApp.prototype.templates = {
  appSkeleton: dot.compile(''
  +'<div id="{{=this.prefix}}-container">'
  +'  <div id="{{=this.prefix}}-toolbar"></div>'
  +'  <div id="{{=this.prefix}}-body">'
  +'    <div id="{{=this.prefix}}-browser"></div>'
  +'    <div id="{{=this.prefix}}-viewer"></div>'
  +'    <div id="{{=this.prefix}}-queue"></div>'
  +'  </div>'
  +'</div>'
  )
}
