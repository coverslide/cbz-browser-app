var document = require('global/document')
var doT = require('dot')
var bytes = require('bytes')
var sort_by = require('sort_by').bindToNative()

module.exports = Queue

require('mkee')(Queue)

function Queue(options){
  this.element = document.getElementById(options.prefix + '-queue')
  this.element.innerHTML = this.templates.main()
  this.queueEl = this.element.querySelector('.download-queue ul')
  this.currentEl = this.element.querySelector('.current-file-contents')

  this.currentEl.addEventListener('click', this.onCurrentFileClick.bind(this), false)
  
  this.on('filestream', this.onFileStream.bind(this))
  this.on('filestat', this.onFileStat.bind(this))
}

Queue.prototype.onCurrentFileClick = function(e){
  var target = e.target
  while(!target.getAttribute('data-archive-filename') && target.parentNode && target != this.currentEl)
    target = target.parentNode

  var archiveFilename = target.getAttribute('data-archive-filename')

  if(archiveFilename){
    var offset = target.getAttribute('data-offset')
    var length = target.getAttribute('data-length')
    var filename = target.getAttribute('data-filename')
    this.emit('filechunk', archiveFilename, filename, offset, length)
  }
}

Queue.prototype.onFileStat = function(filename, data){
  var html = this.templates.filestat({
    filename: filename
    , files: data.files//.filter(function(s){return s.filename.match(/\.(jpg|jpeg|bmp|png|gif)$/)}).sort_by(function(s){return s.filename.split('/').reverse()[0].toUpperCase()})
  })
  this.currentEl.innerHTML = html
}

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

Queue.prototype.templates = {
  main: doT.compile(''
  +'<div class="current">'
  +'  <div class="current-file-title">Current File</div>'
  +'  <div class="current-file-contents"></div>'
  +'</div>'
  +'<div class="download-queue">'
  +'  <div class="queue-title">Downloads</div>'
  +'  <ul></ul>'
  +'</div>'
  )
  , filestat: doT.compile(''
  +'<div>'
  +'  <div class="current-filename">{{=it.filename}}</div>'
  +'  <ol class="current-file-list">'
  +'    {{~ it.files :file:index}}'
  +'      <li data-order="{{=index}}" data-archive-filename="{{=it.filename}}" data-filename="{{=file.filename}}" data-offset="{{=file.offset}}" data-length="{{=file.length}}">{{=file.filename.split("/").reverse()[0]}}</li>'
  +'    {{~}}'
  +'  </ol>'
  +'</div>'
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
