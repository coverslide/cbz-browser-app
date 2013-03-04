var document = require('global/document')
var doT = require('dot')

require('mkee')(Toolbar)

module.exports = Toolbar

function Toolbar(options){
  this.element = document.getElementById(options.prefix + '-toolbar')
  this.element.innerHTML = this.templates.main()
  this.parent = this.element.parentNode

  this.btnBrowser = this.element.querySelector('.btn-browser')
  this.btnQueue = this.element.querySelector('.btn-queue')

  var _this = this
  this.btnBrowser.onclick = function(e){
    _this.toggleBrowser()
  }

  this.btnQueue.onclick = function(e){
    _this.toggleQueue()
  }
}

Toolbar.prototype.toggleBrowser = function(){
  var classes = this.parent.className.trim().split(/\s+/g)
  var i = classes.indexOf('browser')
  if(i > -1){
    classes.splice(i,1)
  } else {
    classes.push('browser')
  }
  this.parent.className = classes.join(' ')
}

Toolbar.prototype.toggleQueue = function(){
  var classes = this.parent.className.trim().split(/\s+/g)
  var i = classes.indexOf('queue')
  if(i > -1){
    classes.splice(i,1)
  } else {
    classes.push('queue')
  }
  this.parent.className = classes.join(' ')
}

Toolbar.prototype.templates = {
  main: doT.compile(''
  +'<div>'
  +'  <button class="btn-browser">browser</button>'
  +'  <button class="btn-queue">queue</button>'
  +'</div>'
  )
}
