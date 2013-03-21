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

  this.currentPath = null
}

Browser.prototype.helpers = {
  bytes: bytes
  , path: path
}

Browser.prototype.streamDirectory = function(filepath, request){
  var _this = this
  var parent = this.getFileElement(filepath)
  var children = parent.querySelector('.directory-children')
  request.on('data', function(data){
    //arrange on file rows
    var directory = data.isdir
    if(!directory && !data.filename.match(/\.cbz$/i)) return
    var row = document.createElement('li')
    row.innerHTML = _this.templates.listing.call(_this, {root:filepath, filename:data.filename,size:data.size,isdir:data.isdir})
    row.setAttribute('data-url', path.join(filepath, data.filename))
    row.setAttribute('data-type', directory ? "directory" : "file")
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

  request.on('end', function(){
    _this.emit('directory-request-finished')
  })
}

function compare(f1, f2){
  var c1 = naturalComparison(f1.toUpperCase())
  var c2 = naturalComparison(f2.toUpperCase())

  for(var i=0,l=c1.length;i<l;i++){
    var a = c1[i]
    var b = c2[i]
    var atype = typeof a
    var btype = typeof b
    if(atype != btype)
      var val = atype < btype ? -1 :  atype > btype ? 1 : 0
    else
      var val = a < b ? -1 :  a > b ? 1 : 0
    if(val != 0)
      return val
  }
  return 0
}

function naturalComparison(str){
  var re = /[\d\.]+|[\D\.]+/g
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
      window.location.hash = '#' + url
      //this.requestFile(url)
    }
  }
}

Browser.prototype.hideDirectory = function(url){
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
  if(this.currentPath){
    var oldEl = this.getFileElement(this.currentPath)
    if(oldEl){
      var oldNameEl = oldEl.querySelector('.browser-item-name')
      oldNameEl.className = oldNameEl.className.replace(/\s*selected\s*/g,'')
    }
  }
  var nameEl = this.getFileElement(url).querySelector('.browser-item-name')
  if(nameEl)
    nameEl.className += " selected"

  this.currentPath = url

  this.emit('file-request', url)
}

Browser.prototype.templates = {
  main: doT.compile(''
  +'<div class="url"></div>'
  +'<div data-url="/" class="browser-root">'
  +'  <ol class="directory-children"></ol>'
  +'</div>'
  )
  , listing: doT.compile(''
  +'<div>'
  +'  <span class="browser-item-icon"></span>'
  +'  <span class="browser-item-name">{{! it.filename }}</span>'
  +'  {{? !it.isdir }}'
  +'    <span class="browser-item-stat">{{! this.helpers.bytes(it.size) }}</span>'
  +'  {{??}}'
  +'    <ol class="directory-children"></ol>'
  +'  {{?}}'
  +'</div>'
  )
}
