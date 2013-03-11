'use strict'

module.exports = CbzApp

var http = require('http')
var dot = require('dot')
var JsonChunkReader = require('json-chunk-reader')

var Toolbar = require('./toolbar')
var Viewer = require('./viewer')
var Browser = require('./browser')
var Queue = require('./queue')

require('mkee')(CbzApp)

//delegates all events between individual components
function CbzApp(options){
  this.options = options
  options.prefix = options.prefix || 'cbz-app'

  this.parentElement = options.parentElement

  this.prefix = options.prefix

  this.parentElement.innerHTML = this.templates.appSkeleton.call(this)

  this.cache = {} //TODO: use indexedDB so this can be persistent

  this.root = options.root || (''+window.location).replace(/^http/,'ws')

  this.toolbar = new Toolbar(options)
  this.viewer = new Viewer(options)
  this.browser = new Browser(options)
  this.queue = new Queue(options)

  this.browser.on('status-message', this.addMessage.bind(this))
  this.viewer.on('status-message', this.addMessage.bind(this))
  this.queue.on('status-message', this.addMessage.bind(this))
  this.toolbar.on('status-message', this.addMessage.bind(this))
  this.on('status-message', this.addMessage.bind(this))

  this.browser.on('directory-request', this.directoryHandler.bind(this))
  this.browser.on('file-request', this.fileHandler.bind(this))

  this.queue.on('filechunk-request', this.fileChunkHandler.bind(this))
  this.queue.on('file-selected', this.fileSelected.bind(this))
  this.queue.on('entry-added', this.entryAdded.bind(this))
  this.queue.on('entry-selected', this.entrySelected.bind(this))

  this.toolbar.on('request-next', this.requestNext.bind(this))
  this.toolbar.on('request-prev', this.requestPrev.bind(this))

  this.toolbar.setBrowserVisibility(true)
  this.browser.requestDirectory('/')
}

CbzApp.prototype.addMessage = function(message){
  this.toolbar.addMessage(message)
}

CbzApp.prototype.directoryHandler = function(path){
  var _this = this
  var url = '/json-dir?path=' + encodeURIComponent(path) + '&chunked=true'
  var request = http.get({path:url}, function(res){
    var jsonChunkReader = new JsonChunkReader
    res.pipe(jsonChunkReader)
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

CbzApp.prototype.fileChunkHandler = function(path, filename, offset, end){
  this.viewer.viewFile(path, filename, offset, end)
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
