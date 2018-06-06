/*
 * This file is for generating, displaying, and managing
 * the graph and any data related to the graph of results.
 */

const recNodes = {};
const basisNodes = {};
let bookmarks = {};

let favorites = {};
let keywordList = {};
const combined = [];
let genreList = {};
let recommendations = {};

/*
 * sends query to server
 * to get recommendations for genre or keyword
 */
function recFor(type, id) {
  const requestURL = 'recommend/' + type + '/' + id;
  //console.log('making ajax request to:', requestURL);
  return $.get(requestURL);
}

/*
 * iterates through keywords and gets recs for all
 */
function keywordSearch() {
  const defList = [];
  Object.keys(keywordList).forEach((k) => {
    //console.log(k);
    defList.push(recFor('Keyword', k));
  });
  //Object.keys(genreList).forEach((g) => {
  //console.log(g);
  //defList.push(recFor('Genre', g));
  //});
  return defList;
}

/*
 * compiles list of genres and keywords and
 * calculates their respective scores.
 */
function SetupLists(favs) {
  //console.log(typeof favs);
  //console.dir(favs);
  Object.keys(favs).forEach((id) => {
    const favorite = favs[id];
    favorite.genre_ids.forEach((gi) => {
      if (!genreList[gi]) {
        genreList[gi] = {
          id: gi,
          score: 0,
          basis: []
        }
      }
      genreList[gi].score += 1;
      genreList[gi].basis.push(id);
    });
    favorite.keyword_ids.forEach((ki) => {
      if (!keywordList[ki.id]) {
        keywordList[ki.id] = {
          id: ki.id,
          name: ki.name,
          score: 0,
          basis: []
        }
      }
      keywordList[ki.id].score += 1;
      keywordList[ki.id].basis.push(id);
    });
  });
  //console.dir(keywordList);
  //console.dir(genreList);
}

$(function() {

  favorites = JSON.parse(localStorage.favorites);


  SetupLists(favorites);


  var layoutPadding = 50;
  var aniDur = 500;
  var easing = 'linear';

  var cy;

  // gets the graph style file.
  var styleP = $.ajax({
    url: './style.cycss', // wine-and-cheese-style.cycss
    type: 'GET',
    dataType: 'text'
  });

  // add bookmark to the bookmark list.
  addBookmark = function(id) {
    if (!bookmarks[id]) {
      bookmarks[id] = recommendations[id];
      const data = bookmarks[id];
      const bookMarkDiv = document.getElementById('bookmarks');
      bookMarkDiv.insertAdjacentHTML('beforeend', [
        '<span id="bookmark-span', data.id, '" style="color:white;">',
        '<button id="bmid' + data.id + '"class="bookmarkBTN">',
        data.title,
        '</button>',
        '<button class="del" id="' + data.id + '">',
        '<i class="fas fa-times" ></i></button>',
        '<br></span>'
      ].join(''));
      $('#bmid' + data.id).click((e) => {
        highlightByID(data.id);
      });
      $('#' + data.id).click((e) => {
        removeBookmark(data.id);
      });
      localStorage.bookmarks = JSON.stringify(bookmarks);
    }
  }

  //removes bookmark from the list.
  function removeBookmark(id) {
    console.log("removing bookmark-span" + id);
    if (bookmarks[id]) {
      console.log("removing bookmark-span" + id);

      delete bookmarks[id];
      localStorage.bookmarks = JSON.stringify(bookmarks);
      $('#bookmark-span' + id).remove();
    }
  }

  LoadRecs();


  // template for displaying the movie information.
  var infoTemplate = Handlebars.compile([
    '<center class="ac-name" style="color: #fff; padding-top: 20px;"> {{title}} </center>',
    '<div class="row" style="margin: auto;padding-top: 30px;padding-bottom: 40px;"><div class="col-xs-1"></div><div>',
    '{{#if poster_path}}<img class="poster" src=http://image.tmdb.org/t/p/w185/{{poster_path}}>{{/if}}',
    '<p class="description">{{overview}}</p></div>',
    '<div class="col-xs-1"></div></div>',
    '{{#if isRec}}<center style="padding-bottom: 20px;"><button onClick="addBookmark({{id}})" style="background-color: #fff; color: #508CA4; border: none; border-radius: 8px; height: 32px;">add</button></center>{{/if}}'

  ].join(''));


  // when both graph export json and style loaded, init cy


  var allNodes = null;
  var allEles = null;
  var lastHighlighted = null;
  var lastUnhighlighted = null;

  //didn't write this.
  //It fades the other elems out when selecting.
  function getFadePromise(ele, opacity) {
    return ele.animation({
      style: {
        'opacity': opacity
      },
      duration: aniDur
    }).play().promise();
  };

  //didn't write this.
  //puts things back to where they were.
  var restoreElesPositions = function(nhood) {
    return Promise.all(nhood.map(function(ele) {
      var p = ele.data('orgPos');

      return ele.animation({
        position: {
          x: p.x,
          y: p.y
        },
        duration: aniDur,
        easing: easing
      }).play().promise();
    }));
  };
  // selects the item with the given id
  function highlightByID(id) {
    if (recNodes[id]) {
      cy.$('#' + id).select();
    } else {
      console.log('couldn\' highlight id: ' + id);
    }
  }
  //selects a node, making it fron and center and
  //turning the bookmarks bar into the inspect window.
  function highlight(node) {
    var oldNhood = lastHighlighted;

    var nhood = lastHighlighted = node.closedNeighborhood();
    var others = lastUnhighlighted = cy.elements().not(nhood);

    var reset = function() {
      cy.batch(function() {
        others.addClass('hidden');
        nhood.removeClass('hidden');

        allEles.removeClass('faded highlighted');

        nhood.addClass('highlighted');

        others.nodes().forEach(function(n) {
          var p = n.data('orgPos');

          n.position({
            x: p.x,
            y: p.y
          });
        });
      });

      return Promise.resolve().then(function() {
        if (isDirty()) {
          return fit();
        } else {
          return Promise.resolve();
        };
      }).then(function() {
        return Promise.delay(aniDur);
      });
    };

    var runLayout = function() {
      var p = node.data('orgPos');

      var l = nhood.filter(':visible').makeLayout({
        name: 'concentric',
        fit: false,
        animate: true,
        animationDuration: aniDur,
        animationEasing: easing,
        boundingBox: {
          x1: p.x - 1,
          x2: p.x + 1,
          y1: p.y - 1,
          y2: p.y + 1
        },
        avoidOverlap: true,
        concentric: function(ele) {
          if (ele.same(node)) {
            return 2;
          } else {
            return 1;
          }
        },
        levelWidth: function() {
          return 1;
        },
        padding: layoutPadding
      });

      var promise = cy.promiseOn('layoutstop');

      l.run();

      return promise;
    };

    var fit = function() {
      return cy.animation({
        fit: {
          eles: nhood.filter(':visible'),
          padding: layoutPadding
        },
        easing: easing,
        duration: aniDur
      }).play().promise();
    };

    var showOthersFaded = function() {
      return Promise.delay(250).then(function() {
        cy.batch(function() {
          others.removeClass('hidden').addClass('faded');
        });
      });
    };

    return Promise.resolve()
      .then(reset)
      .then(runLayout)
      .then(fit)
      .then(showOthersFaded);

  }

  function isDirty() {
    return lastHighlighted != null;
  }

  function clear(opts) {
    if (!isDirty()) {
      return Promise.resolve();
    }

    opts = $.extend({

    }, opts);

    cy.stop();
    allNodes.stop();

    var nhood = lastHighlighted;
    var others = lastUnhighlighted;

    lastHighlighted = lastUnhighlighted = null;

    var hideOthers = function() {
      return Promise.delay(125).then(function() {
        others.addClass('hidden');

        return Promise.delay(125);
      });
    };

    var showOthers = function() {
      cy.batch(function() {
        allEles.removeClass('hidden').removeClass('faded');
      });

      return Promise.delay(aniDur);
    };

    var restorePositions = function() {
      cy.batch(function() {
        others.nodes().forEach(function(n) {
          var p = n.data('orgPos');

          n.position({
            x: p.x,
            y: p.y
          });
        });
      });

      return restoreElesPositions(nhood.nodes());
    };

    var resetHighlight = function() {
      nhood.removeClass('highlighted');
    };

    return Promise.resolve()
      .then(resetHighlight)
      .then(hideOthers)
      .then(restorePositions)
      .then(showOthers);
  }

  //displays node info on the inspect window.
  //Poster description etc.
  function showNodeInfo(node) {
    const id = node.data().id;
    if (node.data().NodeType == 'basis') {
      const data = favorites[id];
      $('#info').html(infoTemplate(data)).show();
    } else {
      const data = recommendations[id];
      data.isRec = true;
      $('#info').html(infoTemplate(data)).show();
    }
  }

  function hideNodeInfo() {
    $('#info').hide();
  }


  //initializes the cytoscape graph.
  function initCy(then) {
    var loading = document.getElementById('loading');
    var expJson = then[0];
    var styleJson = then[1];
    var elements = expJson.elements;

    elements.nodes.forEach(function(n) {
      var data = n.data;

      data.NodeTypeFormatted = data.NodeType;

      n.data.orgPos = {
        x: n.position.x,
        y: n.position.y
      };
    });

    loading.classList.add('loaded');

    cy = window.cy = cytoscape({
      container: document.getElementById('cy'),
      layout: {
        name: 'preset',
        padding: layoutPadding
      },
      style: styleJson,
      elements: elements,
      motionBlur: true,
      selectionType: 'single',
      boxSelectionEnabled: false,
      autoungrabify: true,
      avoidOverlap: true,
    });

    allNodes = cy.nodes();
    allEles = cy.elements();

    cy.on('free', 'node', function(e) {
      var n = e.cyTarget;
      var p = n.position();

      n.data('orgPos', {
        x: p.x,
        y: p.y
      });
    });

    cy.on('tap', function() {
      $('#search').blur();
    });

    cy.on('select unselect', 'node', _.debounce(function(e) {
      var node = cy.$('node:selected');

      if (node.nonempty()) {
        $('#bookmarks').hide();
        showNodeInfo(node);
        Promise.resolve().then(function() {
          return highlight(node);
        });
      } else {
        hideNodeInfo();
        $('#bookmarks').show();
        clear();
      }

    }, 100));

  }

  //loads in a list of recommendations
  //and displays them in the graph.
  function LoadRecs() {
    var promises = keywordSearch();
    Object.keys(keywordList).forEach((key) => {
      combined.push(keywordList[key])
    });
    Object.keys(genreList).forEach((key) => {
      combined.push(genreList[key])
    });

    const moviePromises = [styleP];

    // after all the server calls for recs are done we
    // iterate through the results and calculate scores
    // and put together data needed for the nodes.
    Promise.all(promises).then((results) => {
      for (i = 0; i < results.length; i++) {
        const result = results[i];
        result.forEach((d) => {
          const getMovieURL = 'getMovie/' + d
          const k = i;
          // need to make another server querie
          // in order to get the movie details.
          // We store the promises so that we know when
          // we have the data needed to create the graph.
          moviePromises.push($.get(getMovieURL, (title) => {
            // we make some additions to the recommendations
            // that we will need for calculating score and sorting recs.
            if (!recommendations[title.id]) {
              recommendations[title.id] = title;
              recommendations[title.id].keyword_ids = {};
              recommendations[title.id].genre_ids = {};
              recommendations[title.id].basis = {};
              recommendations[title.id].keywordBasis = [];
              recommendations[title.id].score = 0;
            }

            if (keywordList[combined[k].id]) {
              recommendations[title.id].keyword_ids[combined[k].id] = combined[k];
              recommendations[title.id].score += keywordList[combined[k].id].score;

            } else if (genreList[combined[k].id]) {
              recommendations[title.id].genre_ids[combined[k].id] = combined[k];
              //recommendations[title.id].score += genreList[combined[k].id].score;
            }
            combined[k].basis.forEach((basis) => {
              if (keywordList[combined[k].id]) {
                recommendations[title.id].basis[basis] = basis;
                recommendations[title.id].keywordBasis.push(basis);
              }
            });
          }));
        });
      }
      // we wait until all the queries are complete so we know
      //we have the node data we need to procede.
      Promise.all(moviePromises).then(changeData);

      function changeData(then) {
        //this represents the future graph.
        var graphPRes = {
          elements: {
            nodes: [],
            edges: []
          }
        };
        // we are sorting the recs by score and taking the top 10.
        let recList = Object.keys(recommendations).map((k) => {
          return recommendations[k]
        });
        recList.forEach((rec) => {
          console.log(rec.score);
        });
        recList.sort((a, b) => {
          return b.score - a.score;
        });
        const goodRecs = [];
        for (index = 0; index < 10; index++) {
          if (recList[index]) {
            goodRecs.push(recList[index]);
          } else break;
        }

        goodRecs.forEach((movieRec) => {
          // We create a new node for each rec and
          // give it the name and id. id is same as
          // rec so we can always access the data.
          const recNode = {
            data: {
              id: movieRec.id,
              name: movieRec.title,
              NodeType: 'movie',
            },
            position: {
              x: 1000,
              y: 1000,
            }
          }
          graphPRes.elements.nodes.push(recNode);
          recNodes[movieRec.id] = recNode;
          // we also create the "basis" nodes.
          //Basis nodes are the favorite node that
          //justifies a given recommendation.
          Object.keys(movieRec.basis).forEach((key) => {
            const basis = movieRec.basis[key];
            if (!basisNodes[basis]) {
              const basisNode = {
                data: {
                  id: basis,
                  name: favorites[basis].title,
                  NodeType: 'basis',
                },
                position: {
                  x: 500,
                  y: 500,
                }
              }
              graphPRes.elements.nodes.push(basisNode);
              basisNodes[basis] = basisNode;
            }
            // connect the basis node and the rec node.
            graphPRes.elements.edges.push({
              data: {
                id: 's' + movieRec.id + 't' + basis,
                source: movieRec.id,
                target: basis,
              },
            });
          });

        });

        const numBasis = Object.keys(basisNodes).length;
        const centerX = 1000;
        const centerY = 1000;
        const diameter1 = 750;
        let bki = 0;
        let degreesPer = 360 / numBasis;
        //Arrange the basis nodes in a circle.
        Object.keys(basisNodes).forEach((bkey) => {
          const basisNode = basisNodes[bkey];
          const angle = degreesPer * bki;
          let temp = angle_to_pos(angle, diameter1);
          let posx = temp.mX + centerX;
          let posy = temp.mY + centerY;
          basisNode.position.x = posx;
          basisNode.position.y = posy;
          bki++;
        });
        const numNodes = goodRecs.length;
        const usedLocs = {};
        // arrange the recnodes to be inside the circle
        // of basis nodes. position is the average of the
        // related nodes and the center positions.
        graphPRes.elements.nodes.forEach((node) => {
          if (node.data.NodeType != "basis") {
            let xpos = centerX;
            let ypos = centerY;
            const basisKeys = Object.keys(recommendations[node.data.id].basis);
            basisKeys.forEach((basisKey) => {
              xpos = xpos + basisNodes[basisKey].position.x;
              ypos = ypos + basisNodes[basisKey].position.y;
            });
            xpos = xpos / (basisKeys.length + 1);
            ypos = ypos / (basisKeys.length + 1);
            //collision management.
            while (usedLocs[xpos + ' ' + ypos]) {
              ypos = ypos + 50
            }
            usedLocs[xpos + ' ' + ypos] = 1;
            node.position.x = xpos;
            node.position.y = ypos;
          }
        });

        var stylePRes = then[0];
        // initialize the graph with the new graph
        // data we just created and the style
        // we read in a long time ago.
        initCy([graphPRes, stylePRes]);
        //load any bookmarks from a previous session.
        //Requires Cy to be generated already.
        load_bookmarks();
      }
    });
  }

  function load_bookmarks() {
    if (localStorage.bookmarks) {
      Object.keys(JSON.parse(localStorage.bookmarks)).forEach((bookKey) => {
        console.log(bookKey);
        if (recommendations[bookKey]) {
          addBookmark(bookKey);
        }
      });
    }
  }
  // helper function for putting things in a circle.
  function angle_to_pos(deg, diameter) {
    const rad = Math.PI * deg / 180;
    const r = diameter / 2
    const x = r * Math.cos(rad);
    const y = r * Math.sin(rad);
    const temp = {
      mX: x,
      mY: y
    }
    return temp;
  }

  // didn't write
  // resets the position of nodes.
  $('#reset').on('click', function() {
    if (isDirty()) {
      clear();
    } else {
      allNodes.unselect();

      hideNodeInfo();

      cy.stop();

      cy.animation({
        fit: {
          eles: cy.elements(),
          padding: layoutPadding
        },
        duration: aniDur,
        easing: easing
      }).play();
    }
  });

  var lastSearch = '';
});
