'use strict'

var document = require('global/document')
var doT = require('dot')

require('mkee')(Viewer)

module.exports = Viewer

function Viewer(options, id){
  this.element = document.getElementById(options.prefix + '-viewer')
}

Viewer.prototype.setImage = function(url, filename, cbzFilename){
  this.clear()
  var image = document.createElement('img')
  if(filename)
    image.title = filename
  if(cbzFilename)
    image.title += '\n -- ' + cbzFilename

  image.src = url
  image.className = 'image'

  this.element.appendChild(image)
}

Viewer.prototype.clear = function(){
  var cn = this.element.childNodes
  for(var i = cn.length - 1;i>=0;i--){
    this.element.removeChild(cn[i])
  }
}


Viewer.prototype.templates = {
}
