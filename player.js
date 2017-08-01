var express = require('express');
var request = require('request');
var app = express();
var fs = require('fs');
const zlib = require('zlib');

var playbackSpeed = 10;
var cloningMode = true;
var serverPort = 5001;
var hostname = "api.sde.globo.com";
var host = "https://api.sde.globo.com";
var indexFile = 0;
const startTime = 1501441122517;
const endTime = 1501459669138;
const backupFolder = './backup/';
const timeOffset = Date.now() + 5000;
app.use(express.bodyParser());
var nextCache = [];
const gmt = -3;

var cache = [];
var backupList = [];

console.log(startTime + 60*60*1000);

function initIndex() {
  var file = getFileName(startTime);
  indexFile = findFileIndex(file);
  readFile(backupFolder + backupList[indexFile], function(cacheTemp) {
    nextCache = cacheTemp;
    swapAndLoadCache();
  });
}

function findFileIndex(name) {
  return backupList.indexOf(name);
}

function getFileName(time) {
  return 'backup_' + time + '.json.gzip'
}

function readFile(name, callback) {
  console.log('FILE:', name);
  let d = '';
  fs.createReadStream(name)
  .pipe(zlib.createGunzip())
  .on('data', function (data){
    d += data.toString()
  })
  .on('end', function (){
    var cacheTemp = JSON.parse(d);
    callback(cacheTemp);
  })
  .on('error', function(err) {
    console.log('ERROR:', err);
  })
}


function getFileList(callback) {
  const fs = require('fs');

  fs.readdir(backupFolder, (err, files) => {
    backupList = files;
    callback();
  });
}
function getFromCache(url) {
  
  var reqItem = cache.filter(o => o.url === url);
  //console.log('reqitem',reqItem);

  if(reqItem !== undefined && reqItem.length > 0) {
    return reqItem[0];
  }
  return null;
}

app.use(function (req, res) {
  console.log ('get recebido');
  console.log('urlOriginal: ' + req.originalUrl);
  //console.log('headers:', req.headers);
  if(req.originalUrl === '' || req.originalUrl === '/')
  	return res.send('', 404);

  var cacheReq = getFromCache(req.originalUrl);

  if(cacheReq !== null && cacheReq.body !== null && cacheReq.headers !== null) {
    console.log('usando cache');
    res.set(cacheReq.headers.out);
    res.send(cacheReq.body);
  } else {
    console.log('não encontrado');
    res.send('', 404);
  }

});

function getTimeFromFileName(filename) {
  return parseInt(filename.slice(7, 7+13), 10);
}

function swapAndLoadCache() {
  cache = nextCache;
  indexFile = indexFile + 1;
  nextCache = readFile(backupFolder + backupList[indexFile], function(cacheTemp) {
    nextCache = cacheTemp;
    var nextTime = getTimeFromFileName(backupList[indexFile]);
    var date = new Date(nextTime+(gmt*60*60*1000)).toISOString().
    replace(/T/, ' ').      
    replace(/\..+/, '');
    console.log('novo arquivo', indexFile, backupList[indexFile], date);
  });
}

function getBackup() {
  setTimeout(getBackup, 1000);
  var nextTime = getTimeFromFileName(backupList[indexFile+1]);
  if((Date.now() - timeOffset)*playbackSpeed >= (nextTime - startTime)) {
    swapAndLoadCache();
  }
};

app.listen(serverPort, function() {
	console.log('iniciado');
  getFileList(initIndex);  
  setTimeout(getBackup, 5000);
});