const express = require('express');
const aposToLexForm = require('apos-to-lex-form');
const natural = require('natural');
const SpellCorrector = require('spelling-corrector');

const router = express.Router();

const spellCorrector = new SpellCorrector();
spellCorrector.loadDictionary();

// Set up a route that will process tweets
router.post('/s-analyzer', function(req, res, next) {
  const { review } = req.body;
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

  // returns from -3 to 3 indicating sentiment results
  res.status(200).json({ analysis });
});