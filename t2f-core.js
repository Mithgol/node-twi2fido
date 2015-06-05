var fs = require('fs');
var path = require('path');
var util = require('util');
var fiunis = require('fiunis');
var moment = require('moment');
var simteconf = require('simteconf');
var twitter = require('twitter');

var config = simteconf( path.join(__dirname, 'twi2fido.config') );

var getLastReadFromFile = function(filename){
   try {
      var readData = fs.readFileSync(filename, {encoding: 'utf8'});
      if( /^\s*$/.test(readData) ) return null;
      return readData;
   } catch(e) {
      return null;
   }
};

var eraseFile = function(filename){
   try {
      fs.unlinkSync(filename);
   } catch(e) {}
};

module.exports = function(loginName, textOutput, fileLastRead, CHRS){
   textOutput   = path.resolve(__dirname, textOutput);
   fileLastRead = path.resolve(__dirname, fileLastRead);

   var spaceIDX = CHRS.indexOf(' ');
   if( spaceIDX < 0 ){
      console.log([
         'The given charset "',
         CHRS,
         '" does not have an <encoding><whitespace><level> form.'
      ].join(''));
      console.log([
         'The standard ',
         'http://ftsc.org/docs/fts-5003.001',
         ' does not currently recommend it.'
      ].join(''));
      eraseFile(textOutput);
      process.exit(1);
   }
   var encodingCHRS = CHRS.slice(0, spaceIDX);
   if( !Buffer.isEncoding(encodingCHRS) ){
      console.log('The given encoding "' + encodingCHRS + '" is unknown.');
      console.log([
         'The module ',
         'https://github.com/ashtuchkin/iconv-lite',
         ' does not support it.'
      ].join(''));
      eraseFile(textOutput);
      process.exit(1);
   }
   var modeUTF8 = (encodingCHRS === 'UTF-8' || encodingCHRS === 'UTF8');

   var twi = new twitter({
      consumer_key:        config.last('ConsumerKey'),
      consumer_secret:     config.last('ConsumerSecret'),
      access_token_key:    config.last('AccessTokenKey'),
      access_token_secret: config.last('AccessTokenSecret'),
   });

   var tweeOptions = {
      // include_rts: false,
      count: 64,
      screen_name: loginName
   };
   var lastRead = getLastReadFromFile(fileLastRead);
   if( lastRead !== null ) tweeOptions.since_id = lastRead;

   twi.get('statuses/user_timeline', tweeOptions, function(err, tweetList){
      if( err ) throw new Error( util.inspect(err, { depth: null }) );

      var content = '';
      // console.log( util.inspect(tweetList, { depth: null }) );
      if( tweetList.length < 1 ){
         eraseFile(textOutput);
         console.log('Zero tweets received, output file erased.');
         return;
      }
      tweetList.forEach(function(tweet){
         var source = tweet.retweeted_status || tweet;

         content += [
            source.user.name,
            ' (@',
            source.user.screen_name,
            ') ',
            // source.created_at,
            // '\n',
            moment(
               source.created_at,
               'ddd MMM DD HH:mm:ss ZZ YYYY'
            ).utc().format('YYYY-MM-DD HH:mm:ss'),
            ' (UTC)\n\n',
            'https://twitter.com/',
            source.user.screen_name,
            '/status/',
            source.id_str,
            '\n\n',
            source.text,
            '\n\n\n\n'
         ].join('');
      });
      // console.log(content);
      twi.get('users/show', {screen_name: loginName}, function(err, userdata){
         content = '\u00A0\n' + content;
         if( !err && typeof userdata.profile_image_url_https === 'string' ){
            content = [
               '\x01AVATAR: ',
               userdata.profile_image_url.replace(
                  /_normal\.(jpe?g|png|gif|svg|webp)$/,
                  '.$1'
               ),
               '\n',
               content
            ].join('');
         }
         content = '\x01CHRS: ' + CHRS + '\n' + content;
         if( !modeUTF8 ) content = fiunis.encode(content, encodingCHRS);
         fs.writeFileSync(textOutput, content);
         console.log(tweetList.length + ' tweet(s) written.');
         fs.writeFileSync(fileLastRead, tweetList[0].id_str);
      });
   });
};