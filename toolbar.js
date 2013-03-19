'use strict'

var document = require('global/document')
var fullscreen = require('browserify-fullscreen')
var doT = require('dot')

require('mkee')(Toolbar)

module.exports = Toolbar

function Toolbar(options){
  this.element = document.getElementById(options.prefix + '-toolbar')
  this.element.innerHTML = this.templates.main()
  this.parent = this.element.parentNode

  this.btnBrowser = this.element.querySelector('.btn-browser')
  this.btnQueue = this.element.querySelector('.btn-queue')
  this.btnFullScreen = this.element.querySelector('.btn-fullscreen')
  this.btnNext = this.element.querySelector('.btn-next')
  this.btnPrev = this.element.querySelector('.btn-prev')

  if(!fullscreen.supported){
    this.btnFullScreen.setAttribute('disabled', true)
  } else {
    this.btnFullScreen.addEventListener('click', this.toggleFullScreen.bind(this), false)
  }

  this.btnBrowser.addEventListener('click', this.toggleBrowser.bind(this), false)
  this.btnQueue.addEventListener('click', this.toggleQueue.bind(this), false)
  this.btnNext.addEventListener('click', this.requestNext.bind(this), false)
  this.btnPrev.addEventListener('click', this.requestPrev.bind(this), false)
}
  
Toolbar.prototype.isBrowserShown = function(){
  return !!this.parent.className.match(/\bbrowser\b/)
}

Toolbar.prototype.isQueueShown = function(){
  return !!this.parent.className.match(/\bqueue\b/)
}

Toolbar.prototype.toggleBrowser = function(e){
  this.setBrowserVisibility(!this.isBrowserShown())
}

Toolbar.prototype.toggleQueue = function(e){
  this.setQueueVisibility(!this.isQueueShown())
}

Toolbar.prototype.setBrowserVisibility = function(visibility){
  var classNames = this.parent.className.trim().split(/\s+/g)
  var shown = this.isBrowserShown()
  if(visibility && !shown){
    classNames.push('browser')
    this.parent.className = classNames.join(' ').replace(/\s*queue\s*/,'')
  } else if(!visibility && shown) {
    this.parent.className = classNames.join(' ').replace(/\s*browser\s*/, '')
  }
}

Toolbar.prototype.toggleFullScreen = function(e){
  if(fullscreen.isFullscreen()){
    fullscreen.exitFullscreen()
  } else {
    fullscreen.requestFullscreen()
  }
}

Toolbar.prototype.requestNext = function(){
  this.emit('request-next')
}

Toolbar.prototype.requestPrev = function(){
  this.emit('request-prev')
}

Toolbar.prototype.setNextEnabled = function(enabled){
  if(enabled)
    this.btnNext.removeAttribute('disabled')
  else
    this.btnNext.setAttribute('disabled', true)
}

Toolbar.prototype.setPrevEnabled = function(enabled){
  if(enabled)
    this.btnPrev.removeAttribute('disabled')
  else
    this.btnPrev.setAttribute('disabled', true)
}

Toolbar.prototype.setQueueVisibility = function(visibility){
  var classNames = this.parent.className.trim().split(/\s+/g)
  var shown = this.isQueueShown()
  if(visibility && !shown){
    classNames.push('queue')
    this.parent.className = classNames.join(' ').replace(/\s*browser\s*/,'')
  } else if(!visibility && shown) {
    this.parent.className = classNames.join(' ').replace(/\s*queue\s*/, '')
  }
}

Toolbar.prototype.templates = {
  main: doT.compile(''
  +'<div>'
  +'  <div class="toolbar-left">'
  +'    <a class="btn btn-browser">Comics</a>'
  +'    <a class="btn btn-queue">Files</a>'
  +'  </div>'
  +'  <div class="toolbar-right">'
  +'    <a class="btn btn-fullscreen">Full</a>'
  +'  </div>'
  +'  <div class="toolbar-center">'
  +'    <a class="btn btn-prev" disabled>&lt;&mdash;</a>'
  +'    <a class="btn btn-next" disabled>&mdash;&gt;</a>'
  +'  </div>'
  +'</div>'
  )
}
