var driver = neo4j.driver('neo4j://localhost', neo4j.auth.basic('neo4j', 'password'));

class App extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            data: {
                nodes: [],
                edges: []
            }
        };
        this.onGraphQueryChange = this.onGraphQueryChange.bind(this);
        this.showMovies = this.showMovies.bind(this);
        this.showActors = this.showActors.bind(this);
    }

    showMovies(nodeData) {
        var actorName = nodeData.id;
    }

    showActors(nodeData) {

    }

    onGraphQueryChange(actorName, actorNumber) {
        
        if(parseInt(actorNumber) < 0) {
            return;
        }

        var session = driver.session();
        session.run(
            'MATCH neighborhood = (actor:Person {name: $name}) \
            -[*1..' + actorNumber +']-(neighbor) \
            RETURN DISTINCT neighborhood',
            {name: actorName}
        ).then(result => {
            session.close();
            var records = result.records;

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
                    nodes: nodes,
                    edges: edges
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
                    showMovies={this.showMovies}
                    showActors={this.showActors}
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
        this.renderCy = this.renderCy.bind(this);
        this.state = {
            cy: {}
        }
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
                    'font-size': '10px',
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
                    'font-size': '10px'
                }
            },
            {
                selector:'edge',
                style: {
                    'label': 'data(label)',
                    'text-halign': 'center',
                    'text-valign': 'center',
                    'font-size': '10px'
                }
            }
        ];

        const layoutConfig = {
            name: 'cose-bilkent'
        };

        var data = this.props.data;
        var nodes = data.nodes;
        var edges = data.edges;

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

        var cy = cytoscape({
            container: document.getElementById("cy"),
            elements:  {
                nodes: cyNodes,
                edges: cyEdges
            },
            layout: layoutConfig,
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
                records.forEach(record => {
                    var title = record.get("movie").properties.title;
                    cy.add({
                        data: {
                            id: title,
                            label: title,
                            class: 'Movie'
                        }
                    });
                    cy.add({
                        data: {
                            id: actorName + "_" + title + "_" + "ACTED_IN",
                            source: actorName,
                            target: title,
                            label: "ACTED_IN"
                        }
                    });
                });

            }).catch(error => {
                session.close();
                console.log(error);
            });

            const layout = cy.makeLayout(layoutConfig);
            layout.run();
            layout.on("layoutstop", () => {
                cy.nodes().forEach(node => {
                    node.unlock();
                })
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
                records.forEach(record => {
                    var name = record.get("actor").properties.name;

                    cy.add({
                        data: {
                            id: name,
                            label: name,
                            class: 'Person'
                        }
                    });
                    cy.add({
                        data: {
                            id: name + "_" + movieName + "_" + "ACTED_IN",
                            source: name,
                            target: movieName,
                            label: "ACTED_IN"
                        }
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