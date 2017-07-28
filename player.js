var express = require('express');
var request = require('request');
var app = express();
var fs = require('fs');

var cloningMode = true;
const serverPort = 8888;
const hostname = "api.sde.globo.com";
const host = "https://api.sde.globo.com";
const interval = 10*1000;

const timeoutMinutes = 0;

app.use(express.bodyParser());


var cache = [];

function addToCache(url, body, headers_in, headers_out) {

  var d = new Date();
  d.setMinutes(d.getMinutes() + timeoutMinutes);

  var item = {
    url: url,
    dateTimeout: d,
    body: body,
    headers: { in: headers_in, out: headers_out}
  };

  cache.push(item);
  console.log('adicionado ao cache: ', item.url);
}

function getFromCache(url) {
  
  var reqItem = cache.filter(o => o.url === url);
  console.log('reqitem',reqItem);

  if(reqItem !== undefined && reqItem.length > 0) {
    
    if(reqItem[0].dateTimeout > Date.now()) {
      return reqItem[0].body;
    } else {
      cache = cache.filter(o => o.url !== url);
    }
  }
  return null;
}


function getRequest(url, headers, res) {
  var uri = (host + url);//'http://api.sde.globo.com/esportes/futebol/modalidades/futebol_de_campo/categorias/profissional/campeonatos/campeonato-brasileiro/edicoes/brasileirao-2015/jogos?pagina=1';
  headers.host = hostname;
  headers["accept-encoding"] = undefined;
  var options = {
    url: uri,
    headers: headers
  };

  request.get (options, function(err, req, body) {
    if(err) {
    	console.log('error:', err);
      return res.send(err, req.statusCode);
    }
    res.set(req.headers);
    res.send(body);
    addToCache(url, body, headers, req.headers);
  });
}

app.use(function (req, res) {
  console.log ('get recebido');
  console.log('urlOriginal: ' + req.originalUrl);
  console.log('headers:', req.headers);
  if(req.originalUrl === '' || req.originalUrl === '/')
  	return res.send('', 404);

  var body = getFromCache(req.originalUrl);

  if(body !== null) {
    console.log('usando cache');
    res.send(body);
  } else {
    console.log('requisitando');
    getRequest(req.originalUrl, req.headers, res);
  }

});

function saveBackup() {
  setTimeout(saveBackup, interval);
  var json = JSON.stringify(cache);
  fs.writeFile('backup/backup_' + Date.now() + '.json', json, 'utf8', function (err) {
    if(err)
      console.log('falha ao gravar arquivo', err);
  });
};

app.listen(serverPort, function() {
	console.log('iniciado');
  setTimeout(saveBackup, interval);
});