var Twirc = function(nick, pass, channel, url) {

var THIS = this;
  
  var STATE = 0;

  var ws = new WebSocket(url || 'ws://irc-ws.chat.twitch.tv/');
  ws.onerror = function(e) {
    console.error('Error... ', e);
    STATE = 0;
  };
  ws.onclose = function(e) {
    console.log('Closed... ' + e.reason);
    STATE = 0;
  };
  ws.onopen = function() {
    ws.send('PASS ' + pass);
    ws.send('NICK ' + nick);
  };
  
  THIS.send = function(msg) {
    ws.send('PRIVMSG ' + channel + ' :' + msg);
  };

  var messageHandlers = [
    // 0
    function(message) {
      if (!message.startsWith(':tmi.twitch.tv ')) {
        throw Error('Message did not start with proper: ' + message);
      }
      message = message.substring(':tmi.twitch.tv '.length);
      code = message.substring(0, 3);
      message = message.substring(3);
      if (code === '376') {
        ws.send('JOIN ' + channel);
        STATE++;
      }
    },
    // 1 - ESTABLISHED
    function(message) {
      if (handleJoin(message)) {
        return;
      }
      var id = message.match(/\:.*\.tmi\.twitch\.tv /);
      message = message.substring(id[0].length);
      code = message.substring(0, 3);
      if (code === '366') {
        ws.send('CAP REQ :twitch.tv/tags');
        ws.send('CAP REQ :twitch.tv/membership');
        ws.send('CAP REQ :twitch.tv/commands');
        STATE++;
      }
    },
    // 2 - CONNECTED
    function(message) {
      if (message.startsWith(':tmi.twitch.tv CAP * ACK :twitch.tv/tags')) {
        STATE++;
      }
    },
    // 3 - TWITCHED
    function(message) {
      handlePrivmsg(message) || handleJoin(message) || handlePart(message);
    },
  ];
  
  function handleJoin(message) {
    if (message.match('\:.*!.*@.*\.tmi\.twitch\.tv JOIN ' + channel)) {
      var nick = message.substring(1, message.indexOf('!'));
      THIS.onjoin && THIS.onjoin({
        nick: nick
      });
      return true;
    }
  };
  
  function handlePrivmsg(message) {
    var match = message.match('@.* \:.*!.*@.*\.tmi\.twitch\.tv PRIVMSG ' + channel + ' \:');
    if (!match) {
      return;
    }
    var tagsStr = message.substring(1, message.indexOf(' '));
    var tags = {};
    tagsStr.split(';').forEach(function(tagParam) {
      tags[tagParam.split('=')[0]] = tagParam.split('=')[1];
    });
    message = message.substring(tagsStr.length + 3);
    var nick = message.substring(0, message.indexOf('!'));
    message = message.substring(message.indexOf(' ') + 1);
    message = message.substring(('PRIVMSG ' + channel + ' :').length);
    var action = false;
    if (message.substring(1).indexOf('ACTION') === 0) {
      action = true;
      message = message.substring(('ACTION ').length + 1, message.length - 2);
    }
    THIS.onmessage && THIS.onmessage({
      nick: nick, 
      message: message, 
      tags: tags,
      action: action
    });
    return true;
  };
  
  function handlePart(message) {
    if (message.match('\:.*!.*@.*\.tmi\.twitch\.tv PART ' + channel)) {
      var nick = message.substring(1, message.indexOf('!'));
      THIS.onpart && THIS.onpart({
        nick: nick
      });
      return true;
    }
  };
  
  ws.onmessage = function(message) {
    var date = new Date();
    console.debug(date.getHours() + ':' + date.getMinutes() + ' | ' + message.data);
    if (message.data.startsWith('PING :tmi.twitch.tv')) {
      ws.send('PONG :tmi.twitch.tv');
      return;
    }
    message.data.split('\r\n').forEach(function(message) {
      if (message === '') {
        return;
      }
      messageHandlers[STATE](message);
    }); 
  };
}
