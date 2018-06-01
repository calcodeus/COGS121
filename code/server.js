const express = require('express');
const request = require('request');
const mongo = require('mongodb');
const mongoose = require('mongoose');
uri = 'mongodb://naruto:uzumaki@ds111479.mlab.com:11479/anime_noobs'
mongoose.connect(uri); //'mongodb://nanome+1:pguo@ds111479.mlab.com:11479/anime_noobs');
var db = mongoose.connection;
const Schema = mongoose.Schema;
const app = express();

var titleSchema = new Schema({
  id: String,
  poster_path: String,
  overview: String,
  release_date: String,
  genre_ids: [String],
  keyword_ids: [String],
  id: String,
  title: String,
  vote_count: Number,
  video: String,
  vote_average: Number
});

var Title = mongoose.model('Title', titleSchema);

function titleToSchema(title) {
  if (!title.keywords) {
    title.keywords = [];
  }
  if (title.genres) {
    title.genre_ids = title.genres.map((genres) => {
      genre.id;
    });
  }
  var t1 = new Title({
    id: title.id,
    poster_path: title.poster_path,
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

var genreSchema = new Schema({
  name: String,
  id: String,
  recs: [String]
});

var Genre = mongoose.model('Genre', genreSchema);

var keywordSchema = new Schema({
  name: String,
  id: String,
  recs: [String]
});

var Keyword = mongoose.model('Keyword', keywordSchema);

app.use(express.static('static_files'));

//dictionary to convert from id to genre name
const genres = {};
//dictionary to convert from id to keyword name
const keywords = {};
//dictionary to convert from title id to object containing data about the title
const titles = {};
//data looks like this:
//{'name': title.name,'id:title.id', 'media_type': title.media_type, 'genre_ids': title.genre_ids};
//fields: name, id, media_type, genre_ids, keyword_ids

const TMDB_API_Key = 'fc0cb79574fbab583015789c89ddd591';
const genreQueryObject = {
  api_key: TMDB_API_Key,
  language: 'en-US'
};

request({
    url: 'https://api.themoviedb.org/3/genre/movie/list?',
    qs: genreQueryObject
  },
  (err, response, body) => {
    if (err) {
      console.log(err);
      return;
    }

    request({
        url: 'https://api.themoviedb.org/3/genre/tv/list?',
        qs: genreQueryObject
      },
      (err1, response1, body1) => {
        if (err1) {
          console.log(err1);
          return;
        }
        const results = JSON.parse(body);
        const results1 = JSON.parse(body1);
        results.genres.forEach((genre) => {
          genres[genre.id] = genre.name;
        });
        results1.genres.forEach((genre) => {
          genres[genre.id] = genre.name;
        });
          Object.keys(genres).forEach((id)=>{
            console.log('id: ' + id + " name: " + genres[id]);
          });
      });
  });

function cacheNpages(id, name, i, n) {
  console.log('caching page ' + i);
  if (i > n) return;
  cacheNewGenre(id, name, i);
  setTimeout(function() {
    cacheNpages(id, name, i + 1, n)
  }, 15000);
}

//finds keywords for a movie or show
app.get('/keywords/:type/:id', (req, res) => {
  const id = req.params.id;
  const url = 'https://api.themoviedb.org/3/' + req.params.type + '/' + id + '/keywords?';
  const propertiesObject = {
    api_key: TMDB_API_Key
  };
  request({
      url: url,
      qs: propertiesObject
    },
    (err, response, body) => {
      if (err) {
        console.log(err);
        return
      }
      var results;
      if (req.params.type == 'movie') {
        results = JSON.parse(body).keywords;
      } else {
        results = JSON.parse(body).results;
      }

      console.log(body);
      res.send(results);
      if (results) {
        results.forEach((kw) => {
          keywords[kw.id] = kw.name;
          cacheNewKeyword(kw.id, kw.name);
        });
      }
    });
});

app.get('/find/:searchName', (req, res) => {
  const query1 = req.params.searchName;
  const url = 'https://api.themoviedb.org/3/search/multi?'
  const propertiesObject = {
    api_key: TMDB_API_Key,
    language: 'en-US',
    query: query1,
    page: '1',
    include_adult: 'false'
  };
  request({
    url: url,
    qs: propertiesObject
  }, (err, response, body) => {
    if (err) {
      console.log(err);
      return;
    }
    const results = JSON.parse(body).results;

    const mediaResults = [];
    results.forEach((res) => {
      if (res.known_for) return;
      if (res.name) {
        res.title = res.name;
        res.release_date = res.first_air_date;
        mediaResults.push(res);
      } else {
        mediaResults.push(res);
      }
    });

    mediaResults.forEach((title) => {

      Title.findOne({
        id: title.id
      }, (err, found) => {
        if (err) console.log('err while trying to find title: ' + id);
        else if (found) {
          console.log('movie already cached');
        } else {
          console.log('movie not yet cached');
          const newTitle = titleToSchema(title);
          newTitle.$__save({}, function(err) {
            if (err) console.log('save problem');
            else {
              console.log('added a title to collection');
            }
          });
        }
      });
    });
    res.send(mediaResults);
  });
});



app.get('/getDictionaries', (req, res) => {
  res.send({
    genres,
    keywords
  });
});

//Sample code for a mongoose lookup
function getMovie(id) {
  Title.find({
    id: id
  }, (err, title) => {
    if (err) {
      console.log('movie find error', err);
    } else if (title) {
      return title;
    } else {
      console.log('movie not cached');
    }
  });
}
//Adds a new keyword with recommended movies and show to the cache
function cacheNewKeyword(_id, _name) {

  Keyword.findOne({
    id: _id
  }, (error, found) => {
    if (error) {
      console.log('error fetching genre: ' + _name);
    } else if (found) {
      console.log('keyword already cached: ' + _name);
    } else {
      console.log('caching new keyword: ' + _name);
      const url = 'https://api.themoviedb.org/3/discover/movie?';
      const animeGenre = '18';
      const animeKeyword = '210024';
      const propertiesObject = {
        api_key: TMDB_API_Key,
        language: 'en-US',
        with_genres: animeGenre,
        with_keywords: animeKeyword + ', ' + _id
      };
      request({
          url: url,
          qs: propertiesObject
        },
        (err, response, body) => {
          if (err) {
            console.log(err);
            return;
          }
          const results = JSON.parse(body);
          if (results) {
            if (results.results) {
              var _recs = results.results.map((rec) => {
                return rec.id;
              });
              var dbEntry = new Keyword({
                id: _id,
                name: _name,
                recs: _recs
              });
              dbEntry.save(function(err) {
                if (err) throw err;
              });
              console.log(results.results.map((res) => res.title));
            } else {
              console.log("WTF===============================");
              console.log(results);
            }
          }
        });
    }
  });
}

function cacheNewGenre(_id, _name, page) {
  const url = 'https://api.themoviedb.org/3/discover/movie?';
  const animeGenre = '18';
  const animeKeyword = '210024';
  const propertiesObject = {
    api_key: TMDB_API_Key,
    language: 'en-US',
    with_genres: animeGenre + ', ' + _id,
    with_keywords: animeKeyword,
    page: page
  };
  request({
      url: url,
      qs: propertiesObject
    },
    (err, response, body) => {
      if (err) {
        console.log(err);
        return;
      }

      const results = JSON.parse(body);
      if (results) {
        if (results.results) {

          Genre.findOne({
            id: _id
          }, (error, found) => {
            if (error) {
              console.log('error fetching genre: ' + _name);
            } else if (found) {
              const _recs = found.recs;
              results.results.forEach((rec) => {
                _recs.push(rec.id);
              });
              found.recs = _recs;
              found.save(function(err) {
                if (err) throw err;
                console.log('genre page added: ' + _name + ' ' + page);
              });
            } else {
              console.log('genre not seen before');
              if (page > 1) console.log('pages missing');
              const _recs1 = results.results.map((rec) => {
                return '' + rec.id;
              });
              var dbEntry = new Genre({
                id: _id,
                name: _name,
                recs: _recs1
              })
              dbEntry.save(function(err) {
                if (err) throw err;
                console.log('cached new Genre: ' + _name + ' ' + page);
              });
              console.log(results.results.map((res) => res.title));
            }
          });


        } else {
          console.log("WTF===============================");
          console.log(results);
        }
      }
    });
}

app.get('/getMovie/:id', (req, res) => {
  Title.findOne({
    id: req.params.id
  }, (err, found) => {
    if (err) console.log('err while trying to find title: ' + id);
    else if (found) {
      res.send(found);
      console.log('movie already cached');
    } else {
      const url = 'https://api.themoviedb.org/3/movie/' + req.params.id;
      const propertiesObject = {
        api_key: TMDB_API_Key,
      };
      request({
          url: url,
          qs: propertiesObject
        },
        (err, response, body) => {
          if (err) {
            console.log('err in movie get', err);
            return;
          }
          const result = JSON.parse(body);
          if (result) {
            res.send(result);
            const newTitle = titleToSchema(result);
            newTitle.$__save({}, function(err) {
              if (err) console.log('save problem');
              else {
                console.log('added a title to collection');
              }
            });
          } else {
            console.log('no such movie');
          }
        });
    }
  });
});

//Looks up recommendations in the cache using the id.
app.get('/recommend/Keyword/:id', (req, res) => {
  const id = req.params.id;
  Keyword.findOne({
    id: id
  }, (err, keyword) => {
    if (err) {
      console.log('movie find error', err);
    } else if (keyword) {
      console.log(keyword);
      console.log('recs cached for kw: ' + keyword.name);
      res.send(keyword.recs);
    } else {
      console.log('no recs cached for Keyword ' + id);
      res.send([]);
    }
  });
});

//Looks up recommendations in the cache using the id.
app.get('/recommend/Genre/:id', (req, res) => {
  const id = req.params.id;
  Genre.findOne({
    id: id
  }, (err, genre) => {
    if (err) {
      console.log('movie find error', err);
    } else if (genre) {
      res.send(genre.recs);
    } else {
      console.log('no recs cached for genre' + id);
      res.send([]);
    }
  });
});


app.listen(3000, () => {
  console.log('Server started at http://localhost:3000/');
});
