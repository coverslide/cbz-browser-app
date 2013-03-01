var parseUrl = require('url').parse
var FileSocketClient = require('filesocket-client')

var document = require('global/document')
var bytes = require('bytes')
var doT = require('dot')

require('sort_by').bindToNative()

require('mkee')(Browser)

module.exports = Browser

function Browser(options){
  this.options = options
  this.element = document.getElementById(options.prefix + '-browser')

  this.element.innerHTML = this.templates.main()

  this.directoryHandler = this.onDirectory.bind(this)
  this.clickHandler = this.onClick.bind(this)
  this.cache = {}
  this.firstLoad = true

  this.fsclient = new FileSocketClient('ws://' + window.location.host + '/comics', {reconnect: true})

  var _this = this
  this.fsclient.on('connect', function(e){
    console.log(e)
    if(_this.firstLoad){
      _this.element.addEventListener('click', _this.clickHandler)
      _this.requestDirectory(_this.element, '/', _this.directoryHandler)
    }
  })

  this.fsclient.on('disconnect', function(e){
    console.log(e)
  })
}

Browser.prototype.helpers = {bytes: bytes}

Browser.prototype.requestDirectory = function(parent, url, cb){
  if(url in this.cache)
    return cb(null, parent, url, this.cache[url])
  var _this = this
  this.fsclient.requestDirectory(url, function(err, obj){
    if(err) return cb(err) 
    var files = Object.keys(obj).map(function(name){
      var file = obj[name].stat
      file.name = name
      return file
    }).filter(function(file){
      return file.type == 'directory' || file.name.match(/\.cbz$/)
    }).sort_by(function(file){
      var sort_cmp = [file.type == 'directory' ? 1 : 2]
      return sort_cmp.concat(naturalComparison(file.name.toUpperCase()))
    })
    _this.cache[url] = files
    cb(err, parent, url, files)
  })
}

function naturalComparison(str){
  var re = /[^\d\.]+|[\w\.]+/g
  var match = str.match(re)
  return match.map(function(v){
    var floatVal = parseFloat(v)
    return isNaN(floatVal) ? v : floatVal
  })
}

Browser.prototype.onDirectory = function(err, parent, url, files){
  this.firstLoad = false
  if(err) return
  var data = {
    root: url
    , files: files
  }
  parent.setAttribute('data-opened', true)
  parent.querySelector('.children').innerHTML = this.templates.listing.call(this, data)
}

Browser.prototype.requestFile = function(url){
  var _this = this
  this.fsclient.requestFile(url, {bufferSize: 1024 }, function(err, stat, stream){
    stream.on('data', function(){
      console.log(arguments)
    })
    if(err) _this.emit('error', err)
    _this.emit('file', url, stat, stream)
  })
}

Browser.prototype.onClick = function(e){
  e.preventDefault()
  var target = e.target
  while(target.parentNode && (target.getAttribute('data-url') == null || target.className == 'browser-root')){
    target = target.parentNode
  }

  if(target && target.getAttribute){
    var url = target.getAttribute('data-url')
    var type = target.getAttribute('data-type')
    var opened = target.getAttribute('data-opened')

    if(type == 'directory'){
      if(opened){
        target.querySelector('.children').innerHTML = ''
        target.removeAttribute('data-opened')
      } else {
        this.requestDirectory(target, url, this.directoryHandler)
      }
    } else if(type == 'file'){
      this.requestFile(url)
    }
  }
}

Browser.prototype.templates = {
  main: doT.compile(''
  +'<div class="browser-root">'
  +'  <div class="children"></div>'
  +'</div>'
  )
  , listing: doT.compile(''
  +'<div>'
  +'  {{~ it.files :file}}'
  +'  <div data-url="{{= it.root }}/{{= file.name}}" data-type="{{= file.type }}" class="browser-item browser-{{= file.type }}">'
  +'    <span class="browser-item-icon"></span>'
  +'    <span class="browser-item-name">{{= file.name }}</span>'
  +'    {{? file.type == "file" }}'
  +'      <span class="browser-item-stat">{{= this.helpers.bytes(file.size) }}</span>'
  +'    {{?}}'
  +'    <div class="children"></div>'
  +'  </div>'
  +'  {{~}}'
  +'</div>'
  )
}
