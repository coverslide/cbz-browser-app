var parseUrl = require('url').parse
var jquest = require('jquest')
var WSFTPClient = require('wsftp-client')

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

  this.firstLoad = true

  this.fsclient = new WSFTPClient(options.wsftp || ('ws://' + window.location.host + '/comics'))
  this.requestDirectory(this.element, '/')

  this.element.addEventListener('click', this.clickHandler.bind(this), false)

  var _this = this
}

Browser.prototype.helpers = {bytes: bytes}

Browser.prototype.requestDirectory = function(parent, url){
  var _this = this
  this.fsclient.request(url, function(err, stat, stats){
    if(err) return cb(err)
    var files = Object.keys(stats).map(function(name){
      var file = stats[name].stat
      file.name = name
      return file
    }).filter(function(file){
      return file.type == 'directory' || file.name.match(/\.cbz$/)
    }).sort_by(function(file){
      var sort_cmp = [file.type == 'directory' ? 1 : 2]
      return sort_cmp.concat(naturalComparison(file.name.toUpperCase()))
    })
    cb(err, parent, url, files)
  })

  function cb(err, parent, url, files){
    _this.firstLoad = false
    if(err) _this.emit('error', err)
    var data = {
      root: url
      , files: files
    }
    parent.setAttribute('data-opened', true)
    parent.querySelector('.children').innerHTML = _this.templates.listing.call(_this, data)
  }
}

function naturalComparison(str){
  var re = /[^\d\.]+|[\w\.]+/g
  var match = str.match(re)
  return match.map(function(v){
    var floatVal = parseFloat(v)
    return isNaN(floatVal) ? v : floatVal
  })
}

Browser.prototype.requestFileChunk = function(url, file, start, end){
  var _this = this
  start = +start
  end = +end
  this.fsclient.request(url, {start: start, end: start + end}, function(err, stat, stream){
    if(err) return _this.emit('error', err)
    var data = {
      stat: stat
      , stream: stream
    }
    _this.emit('file', url, data)
  })
}

Browser.prototype.requestFile = function(url, options){
  var _this = this

  jquest('/cbz-info?file=' + encodeURIComponent(url), function(err, data){
    if(err) return console.error(err)
    _this.emit('filestat', url, data)
  })
}

Browser.prototype.clickHandler = function(e){
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
