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
  this.btnMessages = this.element.querySelector('.btn-messages')

  this.elMsgCount = this.element.querySelector('.toolbar-message-count')

  if(!fullscreen.supported){
    this.btnFullScreen.setAttribute('disabled', true)
  } else {
    this.btnFullScreen.addEventListener('click', this.toggleFullScreen.bind(this), false)
  }

  this.messages = []

  this.btnBrowser.addEventListener('click', this.toggleBrowser.bind(this), false)
  this.btnQueue.addEventListener('click', this.toggleQueue.bind(this), false)
  this.btnMessages.addEventListener('click', this.showMessages.bind(this), false)
  this.btnNext.addEventListener('click', this.requestNext.bind(this), false)
  this.btnPrev.addEventListener('click', this.requestPrev.bind(this), false)
}

Toolbar.prototype.showMessages = function(){
  if(!this.messageWindow){
    this.messageWindow = document.createElement('div')
    this.messageWindow.className = "toolbar-messages"
    this.messageWindow.innerHTML = this.templates.messages(this.messages)
    this.messageWindow.querySelector('.toolbar-messages-close').onclick = this.hideMessages.bind(this)
    this.messageWindow.querySelector('.toolbar-messages-list').onclick = this.messagesClick.bind(this)
    document.body.appendChild(this.messageWindow)
  } else {
    this.hideMessages()
  }
}

Toolbar.prototype.hideMessages = function(){
  if(this.messageWindow){
    this.messageWindow.parentNode.removeChild(this.messageWindow)
    this.messageWindow = null
  }
}

Toolbar.prototype.addMessage = function(message){
  if(message instanceof Error)
    throw message
  this.messages.push(message)
  this.elMsgCount.innerHTML = ''+(this.messages.length)
  var classNames = this.elMsgCount.className.trim().split(/\s+/)
  if(~classNames.indexOf('error')){
    classNames.push('error')
    this.elMsgCount.className = classNames.join(' ')
  }
  if(this.messageWindow){
    this.messageWindow.innerHTML = this.templates.messages(this.messages) 
  }
}

Toolbar.prototype.removeMessage = function(id){
  this.messages.splice(id, 1)
  this.elMsgCount.innerHTML = ''+(this.messages.length)
  if(this.messages.length < 1)
    this.elMsgCount.className = this.elMsgCount.className.replace(/\s*error\s*/,'')
  if(this.messageWindow){
    this.messageWindow.innerHTML = this.templates.messages(this.messages) 
  }
}

Toolbar.prototype.messagesClick = function(e){
  if(e.target.className == 'toolbar-message-delete'){
    var deleteMessage = true
  }

  var id = e.target.getAttribute('data-message-id') || e.target.parentNode.getAttribute('data-message-id')

  if(id){
    if(deleteMessage){
      this.removeMessage(id)
    } else {
      var message = this.messages[id]
      if(message instanceof Error)
        throw message
    }
  }
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
    this.parent.className = classNames.join(' ')
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
    this.parent.className = classNames.join(' ')
  } else if(!visibility && shown) {
    this.parent.className = classNames.join(' ').replace(/\s*queue\s*/, '')
  }
}

Toolbar.prototype.templates = {
  main: doT.compile(''
  +'<div>'
  +'  <div class="toolbar-left">'
  +'    <button class="btn-browser">Comics</button>'
  +'    <button class="btn-queue">Files</button>'
  +'  </div>'
  +'  <div class="toolbar-right">'
  +'    <button class="btn-messages">Messages (<span class="toolbar-message-count">0</span>)</button>'
  +'    <button class="btn-fullscreen">FS</button>'
  +'  </div>'
  +'  <div class="toolbar-center">'
  +'    <button class="btn-prev" disabled>&lt;&mdash;</button>'
  +'    <button class="btn-next" disabled>&mdash;&gt;</button>'
  +'  </div>'
  +'</div>'
  )
  , messages: doT.compile(''
  +'<div>'
  +'  <div class="toolbar-messages-close">X</div>'
  +'  <div class="toolbar-messages-list">'
  +'    {{~ it :message:id}}'
  +'      <div class="toolbar-message" data-message-id="{{=id}}">'
  +'        <div class="toolbar-message-delete">X</div>'
  +'        <div class="toolbar-message-body">'
  +'          {{! message.message || message }}'
  +'        </div>'
  +'      </div>'
  +'    {{~}}'
  +'  </div>'
  +'</div>'
  , {varname: 'messages'})
}
