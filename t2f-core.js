var fs = require('fs');
var path = require('path');
var util = require('util');
var escapeStringRegExp = require('escape-string-regexp');
var fiunis = require('fiunis');
var moment = require('moment');
var simteconf = require('simteconf');
var twitter = require('twitter');
var XRegExp = require('xregexp');

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

module.exports = function(loginName, textOutput, fileLastRead, options){
   textOutput   = path.resolve(__dirname, textOutput);
   fileLastRead = path.resolve(__dirname, fileLastRead);

   var spaceIDX = options.CHRS.indexOf(' ');
   if( spaceIDX < 0 ){
      console.log([
         'The given charset "',
         options.CHRS,
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
   var encodingCHRS = options.CHRS.slice(0, spaceIDX);
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

   var hashtagRegExp = null;
   if( options.hashtags.length > 0 ){
      hashtagRegExp = XRegExp([
         '(?:',
         options.hashtags.map(function(nextHashtag){
            return escapeStringRegExp(nextHashtag);
         }).join('|'),
         ')(?=$|[^\\p{L}])'
      ].join(''), 'g');
   }

   var twi = new twitter({
      consumer_key:        config.last('ConsumerKey'),
      consumer_secret:     config.last('ConsumerSecret'),
      access_token_key:    config.last('AccessTokenKey'),
      access_token_secret: config.last('AccessTokenSecret'),
   });

   var tweeOptions = {
      // include_rts: false, ← can become a future setting!
      count: 60,
      screen_name: loginName
   };
   var lastRead = getLastReadFromFile(fileLastRead);
   if( lastRead !== null ) tweeOptions.since_id = lastRead;

   twi.get('statuses/user_timeline', tweeOptions, function(err, tweetList){
      if( err ) throw new Error( util.inspect(err, { depth: null }) );

      var content = '';
      if( options.debug ){
         console.log( util.inspect(tweetList, { depth: null }) );
         process.exit();
      }
      if( hashtagRegExp !== null ){
         tweetList = tweetList.filter(function(nextTweet){
            // same as in the iterator below:
            var sourceText = ( nextTweet.retweeted_status || nextTweet ).text;

            return hashtagRegExp.test(sourceText);
         });
      }
      if( tweetList.length < 1 ){
         eraseFile(textOutput);
         console.log('Zero tweets received, output file erased.');
         return;
      }
      tweetList.reverse(); // undo reverse chronological order
      tweetList.forEach(function(tweet){
         // same as in the filter above:
         var source = tweet.retweeted_status || tweet;
         var sourceText = source.text;

         // expand URLs in `sourceText`:
         if(
            typeof source.entities !== 'undefined' &&
            Array.isArray(source.entities.urls)
         ){
            source.entities.urls.forEach(function(objURL){
               if(
                  typeof objURL.url === 'string' &&
                  typeof objURL.expanded_url === 'string' &&
                  objURL.expanded_url.length <= 78 &&
                  objURL.expanded_url.indexOf( objURL.url ) < 0
               ){
                  while( sourceText.indexOf(objURL.url) > -1 ){
                     sourceText = sourceText.replace(
                        objURL.url,
                        objURL.expanded_url
                     );
                  }
               }
            });
         }
         if(
            typeof source.entities !== 'undefined' &&
            Array.isArray(source.entities.media)
         ){
            source.entities.media.forEach(function(mediaURL){
               if(
                  typeof mediaURL.url === 'string' &&
                  typeof mediaURL.display_url === 'string' &&
                  ('https://' + mediaURL.display_url).length <= 78 &&
                  ('https://' + mediaURL.display_url).indexOf(
                     mediaURL.url
                  ) < 0
               ){
                  while( sourceText.indexOf(mediaURL.url) > -1 ){
                     sourceText = sourceText.replace(
                        mediaURL.url,
                        'https://' + mediaURL.display_url
                     );
                  }
               }
            });
         }

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
            sourceText,
            '\n\n\n\n'
         ].join('');
      }); // tweetList.forEach
      tweetList.reverse(); // redo reverse chronological order
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
         content = '\x01CHRS: ' + options.CHRS + '\n' + content;
         if( !modeUTF8 ) content = fiunis.encode(content, encodingCHRS);
         fs.writeFileSync(textOutput, content);
         console.log([
            tweetList.length,
            ' tweet',
            (tweetList.length > 1)? 's' : '',
            ' written.'
         ].join(''));
         fs.writeFileSync(fileLastRead, tweetList[0].id_str);
      });
   });
};