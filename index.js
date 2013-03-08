'use strict'

module.exports = CbzApp

var dot = require('dot')
var InflateStream = require('inflate-stream')
var WSFTPClient = require('wsftp-client')

var Toolbar = require('./toolbar')
var Viewer = require('./viewer')
var Browser = require('./browser')
var Queue = require('./queue')

var CbzInfoReader = require('./cbz-info-reader')

var buffer = require('buffer')

var mimeTypes = {
  ".jpg" : 'image/jpeg'
  ,".jpeg" : 'image/jpeg'
  ,".png" : 'image/png'
  ,".gif" : 'image/gif'
}

require('mkee')(CbzApp)
require('mkee')(FileListRequestFilter)

//delegates all events between individual components
function CbzApp(options){
  this.options = options
  options.prefix = options.prefix || 'cbz-app'

  this.parentElement = options.parentElement

  this.prefix = options.prefix

  this.parentElement.innerHTML = this.templates.appSkeleton.call(this)

  this.cache = {} //TODO: use indexedDB so this can be persistent

  this.root = options.root || (''+window.location).replace(/^http/,'ws')

  this.wsftp = new WSFTPClient(this.root + 'comics')
  this.cbzinfo = new CbzInfoReader(this.root + 'cbz-info')
  
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

  this.toolbar.on('request-next', this.requestNext.bind(this))
  this.toolbar.on('request-prev', this.requestPrev.bind(this))

  this.toolbar.setBrowserVisibility(true)
  this.browser.requestDirectory('/')
}

CbzApp.prototype.addMessage = function(message){
  this.toolbar.addMessage(message)
}

CbzApp.prototype.directoryHandler = function(url){
  var _this = this
  this.wsftp.request(url, function(err, stat, request){
    if(err) return _this.addMessage(err.message)
    if(!stat.directory){
      _this.addMessage(new Error('Path ' + url + ' is not a directory'))
    } else {
      _this.browser.streamDirectory(url, request)
    }
  })
}

CbzApp.prototype.fileHandler = function(url){
  var _this = this
  this.currentUrl = url
  var cache = this.cache[url] = this.cache[url] || null

  if(cache){
    _this.queue.showComicFile(url, cache.requestFilter, cache.files)
  } else {
    cache = this.cache[url] = {files:[]}

    this.currentId = 0
    var firstRequest = true
    var request = this.cbzinfo.request(url)
    var requestFilter = cache.requestFilter = new FileListRequestFilter()
    request.on('error', function(err){
      _this.addMessage(err)
    })
    request.on('stat', function(stat){
      cache.stat = stat
      if(stat.directory)
        _this.addMessage(new Error('Path ' + url + ' is a directory'))
      else{
        //_this.toolbar.setBrowserVisibility(false)
        _this.toolbar.setQueueVisibility(true)
        _this.queue.showComicFile(url, requestFilter)
      }
    })

    request.on('files', function(files){
      files = files.filter(function(file){
        return requestFilter.filter(file.header.fileName)
      })
      cache.files = cache.files.concat(files)
      requestFilter.emit('files', files)
      if(files.length && firstRequest){
        firstRequest = false
        _this.toolbar.setPrevEnabled(false)
        _this.toolbar.setNextEnabled(true)
        _this.queue.requestFileChunk(0)
      }
    })

    request.on('file', function(file){
      if(requestFilter.filter(file.header.fileName)){
        cache.files.push(file)
        requestFilter.emit('file', file)
        if(firstRequest){
          firstRequest = false
          _this.toolbar.setPrevEnabled(false)
          _this.toolbar.setNextEnabled(true)
          _this.queue.requestFileChunk(0)
        }
      }
    })

    request.on('end', function(){
      cache.request = null
    })
  }
}

CbzApp.prototype.requestNext = function(){
  var file = this.cache[this.currentUrl]

  if(file && file.files){
    var cbzFile = file.files[+this.currentId + 1]

    if(cbzFile){
      this.fileChunkHandler(+this.currentId + 1)
    }
  }
}

CbzApp.prototype.requestPrev = function(){
  var file = this.cache[this.currentUrl]

  if(file && file.files){
    var cbzFile = file.files[+this.currentId - 1]

    if(cbzFile){
      this.fileChunkHandler(+this.currentId - 1)
    }
  }
}

CbzApp.prototype.fileChunkHandler = function(id){
  var _this = this
  var url = this.currentUrl
  var file = this.cache[url]
  this.currentId = id

  if(file){
    var files = file.files
    var cbzFile = files[id]
    

    if(cbzFile){
      _this.toolbar.setPrevEnabled(id > 0)
      _this.toolbar.setNextEnabled(id < files.length - 1)
      var header = cbzFile.header
      var filename = header.fileName
      if(cbzFile.dataUrl){
        _this.viewer.setImage(cbzFile.dataUrl, url, filename)
        return
      } else if(cbzFile.request){
        return //the cached callbacks should take care of themselves
      }
      var position = cbzFile.position
      var start = position.offset + position.headerSize
      var end = start + header.compressedSize - 1
      var compressionType = header.compressionType
      var length = end - start
      var extensionMatch = filename.match(/\.[^.]+$/i)
      if(extensionMatch){
        var extension = extensionMatch[0]
        var mimeType = mimeTypes[extension]
      }
      var request = cbzFile.request = this.wsftp.request(url, {start:start, end:end})
      if(compressionType == 'deflate'){
        var stream = new InflateStream()
        request.pipe(stream)
      } else if(compressionType == 'uncompressed') {
        var stream = request
      } else {
        return this.addMessage(new Error('Unsupported compression type: ' + compressionType + ' for file ' + url + ' id ' + id))
      }
      this.queue.startChunkRequest(url, id, length, stream)
      var chunks = cbzFile.chunks 
      if(!chunks || !chunks.length)
        cbzFile.chunks = chunks = []
      cbzFile.length = 0
      stream.on('data', function(data){
        cbzFile.length += data.length
        if(data instanceof buffer.Buffer){
          data = new Uint8Array(data.parent).subarray(data.offset, data.offset+data.length)
        } else if(data instanceof buffer.SlowBuffer){
          data = new Uint8Array(data)
        }
        chunks.push(data)
      })

      stream.on('error', function(err){
        cbzFile.request = null
        _this.addMessage(err)
      })

      stream.on('end', function(){
        cbzFile.request = null
        var fr = new FileReader()
        var blobOptions = {}
        if(mimeType)
          blobOptions.type = mimeType
        var blob = new Blob(chunks, blobOptions)
        fr.readAsDataURL(blob)
        fr.onloadend = function(){
          var dataUrl = fr.result
          cbzFile.dataUrl = dataUrl
          cbzFile.chunks = null
          if(_this.currentId == id && _this.currentUrl == url){
            _this.viewer.setImage(fr.result, url, filename)
          }
        }
      })

      chunks.forEach(function(chunk){
        stream.emit('data', chunk)
      })
    } else {
      this.addMessage(new Error('File ' + url + ' has no file id ' + id))
    }
  } else {
    this.addMessage(new Error('No file found'))
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

function FileListRequestFilter(){}

FileListRequestFilter.prototype.filter = function(filename){
  var extensionMatch = filename.match(/\.[^.]+$/i)
  if(extensionMatch){
    return extensionMatch[0].toLowerCase() in mimeTypes
  }
}
