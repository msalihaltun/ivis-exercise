# ivis-exercise
My implementation repository for i-Vis Engineer Exercise.

## Installation
1. Clone this repository.
2. Run `npm install`.
2. Install [Neo4j Desktop](https://neo4j.com/download/).
3. Use `:play movies` on Neo4j browser (running on localhost port 7474 by default) to create the Movies database.
4. Run the movies database.
5. `npm start` in the cloned repository folder.
6. Write the actor name and number and press the search button.
7. Right click on movie nodes and select "Show Actors" to add the actors that acted in the movie to the graph.
8. Right click on actor nodes and select "Show Movies" to add the movies that they acted in to the graph.

## Dependencies
* express.js
* react.js
* Neo4j
* Cytoscape.js
* cytoscape-cose-bilkent
* cytoscape-content-menus