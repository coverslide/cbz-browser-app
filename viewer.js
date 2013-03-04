var document = require('global/document')
var doT = require('dot')

require('mkee')(Viewer)

module.exports = Viewer

function Viewer(options, id){

  this.element = document.getElementById(options.prefix + '-viewer')
  
  var _this = this
  this.on('image', function(img){
    img.onclick = function(){
      window.open(img.src, "_blank")
    }
    this.element.appendChild(img)
  })

}

Viewer.prototype.templates = {
  main: doT.compile(''
  +'<div>'
  +'</div>'
  )
}
