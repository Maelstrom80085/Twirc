var EMOTES = {};

(function() {
  function fetch(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (xhr.readyState !== 4) {
        return;
      }
      var res = JSON.parse(xhr.responseText);
      callback(res);
    }
    xhr.open('GET', url);
    xhr.responseType = 'text';
    xhr.send();
  };
  
  fetch('https://api.betterttv.net/2/emotes', function(o) {
    o.emotes.forEach(function(emote) {
      EMOTES[emote.code] = 'http:' + o.urlTemplate.replace('{{id}}', emote.id).replace('{{image}}', '1x');
    });
  });
  
  var ffzf = function(o) {
    for (var set in o.sets) {
      o.sets[set].emoticons.forEach(function(emote) {
        EMOTES[emote.name] = 'http:' + emote.urls['1'];
      });
    }
  };
  
  fetch('https://api.frankerfacez.com/v1/set/global', ffzf);
  fetch('https://api.frankerfacez.com/v1/room/maelstrom1001', ffzf);
  
})();
