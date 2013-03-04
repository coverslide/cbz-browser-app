var document = require('global/document')
var doT = require('dot')
var bytes = require('bytes')

module.exports = Queue

require('mkee')(Queue)

function Queue(options){
  this.element = document.getElementById(options.prefix + '-queue')
  this.element.innerHTML = this.templates.main()
  this.queueEl = this.element.querySelector('ul')
  
  this.on('filestream', this.onFileStream.bind(this))
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

  var data = []
  var loaded = 0
  var total = stat.size

  stream.on('data', function(d){
    var currentTime = +(new Date)

    data.push(d)
    loaded += d.byteLength
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
  +'<ul></ul>'
  )
  , progress: doT.compile(''
  +'<div>'
  +'  <h3>{{= it.path }}</h3>'
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
