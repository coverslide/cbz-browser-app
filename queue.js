'use strict'

var document = require('global/document')
var doT = require('dot')
var bytes = require('bytes')

module.exports = Queue

require('mkee')(Queue)

function Queue(options){
  this.element = document.getElementById(options.prefix + '-queue')
  this.element.innerHTML = this.templates.main()
  this.queueEl = this.element.querySelector('.download-queue ul')
  this.currentEl = this.element.querySelector('.current-file-contents')

  this.currentEl.addEventListener('click', this.onCurrentFileClick.bind(this), false)

  this.currentFile = null
  this.currentIndex = 0
}

Queue.prototype.onCurrentFileClick = function(e){
  var target = e.target
  while(!target.getAttribute('data-file-index') && target.parentNode && target != this.currentEl)
    target = target.parentNode

  var fileIndex = target.getAttribute('data-file-index')

  if(fileIndex){
    this.requestFileChunk(fileIndex)
  }
}

Queue.prototype.requestFileChunk = function(fileIndex){
  this.currentIndex = fileIndex
  this.emit('filechunk-request', fileIndex)
}

Queue.prototype.startChunkRequest = function(url, id, length, stream){
  var _this = this
  var downloaded = 0
  if(this.currentFile == url){
    var node = this.currentEl.querySelector('[data-file-index="' + id + '"]')
  }
  if(node){
    var progressEl = node.querySelector('.cbz-file-progress')
  }
  if(progressEl){
    progressEl.max = length
    stream.on('data', function(data){
      downloaded += data.length
      if(_this.currentFile == url){
        progressEl.style.opacity = .2 + (downloaded / length) * .8
        progressEl.value = downloaded
      }
    })

    //values don't always match up
    stream.on('end', function(){
      progressEl.value = progressEl.max
    })
  }
}

Queue.prototype.showComicFile = function(url, request, files){
  var _this = this
  this.currentEl.innerHTML = this.templates.filestat({filename:url.split('/').pop()})
  
  var elFileList = this.currentEl.querySelector('.current-file-list')

  var currIndex = 0

  this.currentFile = url

  if(files) appendFiles(files)

  if(request){
    request.on('files', appendFiles)
    request.on('file', appendFile)
  }

  function appendFiles(files){
    files.forEach(appendFile)
  }

  this.currentEl.setAttribute('data-url', url)

  function appendFile(file){
    var filename = file.header.fileName.split('/').pop()
    var row = document.createElement('li')
    row.innerHTML = _this.templates.file({filename: filename})
    row.setAttribute('data-file-index', currIndex++)
    elFileList.appendChild(row)
  }
}

/*
Queue.prototype.onFileStream = function onFileStream(path, stat, stream){

  var startTime = +(new Date)

  var downloader = document.createElement('li')
  this.queueEl.appendChild(downloader)

  downloader.innerHTML = this.templates.progress({path: path})

  var progressEl = downloader.querySelector('.progress-bar')
  var loadedEl = downloader.querySelector('.stats-loaded')
  var totalEl = downloader.querySelector('.stats-total')
  var rateEl = downloader.querySelector('.stats-rate')
  var etaEl = downloader.querySelector('.stats-eta')
  var elapsedEl = downloader.querySelector('.stats-elapsed')

  progressEl.max = stat.size
  totalEl.innerHTML = bytes(stat.size)

  var loaded = 0
  var total = stat.size

  stream.on('data', function(d){
    var currentTime = +(new Date)

    loaded += d.length
    progressEl.value = loaded

    loadedEl.innerHTML = bytes(loaded)

    var diffTime = currentTime - startTime

    var rate_mil = loaded / diffTime

    rateEl.innerHTML = bytes(rate_mil * 1000) + ' / s'

    eta_mil = (total - loaded) / rate_mil

    eta_sec = eta_mil / 1000

    eta_min = Math.floor(eta_sec / 60)

    eta_sec = Math.floor(eta_sec) % 60

    etaEl.innerHTML = eta_min + ' m ' + eta_sec + ' s'

    elapsed_sec = diffTime / 1000
    elapsed_min = Math.floor(elapsed_sec / 60)
    elapsed_sec = Math.floor(elapsed_sec) % 60

    elapsedEl.innerHTML = elapsed_min + ' m ' + elapsed_sec + ' s '
  })
}
*/

Queue.prototype.templates = {
  main: doT.compile(''
  +'<div class="current">'
  +'  <div class="current-file-title">Current File</div>'
  +'  <div class="current-file-contents"></div>'
  +'</div>'
  )
  , filestat: doT.compile(''
  +'<div>'
  +'  <div class="current-filename">{{=it.filename}}</div>'
  +'  <ol class="current-file-list">'
  +'  </ol>'
  +'</div>'
  )
  , file: doT.compile(''
  +'<div class="cbz-file-name">{{! it.filename }}</div>'
  +'<progress class="cbz-file-progress" value="0" max="1" ></progress>'
  )
  , progress: doT.compile(''
  +'<div>'
  +'  <div class="download-title">{{= it.path }}</div>'
  +'  <div class="progress-stats">'
  +'    <span class="stats-loaded"></span>:'
  +'    <span class="stats-total"></span>:'
  +'    <span class="stats-rate"></span>:'
  +'    <span class="stats-eta"></span>:'
  +'    <span class="stats-elapsed"></span>'
  +'  </div>'
  +'  <progress class="progress-bar" />'
  +'</div>'
  )
}
