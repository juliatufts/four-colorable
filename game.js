;(function(){
	// ---------------------------- GLOBAL VARIABLES AND FUNCTIONS ------------------------------------ //
	var mouse = {x : 0, y : 0, isDown: false};
	var activeVertex;		// to hold the vertex that the user is currently moving
	var gameWinner = false;

	// Returns the function it is passed with the argument already applied
	var partial = function(arg, fn) {
		return function() {
			var args = Array.prototype.slice.call(arguments)
			fn.apply(null, [arg].concat(args))
		};
	};

	// Returns the distance between two points
	var distance = function(p1, p2) {
		var xs = p1.x - p2.x;
		var ys = p1.y - p2.y;

		xs = xs * xs;
		ys = ys * ys;

		return Math.sqrt(xs + ys);
	}

	// ----------------------------------------- INPUT ---------------------------------------- //
	var mouseDownID = -1;	// Global ID of mouse down interval
	var onMouseDown = function(canvas, event)  {
		var rect = canvas.getBoundingClientRect();
		mouse.x = event.offsetX || event.pageX - rect.left - window.scrollX;
    	mouse.y = event.offsetY || event.pageY - rect.top - window.scrollY;

		// change mouse isDown to true
		if (!mouse.isDown) {
			mouse.isDown = true;
			mouseDownID = 0;
		}
	};

	// for now have an optional param to account for when the mouse is dragged off canvas
	// NOTE: still need to fix the issue of dragging an element off then BACK onto the canvas
	var onMouseUp = function(canvas, isMouseout, event) {
		if (mouse.isDown || isMouseout) {
			mouse.isDown = false;
		    mouseDownID = -1;
	    }
	};

	var whileMouseMove = function(canvas, event) {
		// update the mouse position if the mouse is down
		if (mouse.isDown) {
			var rect = canvas.getBoundingClientRect();
			mouse.x = event.offsetX || event.pageX - rect.left - window.scrollX;
	    	mouse.y = event.offsetY || event.pageY - rect.top - window.scrollY;

		   	// need to clip to make sure x,y are within the canvas dimensions
			mouse.x = Math.min(Math.max(mouse.x, 0), canvas.width);
			mouse.y = Math.min(Math.max(mouse.y, 0), canvas.height);
	    }
	};

	// -------------------------------------- COLLISION DETECTION ---------------------------------- //

	// takes a mouse object and an array of vertices
	// returns the first vertex that collides with the mouse, otherwise returns null
	var vertexClickedOn = function(mouse, vertices) {
		for (var i = 0; i < vertices.length; i++) {
			if (distance(mouse, vertices[i].center) < vertices[i].radius){
				return vertices[i];
			}
		}
	};

	// ------------------------------------------ COLORING --------------------------------------- //

	var determineColor = function(vertex, colorCorners) {
		var xMin;
		var xMax;
		var yMin;
		var yMax;
		var size;

		for (var i = 0; i < colorCorners.length; i++) {
			size = colorCorners[i].size;
			xMin = colorCorners[i].topLeft.x;
			xMax = colorCorners[i].topLeft.x + size;
			yMin = colorCorners[i].topLeft.y;
			yMax = colorCorners[i].topLeft.y + size;

			if (xMin <= vertex.center.x && vertex.center.x <= xMax 
			 && yMin <= vertex.center.y && vertex.center.y <= yMax ) {
				return colorCorners[i].color;
			}
		}
		return "none";	// if the vertex is not in any color corner, assign it color "none"
	};

	var checkColoring = function(vertices) {
		var curColor;	// the color of the vertex we are currently testing
		var neighbors;	// the neighbors of that vertex

		// loop through all the vertices
		// checking that their neighbors all have a valid color that is different from their own
		for (var i = 0; i < vertices.length; i++){
			curColor = vertices[i].color;
			neighbors = vertices[i].neighbors

			// if the current vertex has no color assigned, return false
			if (curColor === "none") return false;

			for (var j = 0; j < neighbors.length; j++){
				if (neighbors[j].color === "none") return false;
				if (neighbors[j].color === curColor) return false;
			}
		}
		return true;
	}

	// ----------------------------------------- GAME ---------------------------------------- //

	var Game = function(canvasId) {
		var canvas = document.getElementById(canvasId);
		var screen = canvas.getContext('2d');
		var gameSize = {x : canvas.width, y : canvas.height};
		var center = {x : canvas.width / 2, y : canvas.height / 2};

		// color corners
		this.colorCorners = createCorners(gameSize);

		// Graph nodes and edges
		var currentGraph = {V : [0, 1, 2, 3], 
							E : [[0,1], [0,2], [0,3], [1,2], [1,3], [2,3]], 
							Nbrs : [[1, 2, 3], [0, 2, 3], [0, 1, 3], [0, 1, 2]]};
		this.vertices = createVertices(center, currentGraph.V, currentGraph.Nbrs);
		this.edges = createEdges(this.vertices, currentGraph.E);

		// Event listeners for user input (mouse clicks)
		canvas.addEventListener("mousedown", partial(canvas, onMouseDown));
		canvas.addEventListener("mouseup", partial(canvas, onMouseUp));
		canvas.addEventListener("mousemove", partial(canvas, whileMouseMove));
		canvas.addEventListener("mouseout", function(event){
			onMouseUp(canvas, true, event);
		});

		// Loop
		var self = this;
		var tick = function() {
			self.update(mouse);
			self.draw(screen, gameSize);
			requestAnimationFrame(tick);
		};

		tick();
	};

	Game.prototype = {
		update: function(mouse){
			// while the mouse is down
			if (mouse.isDown) {
				// if the user has clicked on a vertex, and isn't already dragging one, pick it up
				if (activeVertex === undefined) {activeVertex = vertexClickedOn(mouse, this.vertices)};

				// move the active vertex if there is one
				if (activeVertex !== undefined) {
					activeVertex.center.x = mouse.x;
					activeVertex.center.y = mouse.y;
				}
			} else {
				// if the vertex was just placed assign it a color
				if (activeVertex !== undefined){
					activeVertex.color = determineColor(activeVertex, this.colorCorners);

					// also check if the coloring is correct
					gameWinner = checkColoring(this.vertices);
					console.log(gameWinner);
				}

				// mouse is released, reset activeVertex to undefined
				activeVertex = undefined;
			}
		},

		draw: function(screen, gameSize) {
			// clear the screen
			screen.clearRect(0, 0, gameSize.x, gameSize.y);

			// draw the color corners
			for (var i = 0; i < this.colorCorners.length; i++){
				screen.fillStyle = this.colorCorners[i].color;
				screen.fillRect(this.colorCorners[i].topLeft.x, 
								this.colorCorners[i].topLeft.y,
								this.colorCorners[i].size, this.colorCorners[i].size);
			}

			// draw the graph edges
			for (var i = 0; i < this.edges.length; i++){
				screen.lineWidth = 2;
				screen.moveTo(this.edges[i].v1.center.x, this.edges[i].v1.center.y);
				screen.lineTo(this.edges[i].v2.center.x, this.edges[i].v2.center.y);
				screen.stroke();
			}

			// draw the graph vertices
			for (var i = 0; i < this.vertices.length; i++){
				this.vertices[i].draw(screen);
			}
		}
	};

	// -------------------------------------- VERTICES --------------------------------------- //
	var Vertex = function(center, neighbors) {
		this.radius = 20;
		this.center = center;
		this.color = "none";
		this.neighbors = neighbors;
	};

	Vertex.prototype = {
		draw : function(screen) {
			screen.beginPath();
			screen.arc(this.center.x, this.center.y, 
					   this.radius, 0, 2 * Math.PI);
			screen.lineWidth = 4;
			screen.stroke();
			screen.fillStyle = "rgb(240, 240, 240)";	// fill offwhite
			screen.fill();
		}
	};

	var createVertices = function(center, vertexset, neighborList) {
		// create vertices in a circle (with radius rad) around the center
		vertices = [];
		var xPos;
		var yPos;
		var rad = 80;
		var n = vertexset.length;

		for(var i = 0; i < n; i++){
			xPos = Math.cos(((2 * Math.PI * i) / n)) * rad + center.x;
			yPos = Math.sin(((2 * Math.PI * i) / n)) * rad + center.y;
			vertices.push(new Vertex({x : xPos, y : yPos}, neighborList[i]));
		}
		return vertices;
	};

	// ---------------------------------- EDGES --------------------------------------- //
	var Edge = function(v1, v2) {
		this.v1 = v1;
		this.v2 = v2;
	};

	var createEdges = function(vertices, edgeset) {
		// create edges between vertex objects accessed by their index in game.vertices
		edges = [];
		for(var i = 0; i < edgeset.length; i++) {
			edges.push(new Edge(vertices[edgeset[i][0]], vertices[edgeset[i][1]]));
		}
		return edges;
	};

	// ---------------------------------- COLOR CORNERS ------------------------------------ //
	var ColorCorner = function(color, topLeft, size) {
		this.color = color;
		this.topLeft = topLeft;
		this.size = size;
	};

	var createCorners = function(gameSize) {
		corners = [];
		var size = 130;

		corners.push(new ColorCorner("red", 	{x : 0, y : 0}, 			     				     size));
		corners.push(new ColorCorner("yellow",  {x : gameSize.x - size, y : 0},  				     size));
		corners.push(new ColorCorner("green",	{x : 0, y : gameSize.y - size}, 			         size));
		corners.push(new ColorCorner("blue", 	{x : gameSize.x - size, y : gameSize.y - size}, 	 size));
		return corners;
	};

	window.onload = function() {
		new Game("canvas");
	};
})();



