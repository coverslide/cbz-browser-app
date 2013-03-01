module.exports = CbzApp

var dot = require('dot')

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
  this.element = 

  this.fileHandler = this.onFile.bind(this)

  options.app = this
  
  this.toolbar = new Toolbar(options)
  this.viewer = new Viewer(options)
  this.browser = new Browser(options)
  this.queue = new Queue(options)

  this.browser.on('file', this.fileHandler)
}

CbzApp.prototype.onFile = function(url, stat, stream){
  var _this = this
  _this.queue.emit('filestream', url, stat, stream)
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
