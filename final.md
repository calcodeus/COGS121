Ethan Vander Horn - Wrote backend, database, and api code in pair programming with Jacqueline. Created recommendation algorithm.
Jacqueline Bontigao - Wrote backend, database, and api code in pair programming with Ethan. Wrote all the weekly writeups.
Tony Chan - Wrote and designed front end code and styling in pair programming with Jomar. Integrated visualization library.
Jomar Batac - Wrote and designed front end code and styling in pair programming with Tony.


server.js -- Makes all API calls, manages mongolab database that serves as a cache for API results.
homepage.html -- Displays a simple description of the appflow.
favorites.html -- Allows the user to manage a list of favorite movies and shows from the TMDB api. Makes calls to server to get the media info. File contains all html css and js code needed for this purpose. 
results.html -- Displays the recommendations based on the previously provided favorites. Contains all of the html, some of the css, and some of the javascript for this functionality. Data is displayed in a graph using the cytoscape API.
demo.js -- contains the rest of the javascript for the results page. Manages the graph display and the generation of recommendations. Makes queries to the server for recommendation data and movie details.
style.css -- contains most of the styling for results.html
style.cycss -- contains the styling for the graph display.
