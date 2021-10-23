const express = require('express');
const aposToLexForm = require('apos-to-lex-form');
const natural = require('natural');
const SpellCorrector = require('spelling-corrector');
const SW = require('stopword');

const router = express.Router();

const spellCorrector = new SpellCorrector();
spellCorrector.loadDictionary();

const NLP = (review) => {

  // Following code breaks the text down into a usable form.
  // apos will convert contractions to full words e.g. I'm to I am, doesn't to does not.
  const lexedReview = aposToLexForm(review);
  const casedReview = lexedReview.toLowerCase();
  const alphaOnlyReview = casedReview.replace(/[^a-zA-Z\s]+/g, '');

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

  console.log('nlp output is: ' + analysis);
  // returns from -3 to 3 indicating sentiment results
  return analysis
};

// // Set up a route that will process tweets, must be accesed as a post request.
// router.post('/nlp', function(req, res, next) {
//   // Take the body of the res and put it in a variable
//   const { review } = req.body;
//   // Following code breaks the text down into a usable form.
//   // apos will convert contractions to full words e.g. I'm to I am, doesn't to does not.
//   const lexedReview = aposToLexForm(review);
//   const casedReview = lexedReview.toLowerCase();
//   const alphaOnlyReview = casedReview.replace(/[^a-zA-Z\s]+/g, '');

//   // Tokenize the text into meaningful units that can be worked on.
//   const { WordTokenizer } = natural;
//   const tokenizer = new WordTokenizer();
//   const tokenizedReview = tokenizer.tokenize(alphaOnlyReview);

//   tokenizedReview.forEach((word, index) => {
//     tokenizedReview[index] = spellCorrector.correct(word);
//   })
//   const filteredReview = SW.removeStopwords(tokenizedReview);

//   // PLerform the analysis
//   const { SentimentAnalyzer, PorterStemmer } = natural;
//   const analyzer = new SentimentAnalyzer('English', PorterStemmer, 'afinn');
//   const analysis = analyzer.getSentiment(filteredReview);

//   console.log('nlp output is: ' + analysis);
//   // returns from -3 to 3 indicating sentiment results
//   res.status(200).json({ analysis });
// });

module.exports = NLP;
module.exports = router;