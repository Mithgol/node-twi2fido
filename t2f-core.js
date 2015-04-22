var fs = require('fs');
var path = require('path');
var util = require('util');
var moment = require('moment');
var simteconf = require('simteconf');
var twitter = require('twitter');

var config = simteconf( path.join(__dirname, 'twi2fido.config') );

var getLastReadFromFile = function(filename){
   try {
      var readData = fs.readFileSync(filename, {encoding: 'utf8'});
   } catch(e) {
      return null;
   }
   if( /^\s*$/.test(readData) ) return null;
   return readData;
};

var eraseFile = function(filename){
   try {
      fs.unlinkSync(filename);
   } catch(e) {};
};

module.exports = function(loginName, textOutput, fileLastRead){
   textOutput   = path.resolve(__dirname, textOutput);
   fileLastRead = path.resolve(__dirname, fileLastRead);

   var twi = new twitter({
      consumer_key:        config.last('ConsumerKey'),
      consumer_secret:     config.last('ConsumerSecret'),
      access_token_key:    config.last('AccessTokenKey'),
      access_token_secret: config.last('AccessTokenSecret'),
   });

   var tweeOptions = {
      // include_rts: false,
      screen_name: loginName
   };
   var lastRead = getLastReadFromFile(fileLastRead);
   if( lastRead === null ){
      tweeOptions.count = 50;
   } else {
      tweeOptions.since_id = lastRead;
   }

   twi.get('statuses/user_timeline', tweeOptions, function(err, tweetList){
      if( err ) throw new Error( util.inspect(err, { depth: null }) );

      var content = '';
      // console.log( util.inspect(tweetList, { depth: null }) );
      if( tweetList.length < 1 ){
         eraseFile(textOutput);
         console.log('Zero tweets received, output file erased.');
         return;
      }
      tweetList.forEach(function(tweet, idx){
         if( idx > 0 ) content += '\n\n\n\n';
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
            source.id,
            '\n\n',
            source.text
         ].join('');
      });
      // console.log(content);
      fs.writeFileSync(textOutput, content);
      console.log(tweetList.length + ' tweet(s) written.');
      fs.writeFileSync(fileLastRead, tweetList[0].id_str);
   });
};