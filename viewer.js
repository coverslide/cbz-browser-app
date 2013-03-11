'use strict'

var http = require('http')
var document = require('global/document')
var doT = require('dot')
var mime = require('browserify-mime')

mime.define('.md5', 'text/md5sum')

require('mkee')(Viewer)

module.exports = Viewer

function Viewer(options, id){
  var _this = this
  this.element = document.getElementById(options.prefix + '-viewer')
  this.element.ondblclick = function(){
    if(_this.double){
      _this.element.querySelector('.image').className = 'image zoom'
    } else {
      _this.element.querySelector('.image').className = 'image'
    }
    _this.double = !_this.double
  }

  this.startDistance = null

  this.element.addEventListener('touchstart', this.onTouchStart.bind(this), false)
  this.element.addEventListener('touchmove', this.onTouchMove.bind(this), false)
  if('onmousewheel' in  this.element)
    this.element.addEventListener('mousewheel', this.onMouseWheel.bind(this), false)
  else if('onwheel' in  this.element) //support DOM L3 onwheel in firefox
    this.element.addEventListener('wheel', this.onMouseWheel.bind(this), false)
}

Viewer.prototype.onTouchStart = function(e){
  var touches = e.touches
  if(touches.length >= 2){
    this.startDistance = distance(touches[0], touches[1])
    this.startZoom = this.currentZoom
  }
}

Viewer.prototype.onTouchMove = function(e){
  var touches = e.touches
  if(touches.length >= 2){
    e.preventDefault()
    var dist = distance(touches[0],touches[1])
    var newZoom = _this.startZoom * (dist / this.startDistance)
    this.currentZoom = newZoom
    var image = this.element.querySelector('.image')
    if(image)
      image.style.width = newZoom + "%"
  }
}

Viewer.prototype.onMouseWheel = function(e){
  if(e.shiftKey){
    e.preventDefault()
    if(this.currentZoom !== null){
      var delta = e.wheelDeltaY || e.deltaY
      if(delta > 0){
        this.currentZoom += 2
      } else if(delta < 0){
        this.currentZoom -= 2
      }
      if(this.currentZoom < 0){
        this.currentZoom = 0
      }
      var image = this.element.querySelector('.image')
      if(image)
        image.style.width = this.currentZoom + "%"
    }
  }
}

function distance(a, b){
  return Math.pow(Math.pow(a.pageX - b.pageX, 2) + Math.pow(a.pageY - b.pageY, 2), .5)
}

Viewer.prototype.viewFile = function(path, filename, offset, end){
  var type = mime.lookup(filename)

  this.clear()

  var url = '/cbz-file?path=' + encodeURIComponent(path) + '&offset=' + offset + '&end=' + end

  if(type.match(/^image\//)){
    this.currentZoom = 100
    var image = new Image()
    image.src = url
    image.className = 'image'
    image.style.width = '100%'
    this.element.appendChild(image)
  } else if(type.match(/^text\//)){
    var el = document.createElement('pre')
    el.className = 'viewer-text'

    http.get({path:url}, function(res){
      res.on('data', function(text){
        el.innerHTML += text
      })
    })
    
    this.element.appendChild(el)
  } else {
    this.element.innerHTML = "File " + filename + " is of an unsupported type"
  }
}

Viewer.prototype.clear = function(){
  var cn = this.element.childNodes
  for(var i = cn.length - 1;i>=0;i--){
    this.element.removeChild(cn[i])
  }
}

Viewer.prototype.templates = {
}
