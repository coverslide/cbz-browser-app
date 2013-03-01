var document = require('global/document')
var doT = require('dot')

require('mkee')(Viewer)

module.exports = Viewer

function Viewer(options, id){

  this.element = document.getElementById(options.prefix + '-viewer')


}

Viewer.prototype.templates = {
  main: doT.compile(''
  +'<div>'
  +'</div>'
  )
}
