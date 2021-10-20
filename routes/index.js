const { default: axios } = require('axios');
var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Twitter Analyser' });
});

/* GET search page. */
router.get('/search/', function(req, res, next) {
  console.log(req.query.topic);
  const topic = req.query.topic;

  // Set Bearer Token authorisation and url (code generated by postman)
  var config = {
    method: 'get',
    url: ('http://api.twitter.com/2/tweets/search/recent?query=' + topic),
    headers: { 
      'Authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAABpxUwEAAAAAdDYRJVcOC7COTE47xw1zPLiYSPI%3D5QMpEEW3iHzXaMduYOWW0JNwxw0dj1oo6M3lOEapfn4lHMeeF2'
    }
  };
  // Get response from twitter API
  axios(config)
    .then( (response) => {
      // console.log(JSON.stringify(response.data));
      return response.data;
    })
    .then( (rsp) => { 
      var result = JSON.stringify(rsp);
      res.render('index', { title: 'Twitter Analyser', topic : result });

    })
    .catch((error) => {
      console.error(error);
  })
});

module.exports = router;
