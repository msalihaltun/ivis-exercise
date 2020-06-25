# ivis-exercise
My implementation repository for i-Vis Engineer Exercise.

## Functionality Added
* Any node can be removed via the context menu. If, after this removal operation, a node is left with no
connections to the rest of the graph, it is also removed. After the removal operation, the graph will
auto-adjust the layout.
* Graph can be centered by using the context menu option "Center Graph" which is accessible on right click
on the canvas.

## Installation
1. Clone this repository.
2. Run `npm install`.
2. Install [Neo4j Desktop](https://neo4j.com/download/).
3. Use `:play movies` on Neo4j browser (running on localhost port 7474 by default) to create the Movies database.
4. Start the movies database.
5. `npm start` in the cloned repository folder.
    1. When I ran the Neo4j browser driver, I couldn't use the default password, which is `neo4j`. Therefore in my PC I 
    changed this password to `password`. This might need change if the cloner's user info is different. The driver
    instantiation is on top of [index.jsx file](/public/javascripts/index.jsx). The username is `neo4j` as default.
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
