'use strict'

var document = require('global/document')
var bytes = require('bytes')
var doT = require('dot')
var path = require('path')

require('mkee')(Browser)

module.exports = Browser

function Browser(options){
  this.options = options
  this.element = document.getElementById(options.prefix + '-browser')

  this.streams = {}

  this.element.innerHTML = this.templates.main()

  this.element.addEventListener('click', this.clickHandler.bind(this), false)
}

Browser.prototype.helpers = {
  bytes: bytes
  , path: path
}

Browser.prototype.streamDirectory = function(url, request){
  var _this = this
  this.streams[url] = {stream:request, files: []}
  var parent = this.getFileElement(url)
  var children = parent.querySelector('.directory-children')
  request.on('error', function(err){
    _this.streams[url] = null
    _this.emit('status-message', err)
  })
  request.on('end', function(){
    _this.streams[url] = null
  })
  request.on('filestat', function(data){
    //arrange on file rows
    var directory = data.directory
    if(!directory && !data.filename.match(/\.cbz$/i)) return
    var row = document.createElement('li')
    row.innerHTML = _this.templates.listing.call(_this, {root:url, filename:data.filename,stat:data.stat,directory:data.directory})
    row.setAttribute('data-url', path.join(url, data.filename))
    row.setAttribute('data-type', data.directory ? "directory" : "file")
    row.className = "browser-item browser-"+ ( directory ? "directory" : "file" )
    for(var i = 0, l = children.children.length;i<l;i++){
      var child = children.children[i]
      var isdir = child.getAttribute('data-type') == 'directory'
      var filename = child.getAttribute('data-url').split('/').reverse()[0]
      if(!directory && isdir)
        continue
      else if(directory && !isdir)
        return children.insertBefore(row,child)
      var comparison = compare(data.filename, filename)
      if(comparison < 0)
        return children.insertBefore(row,child)
    }
    children.appendChild(row)
  })
}

function compare(f1, f2){
  var c1 = naturalComparison(f1.toUpperCase())
  var c2 = naturalComparison(f2.toUpperCase())

  for(var i=0,l=c1.length;i<l;i++){
    var a = c1[i]
    var b = c2[i]
    if(typeof c == 'string' || typeof d == 'string')
      a=''+a,b=''+b
    var val = a < b ? -1 :  a > b ? 1 : 0
    if(val != 0)
      return val
  }
  return 0
}

Browser.prototype.showDirectory = function(url, files){
  var parent = this.getFileElement(url)
  if(parent){
    var children = Object.keys(files).map(function(name){
      var file = files[name].stat
      file.name = name
      return file
    }).filter(function(file){
      return file.type == 'directory' || file.name.match(/\.cbz$/)
    }).sort_by(function(file){
      var sort_cmp = [file.type == 'directory' ? 1 : 2]
      return sort_cmp.concat(naturalComparison(file.name.toUpperCase()))
    })
    parent.setAttribute('data-opened', true)
    parent.querySelector('.directory-children').innerHTML = this.templates.listing.call(this, {root:url, files:children})
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

Browser.prototype.clickHandler = function(e){
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
        this.hideDirectory(url)
      } else {
        this.requestDirectory(url)
      }
    } else if(type == 'file'){
      this.requestFile(url)
    }
  }
}

Browser.prototype.hideDirectory = function(url){
  if(this.streams[url]){
    this.streams[url].stream.removeAllListeners()
    this.streams[url] = null
  }
  var target = this.getFileElement(url)
  if(target){
    target.querySelector('.directory-children').innerHTML = ''
    target.removeAttribute('data-opened')
  }
}

Browser.prototype.getFileElement = function(url){
  return this.element.querySelector("[data-url='" + url.replace("'","\\'") + "']")
}

Browser.prototype.requestDirectory = function(url){
  var target = this.getFileElement(url)
  if(target){
    target.querySelector('.directory-children').innerHTML = ''
    target.setAttribute('data-opened', true)
  }
  this.emit('directory-request', url)
}

Browser.prototype.requestFile = function(url){
  this.emit('file-request', url)
}

Browser.prototype.templates = {
  main: doT.compile(''
  +'<div class="url"></div>'
  +'<div data-url="/" class="browser-root">'
  +'  <ul class="directory-children"></ul>'
  +'</div>'
  )
  , listing: doT.compile(''
  +'<div>'
  +'  <span class="browser-item-icon"></span>'
  +'  <span class="browser-item-name">{{! it.filename }}</span>'
  +'  {{? !it.directory }}'
  +'    <span class="browser-item-stat">{{! this.helpers.bytes(it.stat.size) }}</span>'
  +'  {{??}}'
  +'    <ul class="directory-children"></ul>'
  +'  {{?}}'
  +'</div>'
  )
}
