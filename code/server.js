
// Node.js + Express server backend for petsapp
//
// COGS121 by Philip Guo
// https://github.com/pgbovine/COGS121

// Prerequisites - first run:
//   npm install
//
// which will look in package.json and install all dependencies
// (e.g., express)
//
// To start the server, run:
//   node server.js
//
// and open the frontend webpage at http://localhost:3000/petsapp.html

const express = require('express');
const request = require('request');
const app = express();

// put all of your static files (e.g., HTML, CSS, JS, JPG) in the static_files/
// sub-directory, and the server will serve them from there. e.g.,:
//
// http://localhost:3000/petsapp.html
// http://localhost:3000/cat.jpg
//
// will send the file static_files/cat.jpg to the user's web browser
//
// Learn more: http://expressjs.com/en/starter/static-files.html
app.use(express.static('static_files'));


// simulates a database in memory, to make this example simple and
// self-contained (so that you don't need to set up a separate database).
// note that a real database will save its data to the hard drive so
// that they become persistent, but this fake database will be reset when
// this script restarts. however, as long as the script is running, this
// database can be modified at will.


const genres = {};
const TMDB_API_Key = 'fc0cb79574fbab583015789c89ddd591';
const genreQueryObject = { api_key :TMDB_API_Key, language:'en-US'};
request({
  url:'https://api.themoviedb.org/3/genre/movie/list?',
  qs:genreQueryObject
},
(err, response, body) =>
{ if (err) {console.log(err); return;}
  Object.assign(genres, JSON.parse(body).genres);
});
request({
  url:'https://api.themoviedb.org/3/genre/tv/list?',
  qs:genreQueryObject
},
(err, response, body) =>
{ if (err) {console.log(err); return;}
  Object.assign(genres, JSON.parse(body).genres);
});


const fakeDatabase = {
  '1': {title: 'Death Note', year: '2006', rating: "9.0", poster: "deathnote.jpg", description: "An intelligent high school student goes on a secret crusade to eliminate criminals from the world after discovering a notebook capable of killing anyone whose name is written into it."},
  '2': {title: 'Code Geass', year: '2006', rating: "8.7", poster: "codegeass.jpg", description: "The Empire of Britannia has invaded Japan using giant robot weapons called Knightmare Frames. Japan is now referred to as Area 11, and its people the 11's."},
};


// To learn more about server routing:
// Express - Hello world: http://expressjs.com/en/starter/hello-world.html
// Express - basic routing: http://expressjs.com/en/starter/basic-routing.html
// Express - routing: https://expressjs.com/en/guide/routing.html


// GET a list of all usernames
//
// To test, open this URL in your browser:
//   http://localhost:3000/users
app.get('/users', (req, res) => {
});


console.log("out here");
app.get('/find/:searchName', (req, res) =>
{
  const query1 = req.params.searchName;
  const url = 'https://api.themoviedb.org/3/search/multi?'
  const propertiesObject = { api_key :TMDB_API_Key, language:'en-US', query:query1, page:'1', include_adult:'false' };
  request({
    url:url,
    qs:propertiesObject
  },
  (err, response, body) =>
  {
    if (err) {console.log(err); return;}
    res.send(JSON.parse(body).results);
  });
});

app.get('/recommend', (req, res) =>
{
  const url = 'https://api.themoviedb.org/3/discover/movie?'
  const genres = '18'
  const animeKeyword = '210024, '
  const keywords = animeKeyword + '10046'
  const propertiesObject = {
    api_key:TMDB_API_Key, language:'en-US',
    with_genres: genres,
    with_keywords: keywords
  };
  request({
    url:url,
    qs:propertiesObject
  },
  (err, response, body) =>
  {
    if (err) {console.log(err); return;}
    console.log(response.statusCode);
    console.log("recs: " + JSON.parse(body).results);
    res.send(JSON.parse(body).results);
  });
});

// GET profile data for a user
//
// To test, open these URLs in your browser:
//   http://localhost:3000/users/Philip
//   http://localhost:3000/users/Carol
//   http://localhost:3000/users/invalidusername
app.get('/recommendations/:rn', (req, res) => {
  const recNum = req.params.rn; // matches ':userid' above
  const val = fakeDatabase[recNum];
  console.log(recNum, '->', val); // for debugging
  if (val) {
    res.send(val);
  } else {
    res.send({}); // failed, so return an empty object instead of undefined
  }
});

// start the server at URL: http://localhost:3000/
app.listen(3000, () => {
  console.log('Server started at http://localhost:3000/');
});
