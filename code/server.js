const express = require('express');
const request = require('request');
const app = express();

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
    Object.assign(genres, JSON.parse(body).genres);
  });
request({
    url: 'https://api.themoviedb.org/3/genre/tv/list?',
    qs: genreQueryObject
  },
  (err, response, body) => {
    if (err) {
      console.log(err);
      return;
    }
    Object.assign(genres, JSON.parse(body).genres);
  });


const fakeDatabase = {
  '1': {
    title: 'Death Note',
    year: '2006',
    rating: "9.0",
    poster: "deathnote.jpg",
    description: "An intelligent high school student goes on a secret crusade to eliminate criminals from the world after discovering a notebook capable of killing anyone whose name is written into it."
  },
  '2': {
    title: 'Code Geass',
    year: '2006',
    rating: "8.7",
    poster: "codegeass.jpg",
    description: "The Empire of Britannia has invaded Japan using giant robot weapons called Knightmare Frames. Japan is now referred to as Area 11, and its people the 11's."
  },
};

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
      console.log('body: ' + body);

      const results = JSON.parse(body).keywords;
      console.log('results: ' + results);
      res.send(results);
      if (results) {
        results.forEach((kw) => {
          keywords[kw.id] = kw.name
        });
        titles[id].genre_ids = results.map((kw) => kw.id);
      }
    });
});

app.get('/users', (req, res) => {});

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
    },
    (err, response, body) => {
      if (err) {
        console.log(err);
        return;
      }
      const results = JSON.parse(body).results;
      results.forEach((title) => {
        titles[title.id] = {
          'name': title.name,
          'id': title.id,
          'media_type': title.media_type,
          'genre_ids': title.genre_ids
        };
      })
      res.send(results);
    });
});

app.get('/getDictionaries', (req, res) => {
  res.send({
    genres,
    keywords
  });
});

app.get('/recommend/:type/:id', (req, res) => {
  var recGenre = '';
  var recKeyword = '';

  if (req.params.type == "Genre") {
    recGenre = ', ' + req.params.id;
  } else if (req.params.type == "Keyword") {
    recKeyword = ', ' + req.params.id;
  } else {
    console.log("rec type not found");
  }

  const url = 'https://api.themoviedb.org/3/discover/movie?';
  const animeGenre = '18';
  const animeKeyword = '210024';
  const propertiesObject = {
    api_key: TMDB_API_Key,
    language: 'en-US',
    with_genres: animeGenre + recGenre,
    with_keywords: animeKeyword + recKeyword
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
      console.log(response.statusCode);
      const results = JSON.parse(body);
      console.log(body);
      res.send(results);
    });
});


app.listen(3000, () => {
  console.log('Server started at http://localhost:3000/');
});
