var fs = require('fs');
var path = require('path');
var util = require('util');
var moment = require('moment');
var simteconf = require('simteconf');
var twitter = require('twitter');

var config = simteconf( path.join(__dirname, 'twi2fido.config') );

module.exports = function(loginName, textOutput, fileLastRead){
   textOutput   = path.resolve(__dirname, textOutput);
   fileLastRead = path.resolve(__dirname, fileLastRead);

   var twi = new twitter({
      consumer_key:        config.last('ConsumerKey'),
      consumer_secret:     config.last('ConsumerSecret'),
      access_token_key:    config.last('AccessTokenKey'),
      access_token_secret: config.last('AccessTokenSecret'),
   });
   twi.get(
      'statuses/user_timeline',
      {
         // include_rts: false,
         screen_name: loginName
      },
      function(err, tweetList){
         if( err ) throw new Error( util.inspect(err, { depth: null }) );

         var content = '';
         // console.log( util.inspect(tweetList, { depth: null }) );
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
      }
   );
};