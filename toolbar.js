var document = require('global/document')
var doT = require('dot')

require('mkee')(Toolbar)

module.exports = Toolbar

function Toolbar(options){
  this.element = document.getElementById(options.prefix + '-toolbar')
  this.element.innerHTML = this.templates.main()
}

Toolbar.prototype.templates = {
  main: doT.compile(''
  +'<div>'
  +'  <button class="btn-browser">browser</button>'
  +'  <button class="btn-queue">queue</button>'
  +'</div>'
  )
}
