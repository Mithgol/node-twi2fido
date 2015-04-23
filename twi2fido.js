#!/usr/bin/env node

var twi2fido = require('./t2f-core.js');
var clog = console.log;

var loginName, textOutput, fileLastRead;

var params = [].concat(process.argv);
params.shift(); // 'node'
params.shift(); // 'twi2fido'

var CHRS = 'UTF-8 4';
params = params.filter(function(nextParam){
   if( nextParam.indexOf('--CHRS=') !== 0 ) return true;

   CHRS = nextParam.slice('--CHRS='.length);
   return false;
});

if( params.length < 1 ){
   clog('Usage:');
   clog('   twi2fido loginName textOutput fileLastRead');
   clog('');
   clog('Parameters:');
   clog('');
   clog('loginName    -- login name (screen name) of a microblog in Twitter');
   clog('');
   clog('textOutput   -- (optional) path to an output text file');
   clog('                where the recent tweets should be written to.');
   clog('                (By default, loginName.tweets.txt.)');
   clog('');
   clog('fileLastRead -- (optional) path to a file where the ID');
   clog('                of the last read tweet will be stored.');
   clog('                (By default, loginName.lastread.txt.)');
   clog('');
   clog('An optional "--CHRS=CP866 2" parameter (before or after any of');
   clog('the above) switches twi2fido from UTF-8 to the given charset.');
   clog('All of the FTS-5003.001 Level 2 character sets are supported');
   clog('as long as https://github.com/ashtuchkin/iconv-lite knows of them');
   clog('(usually it does).');
} else if (params.length == 1) {
   loginName    = params[0];
   textOutput   = loginName + '.tweets.txt';
   fileLastRead = loginName + '.lastread.txt';
} else if (params.length == 2) {
   loginName    = params[0];
   textOutput   = params[1];
   fileLastRead = loginName + '.lastread.txt';
} else if (params.length > 2) {
   loginName    = params[0];
   textOutput   = params[1];
   fileLastRead = params[2];
}

twi2fido(loginName, textOutput, fileLastRead, CHRS);
