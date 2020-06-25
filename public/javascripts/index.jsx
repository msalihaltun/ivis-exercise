var driver = neo4j.driver('neo4j://localhost', neo4j.auth.basic('neo4j', 'password'));
var cy = {};

class App extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            data: {
                initialNodes: [],
                initialEdges: []
            }
        };
        this.onGraphQueryChange = this.onGraphQueryChange.bind(this);
    }

    onGraphQueryChange(actorName, actorNumber) {
        
        if(parseInt(actorNumber) < 0) {
            return;
        }

        var maxPathLength = (parseInt(actorNumber) * 2).toString();

        var session = driver.session();
        session.run(
            'MATCH neighborhood = (actor:Person {name: $name}) \
            -[*1..' + maxPathLength +']-(neighbor) \
            RETURN DISTINCT neighborhood',
            {name: actorName}
        ).then(result => {
            session.close();
            var records = result.records;

            /*
            trying to make sure the added nodes are unique,
            the query returns paths of length up to the max
            length allowed which means in results there are
            repeated nodes and edges. There should be a 
            better query that I'm not quite getting at.
            */

            var nodes = {};
            var edges = {};
            records.forEach(record => {
                record.get('neighborhood').segments.forEach(segment => {
                    var startLabel = segment.start.labels[0];
                    var endLabel = segment.end.labels[0];

                    var startName = startLabel == "Person" ? 
                                segment.start.properties.name : 
                                segment.start.properties.title;

                    var endName = endLabel == "Person" ? 
                                segment.end.properties.name : 
                                segment.end.properties.title;

                    if (nodes[startName] === undefined) {
                        nodes[startName] = {
                            label: startLabel,
                            name: startName
                        };
                    }

                    if (nodes[endName] === undefined) {
                        nodes[endName] = {
                            label: endLabel,
                            name: endName
                        };
                    }
                    var type = segment.relationship.type;
                    if (edges[startName + "_" + endName + "_" + type] === undefined) {
                        edges[startName + "_" + endName + "_" + type] = {
                            source: startName,
                            target: endName,
                            type: type
                        }
                    }
                });
            });

            this.setState({
                data: {
                    initialNodes: nodes,
                    initialEdges: edges
                }
            });

        }).catch(error => {
            session.close();
            console.log(error);
        });
    }

    render() {
        return (
            <div className="container">
                <TopMenu
                    handleButtonPress={this.onGraphQueryChange}
                />
                <CytoscapeContainer
                    data={this.state.data}
                />
            </div>
        );
    }
}

class TopMenu extends React.Component {

    constructor(props) {
        super(props);

        this.handleButtonPress = this.handleButtonPress.bind(this);
    }

    handleButtonPress() {
        let actorName = document.getElementById("actorNameField").value;
        let actorNumber = document.getElementById("actorNumberField").value;
        this.props.handleButtonPress(actorName, actorNumber);
    }

    render() {
        return (
            <React.Fragment>
                <div className="input-group">
                    <input
                        id="actorNameField"
                        className="form-inline"
                        type="text"
                        placeholder="Actor Name"
                        aria-label="Actor Name">
                    </input>
                    <input
                        id="actorNumberField"
                        className="form-inline"
                        type="number"
                        placeholder="Actor Number"
                        aria-label="Actor Number">
                    </input>
                    <button
                        id="confirmQuery"
                        className="btn btn-primary"
                        onClick={this.handleButtonPress}>
                        Search
                    </button>
                </div>
            </React.Fragment>
        );
    }

}

class CytoscapeContainer extends React.Component {
    
    constructor(props) {
        super(props);
    }

    renderCy() {
        const cyStyle = [
            {
                selector: "node[class='Person']",
                style: {
                    'label': 'data(label)',
                    'text-halign': 'center',
                    'text-valign': 'center',
                    'text-wrap': 'wrap',
                    'background-color': 'cyan',
                    'font-size': '8px',
                }
            },
            {
                selector: "node[class='Movie']",
                style: {
                    'label': 'data(label)',
                    'text-halign': 'center',
                    'text-valign': 'center',
                    'text-wrap': 'wrap',
                    'background-color': 'orange',
                    'font-size': '8px'
                }
            },
            {
                selector:'edge',
                style: {
                    'label': 'data(label)',
                    'width': 3,
                    'font-size': '5px'
                }
            }
        ];

        const randomizedLayout = {
            name: 'cose-bilkent',
            randomize: true
        };

        const incrementalLayout = {
            name: 'cose-bilkent',
            randomize: false
        };

        var data = this.props.data;
        var nodes = data.initialNodes;
        var edges = data.initialEdges;

        var cyNodes = [];
        Object.entries(nodes).forEach((entry) => {
            var key = entry[0];
            var value = entry[1];
            cyNodes.push({
                data: {
                    id: key,
                    label: value.name,
                    class: value.label,
                }
            });
        });

        var cyEdges = [];
        Object.entries(edges).forEach(entry => {
            var key = entry[0];
            var value = entry[1];
            cyEdges.push({
                data: {
                    id: key,
                    source: value.source,
                    target: value.target,
                    label: value.type,
                }
            });
        });

        cy = cytoscape({
            container: document.getElementById("cy"),
            elements:  {
                nodes: cyNodes,
                edges: cyEdges
            },
            layout: randomizedLayout,
            style: cyStyle
        });

        function addMovies(actorName) {
            var session = driver.session();
            session.run(
                'MATCH (actor:Person {name: $name}) \
                -[:ACTED_IN]->(movie) \
                RETURN DISTINCT movie',
                {name: actorName}
            ).then(result => {
                session.close();
                var records = result.records;
                var cyElements = [];
                records.forEach(record => {
                    var title = record.get("movie").properties.title;
                    cyElements.push({
                        data: {
                            id: title,
                            label: title,
                            class: 'Movie'
                        }
                    });
                    cyElements.push({
                        data: {
                            id: actorName + "_" + title + "_" + "ACTED_IN",
                            source: actorName,
                            target: title,
                            label: "ACTED_IN"
                        }
                    });
                });
    
                cy.add(cyElements);
    
                cy.ready(function() {
                    const layout = cy.makeLayout(incrementalLayout);
                    layout.run();
                    layout.on("layoutstop", () => {
                        cy.nodes().forEach(node => {
                            node.unlock();
                        })
                    });
                });
    
            }).catch(error => {
                session.close();
                console.log(error);
            });
        }

        function addActors(movieName) {
            var session = driver.session();
            session.run(
                'MATCH (movie: Movie {title: $title}) \
                <-[:ACTED_IN]-(actor) \
                RETURN DISTINCT actor',
                {title: movieName}
            ).then(result => {
                session.close();
                var records = result.records;
                var cyElements = [];
                records.forEach(record => {
                    var name = record.get("actor").properties.name;
                    cyElements.push({
                        data: {
                            id: name,
                            label: name,
                            class: 'Person'
                        }
                    });

                    cyElements.push({
                        data: {
                            id: name + "_" + movieName + "_" + "ACTED_IN",
                            source: name,
                            target: movieName,
                            label: "ACTED_IN"
                        }
                    });
                });

                cy.add(cyElements);

                cy.ready(function() {
                    const layout = cy.makeLayout(incrementalLayout);
                    layout.run();
                    layout.on("layoutstop", () => {
                        cy.nodes().forEach(node => {
                            node.unlock();
                        })
                    });
                });
                
            }).catch(error => {
                session.close();
                console.log(error);
            });
        }

        cy.contextMenus({
            menuItems: [
                {
                    id: 'showMovies',
                    content: 'Show Movies',
                    selector: "node[class='Person']",
                    onClickFunction: function(event) {
                        addMovies(event.target.data().id);
                    }
                },
                {
                    id: 'showActors',
                    content: 'Show Actors',
                    selector: "node[class='Movie']",
                    onClickFunction: function(event) {
                        addActors(event.target.data().id);
                    }
                },
                {
                    id: 'removeNode',
                    content: 'Remove',
                    selector: 'node',
                    onClickFunction: function(event) {
                        cy.remove(event.target);
                        cy.nodes(element => {
                            if (element.degree() < 1) {
                                cy.remove(element);
                            }
                        });
                        cy.ready(function() {
                            const layout = cy.makeLayout(incrementalLayout);
                            layout.run();
                            layout.on("layoutstop", () => {
                                cy.nodes().forEach(node => {
                                    node.unlock();
                                })
                            });
                        });
                    }
                },
                {
                    id: 'centerGraph',
                    content: 'Center Graph',
                    coreAsWell: true,
                    onClickFunction: function() {
                        cy.center();
                    }
                }
            ]
        });

    }

    componentDidUpdate(){
        this.renderCy();
    }

    render() {
        return (
            <div id="cy">
            </div>
        );    
    }

}

$(function() {
    ReactDOM.render(
        <App/>,
        document.getElementById('react-root')
    );
})