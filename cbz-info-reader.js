'use strict'

require('mkee')(CbzInfoReader)
require('mkee')(CbzInfoRequest)

module.exports = CbzInfoReader

function CbzInfoReader(root){
  this.root = root
}

CbzInfoReader.prototype.request = function(url){
  return new CbzInfoRequest(this.root, url)
}

function CbzInfoRequest(root, url){
  var _this = this
  var ended = false
  var ws = this.ws = new WebSocket(root)

  ws.onopen = function(){
    ws.send(JSON.stringify({url:url}))
  }

  ws.onmessage = function(message){
    try{
      var data = JSON.parse(message.data)
    } catch(e){
      return _this.emit('error', e)
    }

    if(data.error){
      _this.emit('error', new Error(data.error))
    }

    if(data.stat){
      _this.emit('stat', data.stat)
    }
    if(data.files){
      _this.emit('files', data.files)
      if(!data.more){
        ended = true
        _this.emit('end')
      }
    }
    if(data.file){
      _this.emit('file', data.file)
    }
    if(data.end){
      ended = true
      _this.emit('end')
    }
  }

  ws.onerror = function(e){
    ended = true
    _this.emit('error', e)
  }

  ws.onclose = function(e){  
    if(!ended)
      _this.emit('error', new Error('Socket closed unexpectedly') ,e)
  }
}
