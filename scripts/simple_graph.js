/**
	@author David Piegza
	@modified by Dylan McCurry
 */
 
var Drawing = Drawing || {};

Drawing.SimpleGraph = function(options) {
	var options = options || {};
	
	this.layout = options.layout || "3d";
	this.layout_options = options.graphLayout || {};
	this.show_stats = options.showStats || false;
	this.show_info = options.showInfo || false;
	this.show_labels = options.showLabels || false;
	this.selection = options.selection || false;
	this.limit = options.limit || 10;
	this.nodes_count = options.numNodes || 20;
	this.edges_count = options.numEdges || 10;

	var camera, scene, renderer, interaction, geometry, object_selection;
	var stats;
	var info_text = {};
	var graph = new Graph({limit: options.limit});
	var nodeIds = [];
	var geometries = [];
	
	var that=this;

	init();
	that.layout_options.width = that.layout_options.width || 2000;
	that.layout_options.height = that.layout_options.height || 2000;
	that.layout_options.iterations = that.iterations || 20000;
	that.layout_options.layout = that.layout_options.layout || that.layout;
	that.layout_options.nodes_length = 0;
	graph.layout = new Layout.ForceDirected(graph, that.layout_options);
	info_text.nodes = "Nodes " + graph.nodes.length;
	info_text.edges = "Edges " + graph.edges.length;
	animate();
	

	
	function init() {
		// Three.js initialization
		renderer = new THREE.WebGLRenderer({antialias: true});
		renderer.setSize( window.innerWidth, window.innerHeight );
		
		camera = new THREE.TrackballCamera({
			fov: 40, 
			aspect: window.innerWidth / window.innerHeight,
			near: 100,
			far: 100000,

			rotateSpeed: 0.5,
			zoomSpeed: 2.2,
			panSpeed: .5,

			noZoom: false,
			noPan: false,

			staticMoving: false,
			dynamicDampingFactor: .03,
			
			domElement: renderer.domElement,

			keys: [ 65, 83, 68 ]
		});
		camera.position.z = 5000;

		scene = new THREE.Scene();

		// Node geometry
		if(that.layout === "3d") {
			geometry = new THREE.SphereGeometry( 100, 100, 100 );
		} else {
			geometry = new THREE.SphereGeometry( 50, 50, 0 );
		}
		
		// Create node selection, if set
		if(that.selection) {
			object_selection = new THREE.ObjectSelection({
				domElement: renderer.domElement,
				selected: function(obj) {
					// all nodes have strings for id's, labels do not.
					if (obj != null) {
						if (typeof obj.id == 'string') {
							// display info
							if(obj != null) {	// TODO:  only do this for nodes, not their labels
								info_text.select = obj.id;
							} else {
								delete info_text.select;
							}
						}
					}
				},
				clicked: function(obj) {
					console.log(obj);
					// all nodes have strings for id's, labels do not.
					if (typeof obj.id == 'string') {
						if (!obj.clicked) {
							obj.clicked = true;
							obj.materials[0].color.b = .2;
							obj.materials[0].color.g = 1;
							obj.materials[0].color.r = .2;
							WIKI_parse(obj.id);
						}
					}
				}
			});
		}

		document.body.appendChild( renderer.domElement );
	
		// Stats.js
		if(that.show_stats) {
			stats = new Stats();
			stats.domElement.style.position = 'absolute';
			stats.domElement.style.top = '0px';
			document.body.appendChild( stats.domElement );
		}	
	}
	

	/**
	 *	Create a node object and add it to the scene.
	 */
	this.drawNode = function(node, hexColor, positionNode) {
		var draw_object = new THREE.Mesh( geometry, [ new THREE.MeshBasicMaterial( { color: hexColor, opacity: 0.75 } ) ] );
		
		if(that.show_labels) {
			if(node.data.title != undefined) {
				var label_object = new THREE.Label(node.data.title);
			} else {
				var label_object = new THREE.Label(node.id);
			}
			node.data.label_object = label_object;
			scene.addObject( node.data.label_object );
		}
		
		// calculate a position
		var area = 300;
		var x = Math.floor(Math.random() * area) * (Math.round(Math.random() * 1)?-1:1);
		var y = Math.floor(Math.random() * area) * (Math.round(Math.random() * 1)?-1:1);
		var z = Math.floor(Math.random() * area) * (Math.round(Math.random() * 1)?-1:1);
		if (positionNode) {
			x += positionNode.data.draw_object.position.x;
			y += positionNode.data.draw_object.position.y;
			z += positionNode.data.draw_object.position.z;
		}
		
		// draw object
		draw_object.position.x = x;
		draw_object.position.y = y;
		draw_object.position.z = z;
		
		draw_object.id = node.id;
		node.data.draw_object = draw_object;
		node.position = draw_object.position;
		scene.addObject( node.data.draw_object );
		
		graph.addNode(node);
		
		nodeIds.push(node.id);
		
		info_text.nodes = "Nodes " + graph.nodes.length;
		info_text.edges = "Edges " + graph.edges.length;
		
		graph.layout.init();
	}
	
	this.highlightNode = function(node) {
		node.data.draw_object.materials[0].color.b = 0.2;
		node.data.draw_object.materials[0].color.g = 1;
		node.data.draw_object.materials[0].color.r = 0.2;
	}
	 
	this.drawEdge = function(source, target) {
		if(graph.addEdge(source, target)) {
			material = new THREE.LineBasicMaterial( { color: 0x666666, opacity: .75, linewidth: 0.25 } );
			var tmp_geo = new THREE.Geometry();

			tmp_geo.vertices.push(new THREE.Vertex(source.data.draw_object.position));
			tmp_geo.vertices.push(new THREE.Vertex(target.data.draw_object.position));

			line = new THREE.Line( tmp_geo, material, THREE.LinePieces );
			line.scale.x = line.scale.y = line.scale.z = 1;
			line.originalScale = 1;

			geometries.push(tmp_geo);

			scene.addObject( line );
			
			info_text.nodes = "Nodes " + graph.nodes.length;
			info_text.edges = "Edges " + graph.edges.length;
			
			graph.layout.init();
		}
	}
	
	this.hasNode = function(id) {
		if (nodeIds.indexOf(id) === -1) {
			return false;
		}
		else {
			return true;
		}
	}
	

	function animate() {
		requestAnimationFrame( animate );
		render();
		if(that.show_info) {
			printInfo();
		}
	}

	function render() {
		
		// Generate layout if not finished
		if(!graph.layout.finished) {
			info_text.calc = "<span style='color: red'>Calculating layout...</span>";
			graph.layout.generate();
		} else {
			info_text.calc = "";
		}

		// Update position of lines (edges)
		for(var i=0; i<geometries.length; i++) {
			geometries[i].__dirtyVertices = true;
		}

		// Show labels if set
		// It creates the labels when this options is set during visualization
		if(that.show_labels) {
			var length = graph.nodes.length;
			for(var i=0; i<length; i++) {
				var node = graph.nodes[i];
				if(node.data.label_object != undefined) {
					node.data.label_object.position.x = node.data.draw_object.position.x;
					node.data.label_object.position.y = node.data.draw_object.position.y + 150;
					node.data.label_object.position.z = node.data.draw_object.position.z;
			
					node.data.label_object.lookAt(camera.position);
				} else {
					if(node.data.title != undefined) {
						var label_object = new THREE.Label(node.data.title, node.data.draw_object);
					} else {
						var label_object = new THREE.Label(node.id, node.data.draw_object);
					}
					node.data.label_object = label_object;
					scene.addObject( node.data.label_object );
				}
			}
		} else {
			var length = graph.nodes.length;
			for(var i=0; i<length; i++) {
				var node = graph.nodes[i];
				if(node.data.label_object != undefined) {
					scene.removeObject( node.data.label_object );
					node.data.label_object = undefined;
				}
			}
		}

		// render selection
		if(that.selection) {
			object_selection.render(scene, camera);
		}

		// update stats
		if(that.show_stats) {
			stats.update();
		}
		
		// render scene
		renderer.render( scene, camera );
	}

	/**
	 *	Prints info from the attribute info_text.
	 */
	function printInfo(text) {
		var str = "";
		for(var index in info_text) {
			if(str != '' && info_text[index] != '') {
				str += "<br />";
			}
			str += info_text[index];
		}
		document.getElementById("graph-info").innerHTML = str;
	}

	// Generate random number
	function randomFromTo(from, to) {
		return Math.floor(Math.random() * (to - from + 1) + from);
	}
	
	// Stop layout calculation
	this.stop_calculating = function() {
		graph.layout.stop_calc();
	}
	this.start_calculating = function() {
		graph.layout.start_calc();
	}
	this.reset_calculation = function() {
		graph.layout.reset_calc();
		animate();
	}
}