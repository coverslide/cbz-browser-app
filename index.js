module.exports = CbzApp

var dot = require('dot')

var Toolbar = require('./toolbar')
var Viewer = require('./viewer')
var Browser = require('./browser')
var Queue = require('./queue')

var PkzipParser = require('pkzip-parser')
var InflateStream = require('inflate-stream')

require('mkee')(CbzApp)


var mimeTypes = {
  ".jpg" : 'image/jpeg'
  ,".jpeg" : 'image/jpeg'
  ,".png" : 'image/png'
  ,".gif" : 'image/gif'
}

//delegates all events between individual components
function CbzApp(options){
  this.options = options
  options.prefix = options.prefix || 'cbz-app'

  this.parentElement = options.parentElement

  this.prefix = options.prefix

  this.parentElement.innerHTML = this.templates.appSkeleton.call(this)

  options.app = this

  this.cache = {}
  
  this.toolbar = new Toolbar(options)
  this.viewer = new Viewer(options)
  this.browser = new Browser(options)
  this.queue = new Queue(options)

  this.toolbar.toggleBrowser()
  this.browser.on('file', this.fileHandler.bind(this))
  this.browser.on('filestat', this.fileStatHandler.bind(this))
  this.queue.on('filechunk', this.fileChunkHandler.bind(this))
}

CbzApp.prototype.fileStatHandler = function(url, data){
  this.queue.emit('filestat', url, data)
}

CbzApp.prototype.fileChunkHandler = function(url, file, offset, length){
  this.browser.requestFileChunk(url, file, offset, length)
}

CbzApp.prototype.fileHandler = function(url, data){
  var _this = this
  var stat = data.stat
  var stream = data.stream
  this.queue.emit('filestream', url, stat, stream)
  var unzipper = new PkzipParser() 
  stream.pipe(unzipper)
  unzipper.on('file', function(status){

    if(status.compressionType == 8){ //deflate algorithm
      var inflateStream = new InflateStream()
      status.stream.pipe(inflateStream)
      inflateStream.on('error', function(e){console.error(e)})
      onStream(status.fileName, inflateStream)
    } else if(status.compressionType == 0) { // uncompressed, YISS!!
      onStream(status.fileName, status.stream)
    } else {
      console.error('UNSUPPORTED COMPRESSION TYPE', url, status.fileName)
    }
  })

  function onStream(filename, stream){
    var extensionMatch = filename.match(/\.[^.]+$/)
    if(extensionMatch){
      var extension = extensionMatch[0]
      var mime = mimeTypes[extension]
    }

    if(mime){
      var buf = []
      stream.on('data', function(data){
        if(data instanceof Uint8Array)
          buf.push(data)
        else
          buf.push(new Uint8Array(data))
      })


      stream.on('end', function(){
        //avoid the blob constructor arraybuffer deprecation warning
        var blob = new Blob(buf, {type: mime})
        var fr = new FileReader()
        var s = fr.readAsDataURL(blob)

        fr.onload = function(e){
          var result = fr.result
          var img = new Image();
          img.title = filename

          img.src = result
          _this.viewer.emit('image', img)
        }
      })
    } else {
      console.error('unsupported extension for file: ' + filename +', skipping...')
    }
  }
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
