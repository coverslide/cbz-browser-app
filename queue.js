'use strict'

var document = require('global/document')
var doT = require('dot')
var bytes = require('bytes')
var mime = require('browserify-mime')

module.exports = Queue

require('mkee')(Queue)

function Queue(options){
  this.element = document.getElementById(options.prefix + '-queue')
  this.element.innerHTML = this.templates.main()

  this.fileListEl = this.element.querySelector('.current-file-list')

  this.fileListEl.addEventListener('click', this.onCurrentFileClick.bind(this), false)

  this.currentIndex = null
  this.currentFile = null
}

Queue.prototype.onCurrentFileClick = function(e){
  var target = e.target
  while(!target.getAttribute('data-index') && target.parentNode && target != this.element)
    target = target.parentNode

  if(target){
    var index = target.getAttribute('data-index')
  }

  if(typeof index != 'undefined' && index != null){
    this.selectFileAtIndex(+index)
  }
}

Queue.prototype.selectFileAtIndex = function(index){
  var row = this.fileListEl.querySelector('[data-index="' + index + '"]')
  if(row){
    if(this.currentIndex !== null){
      var oldRow = this.fileListEl.querySelector('[data-index=\'' + this.currentIndex + '\']')
      oldRow.className = oldRow.className.replace(/\s*selected\s*/g,'')
    }
    row.className = row.className + ' selected'

    this.currentIndex = index
    var path = this.element.getAttribute('data-path')
    var count = this.element.getAttribute('data-count')
    var offset = row.getAttribute('data-offset')
    var end = row.getAttribute('data-end')
    var filename = row.getAttribute('data-filename')
    if(path && offset && filename){
      this.emit('filechunk-request', path, filename, offset, end)
    }
    this.emit('entry-selected', path, filename, index, count)
  }
}

Queue.prototype.showFileContents = function(path, request){
  var _this = this
  var filename = path.split('/').pop()
  this.element.setAttribute('data-path', path)
  var titleEl = this.element.querySelector('.current-file-title')

  this.fileListEl.innerHTML = ''
  this.currentIndex = 0
  this.currentFile = path

  titleEl.textContent = filename
  
  this.currentIndex = null

  this.emit('file-selected', path)
  
  request.on('data', appendFile)
  var index = 0

  function appendFile(file){
    if(_this.currentFile == path){
      var filename = file.header.fileName.split('/').pop()
      if(filename){
        var type = mime.lookup(filename)
        if(type.match(/^image\//)){ 
          var row = document.createElement('li')
          row.appendChild(document.createTextNode(filename))
          row.setAttribute('data-index', index)
          row.setAttribute('data-offset', file.position.offset)
          row.setAttribute('data-end', file.position.offset + file.position.length)
          row.setAttribute('data-filename', filename)
          _this.fileListEl.appendChild(row)
          _this.element.setAttribute('data-count', index)
          _this.emit('entry-added', path, index)
          index++
          if(_this.currentIndex === null){
            _this.selectFileAtIndex(0)
          }
        }
      }
    }
  }
}

Queue.prototype.requestNext = function(){
  this.selectFileAtIndex(this.currentIndex + 1)
}

Queue.prototype.requestPrev= function(){
  this.selectFileAtIndex(this.currentIndex - 1)
}

Queue.prototype.templates = {
  main: doT.compile(''
  +'<div>'
  +'  <div class="current-file-title">No File</div>'
  +'  <ol class="current-file-list">'
  +'  </ol>'
  +'</div>'
  )
}
