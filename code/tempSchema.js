const mongo = require('mongodb');
const mongoose = require('mongoose');
mongoose.connect('mongodb://nanome+1:pguo@ds111479.mlab.com:11479/anime_noobs');
const Schema = mongoose.Schema;


titleToSchema(title){
  if (!title.keywords){
    title.keywords = [];
  }
  var t1 = new Title({
    name: title.name,
    id: title.id,
    poster: title.poster,
    overview: title.overview,
    release_date: title.release_date,
    genre_ids: title.genre_ids,
    keyword_ids: title.keywords,
    id: title.id,
    title: title.title,
    vote_count: title.vote_count,
    vote_average: title.vote_average
  });
  return t1;
}

var titleSchema = new Schema({
  name: String,
  id: String,
  poster: String,
  overview: String,
  release_dat: String,
  genre_ids: [String],
  keyword_ids: [String],
  id: String,
  title: String,
  vote_count: Number,
  video: String,
  vote_average: Number
});
