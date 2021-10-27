const { default: axios } = require('axios');
const redis = require('redis');
var express = require('express');
var router = express.Router();
const aposToLexForm = require('apos-to-lex-form');
const natural = require('natural');
const SpellCorrector = require('spelling-corrector');
const SW = require('stopword');
var path = require('path');

// Sets up static content path (images, css)
router.use(express.static(path.join(__dirname, 'public')));

const spellCorrector = new SpellCorrector();
spellCorrector.loadDictionary();

// Note for Shannon: run this command to start redis: redis-server --service-start
// Also remember to update the aws credentials file or bugs occur.

// Create S3 bucket name
const AWS = require('aws-sdk');
const bucketName = 'cab432-assign2-mills-tetley';

// Create and connect redis client to local instance.
const redisClient = redis.createClient();

// Print redis errors to the console
redisClient.on('error', (err) => {
  console.log("Error " + err);
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Twitter Analyser' });
});

/* GET search page. */
router.get('/search/', function(req, res, next) {
  console.log(req.query.topic);
  const topic = req.query.topic;

  const redisKey = `twitter:${topic}`;

  // Try the cache
  return redisClient.get(redisKey, (err, result) => {
  
    // If that key exist in Redis store
    if (result) {
      const resultJSON = JSON.parse(result);
      console.log("Served from Redis");

      // Send result to nlp.js for processing
      // console.log(doNLP(JSON.stringify(resultJSON)));
      const sentiment = NLP(JSON.stringify(resultJSON));
      console.log('nlp output is: ' + sentiment);

      res.render('index', { title: 'Twitter Analyser', topic : JSON.stringify(resultJSON), sentiment : sentiment.toFixed(2) });
      
    } else { // Key does not exist in Redis store - serve from S3 and store in cache
      console.log("Key does not exist in redis");

      const s3Key = `twitter-${topic}`;
      // Check S3
      const params = { Bucket: bucketName, Key: s3Key};
          
      return new AWS.S3({apiVersion: '2006-03-01'}).getObject(params, (err, result) => {
        if(result){
          // Serve from S3
          console.log("Served from S3");
          const resultJSON = JSON.parse(result.Body);

          // Save the Twitter API response in Redis store
          redisClient.setex(`twitter:${topic}`, 3600, JSON.stringify({ source: 'Redis Cache', resultJSON, }));
          
          // Send result to NLP function for processing
          const sentiment = NLP(resultJSON);
          console.log('nlp output is: ' + sentiment);

          res.render('index', { title: 'Twitter Analyser', topic : JSON.stringify(resultJSON), sentiment : sentiment.toFixed(2) });

        } else { // Key does not exist in S3 - get from Twitter API and store in S3 AND Cache
          // Set Twitter Bearer Token authorisation and url (code generated by postman)
          var config = {
            method: 'get',
            url: ('http://api.twitter.com/2/tweets/search/recent?query=' + topic + '%20lang%3Aen'),
            headers: { 
              'Authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAABpxUwEAAAAAdDYRJVcOC7COTE47xw1zPLiYSPI%3D5QMpEEW3iHzXaMduYOWW0JNwxw0dj1oo6M3lOEapfn4lHMeeF2'
            }
          };
          // Get response from twitter API
          axios(config)
            .then( (response) => {
              return response.data;
            })
            .then( (rsp) => { 
              console.log("Key does not exist in S3");
              var result = JSON.stringify(rsp);
              redisClient.setex(`twitter:${topic}`, 3600, JSON.stringify({ source: 'Redis Cache', ...rsp, }));
              
              // Store in S3
              // Create a promise on S3 service object
              // Create params for putObject call
              const objectParams = {Bucket: bucketName, Key: s3Key, Body: JSON.stringify({ source: 'S3', ...rsp, })};
              // Create object upload promise
              const uploadPromise = new AWS.S3({apiVersion: '2006-03-01'}).putObject(objectParams).promise();
              uploadPromise.then(function(data) {
                  console.log("Successfully uploaded data to " + bucketName + "/" + s3Key);
              });

              // Send result to NLP function for processing
              const sentiment = NLP(result);
              console.log('nlp output is: ' + sentiment);

              // Render page from twitter API response
              res.render('index', { title: 'Twitter Analyser', topic : result, sentiment : sentiment.toFixed(2) });
            })
            .catch((error) => {
              console.error(error);
            })
        }
      });
    }
  });

  // This needs error catching !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  // Missing modules will crash the app!
  // Accepts a string of tweets.
  // Outputs a number representing the sentiment of the tweets.
  // Ranges from -3 to 3 with negative numbers representing negative sentiment
  // and positive numbers represeting positive sentiment.
  function NLP(review) {

    // console.log('Raw NLP input is: ' + review);
    // review = review;
    console.log('NLP to sting input is: ' + review);

    // Filter out junk that the Twitter endpoint generates.
    const noData = review.replace(/("data")+/g, '');
    const noSource = noData.replace(/("source":"Redis Cache")+/g, '');
    const noID = noSource.replace(/("id")+/g, '');
    const noRT = noID.replace(/("text":"RT)+/g, '');
    const noText = noRT.replace(/("text")+/g, '');
    const noHandle = noText.replace(/(@[a-zA-Z0-9]+[:|\s])/g, '');
    const noMeta = noHandle.replace(/("meta".+("}}))$/g, '');
    // console.log(`NLP String junk removed: ${noMeta}`);

    // Following code breaks the text down into a usable form.
    // apos will convert contractions to full words e.g. I'm to I am, doesn't to does not.
    const lexedReview = aposToLexForm(noMeta);
    const casedReview = lexedReview.toLowerCase();
    const alphaOnlyReview = casedReview.replace(/[^a-zA-Z\s]+/g, '');
    // console.log(`alphaOnlyReview output is: ${alphaOnlyReview}`);
  
    // Tokenize the text into meaningful units that can be worked on.
    const { WordTokenizer } = natural;
    const tokenizer = new WordTokenizer();
    const tokenizedReview = tokenizer.tokenize(alphaOnlyReview);
  
    tokenizedReview.forEach((word, index) => {
      tokenizedReview[index] = spellCorrector.correct(word);
    })
    const filteredReview = SW.removeStopwords(tokenizedReview);
  
    // PLerform the analysis
    const { SentimentAnalyzer, PorterStemmer } = natural;
    const analyzer = new SentimentAnalyzer('English', PorterStemmer, 'afinn');
    const analysis = analyzer.getSentiment(filteredReview);
  
    return analysis
  };

});

module.exports = router;
