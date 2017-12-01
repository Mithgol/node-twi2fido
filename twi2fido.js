#!/usr/bin/env node

var twi2fido = require('./t2f-core.js');
var cl = require('ciel');
var clog = console.log;

var loginName, textOutput, fileLastRead;

var params = [].concat(process.argv);
params.shift(); // 'node'
params.shift(); // 'twi2fido'

var CHRS = 'UTF-8 4';
var hashtags = [];
var countingMode = false;
var debugMode = false;
var noRunes = false;
params = params.filter(nextParam => {
   if( nextParam.startsWith('--CHRS=') ){
      CHRS = nextParam.slice('--CHRS='.length);
      return false;
   } else if( nextParam.startsWith('--hashtag=') ){
      hashtags = nextParam.slice( '--hashtag='.length ).split(',').map(
         nextChunk => nextChunk.trim()
      ).filter( nextChunk => nextChunk.length > 0 ).map(
         nextChunk => nextChunk.startsWith('#') ? nextChunk : ('#'+nextChunk)
      );
      return false;
   } else if( nextParam.toLowerCase() === '--norunes' ){
      noRunes = true;
      return false;
   } else if( nextParam.toLowerCase() === '--count' ){
      countingMode = true;
      return false;
   } else if( nextParam.toLowerCase() === '--debug' ){
      debugMode = true;
      return false;
   }

   return true;
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
   clog('');
   clog('An optional "--norunes" parameter (before or after any of the');
   clog('above) prevents Fidonet runes from being generated to represent');
   clog('attachments (images, videos, animations) at the end of tweets.');
   clog('');
   clog('An optional "--hashtag=..." parameter (before or after any of the');
   clog('above) enables filtering by Twitter hashtags. Several hashtags');
   clog('(separated by commas) may be given. Only the tweets that contain');
   clog('at least one of the given hashtags are published. Example:');
   clog('--hashtag=anime,manga,vn');
   clog('');
   clog('An optional "--count" parameter (before or after any of the above)');
   clog('switches twi2fido to the counting mode. The recent tweets are not');
   clog('written to disk; instead of it, twi2fido reports the number of');
   clog('unposted tweets (taking "--hashtag=..." into account if present).');
   clog('You may use it before posting to check how many tweets would be');
   clog('posted.');
   clog('');
   clog('An optional "--debug" parameter (before or after any of the above)');
   clog('switches twi2fido to the debug mode. The recent tweets are not');
   clog('written to disk; instead of it, raw JSON data from Twitter becomes');
   clog('written to the file debug.json in the directory of twi2fido.');
   clog('It also ignores "--count" even if it is present.');
   process.exit(1);
} else if (params.length === 1) {
   loginName    = params[0];
   textOutput   = loginName + '.tweets.txt';
   fileLastRead = loginName + '.lastread.txt';
} else if (params.length === 2) {
   loginName    = params[0];
   textOutput   = params[1];
   fileLastRead = loginName + '.lastread.txt';
} else if (params.length > 2) {
   loginName    = params[0];
   textOutput   = params[1];
   fileLastRead = params[2];
}

if( hashtags.length > 0 ) cl.status('Hashtags: ' + hashtags.join(', ') + '.');

twi2fido(loginName, {
   textOutput: textOutput,
   fileLastRead: fileLastRead,
   CHRS: CHRS,
   noRunes: noRunes,
   counting: countingMode,
   debug: debugMode,
   hashtags: hashtags
});
