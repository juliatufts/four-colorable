;(function(){
	// ----------------------------------- GLOBAL VARIABLES ---------------------------------------- //
	var mouse = {x : 0, y : 0, isDown: false};

	// ----------------------------------------- INPUT ---------------------------------------- //
	var mouseDownID = -1;	// Global ID of mouse down interval
	var onMouseDown = function(event, canvas){
		x = event.x - canvas.offsetLeft;
		y = event.y - canvas.offsetTop;
		console.log("x : " + x + ", y : " + y);

		if (mouseDownID === -1) {
			mouse.isDown = true;
			mouseDownID = 0;
		}
	};

	var onMouseUp = function(event, canvas){
		// stop whileMouseDown only if it has already been triggered, and reset mouseDownID
		if (mouseDownID !== -1 ) {
			mouse.isDown = false;
		    mouseDownID = -1;
	    }
	};

	var whileMouseMove = function(event, canvas){
		if (mouse.isDown) {
		   	// need to clip to make sure x,y are within the canvas dimensions
			x = Math.min(Math.max(event.x - canvas.offsetLeft, 0), canvas.width);
			y = Math.min(Math.max(event.y - canvas.offsetTop, 0), canvas.height);
			console.log("x : " + x + ", y : " + y);
	    }
	};

	// ----------------------------------------- GAME ---------------------------------------- //

	var Game = function(canvasId){
		var canvas = document.getElementById(canvasId);
		var screen = canvas.getContext('2d');
		var gameSize = {x : canvas.width, y : canvas.height};
		var center = {x : canvas.width / 2, y : canvas.height / 2};

		// color corners
		this.colorCorners = createCorners(gameSize);

		// Graph nodes and edges
		var currentGraph = {V : [0, 1, 2, 3], E : [[0,1], [0,2], [0,3], [1,2], [1,3], [2,3]]}
		this.vertices = createVertices(center, currentGraph.V);
		this.edges = createEdges(this, currentGraph.E);

		// Event listeners for user input (mouse clicks)
		canvas.addEventListener("mousedown", function(event){
			onMouseDown(event, canvas);
		});
		canvas.addEventListener("mouseup", function(event){
			onMouseUp(event, canvas);
		});
		canvas.addEventListener("mousemove", function(event){
			whileMouseMove(event, canvas);
		});


		// Loop
		var self = this;
		var tick = function() {
			self.draw(screen, gameSize);
			requestAnimationFrame(tick);
		};

		tick();
	};

	Game.prototype = {
		draw: function(screen, gameSize){
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
	var Vertex = function(center){
		this.radius = 20;
		this.center = center;
		// add list of neighbors?
	};

	Vertex.prototype = {
		draw : function(screen){
			screen.beginPath();
			screen.arc(this.center.x, this.center.y, 
					   this.radius, 0, 2 * Math.PI);
			screen.lineWidth = 4;
			screen.stroke();
			screen.fillStyle = "rgb(240, 240, 240)";	// fill offwhite
			screen.fill();
		}
	};

	var createVertices = function(center, vertexset){
		// create vertices in a circle (with radius rad) around the center
		vertices = [];
		var xPos;
		var yPos;
		var rad = 80;
		var n = vertexset.length;

		for(var i = 0; i < n; i++){
			xPos = Math.cos(((2 * Math.PI * i) / n)) * rad + center.x;
			yPos = Math.sin(((2 * Math.PI * i) / n)) * rad + center.y;
			vertices.push(new Vertex({x : xPos, y : yPos}));
		}
		return vertices;
	};

	// ---------------------------------- EDGES --------------------------------------- //
	var Edge = function(v1, v2){
		this.v1 = v1;
		this.v2 = v2;
	};

	var createEdges = function(game, edgeset){
		// create edges between vertex objects accessed by their index in game.vertices
		edges = [];
		for(var i = 0; i < edgeset.length; i++){
			edges.push(new Edge(game.vertices[edgeset[i][0]], game.vertices[edgeset[i][1]]));
		}
		return edges;
	};

	// ---------------------------------- COLOR CORNERS ------------------------------------ //
	var ColorCorner = function(color, topLeft, size){
		this.color = color;
		this.topLeft = topLeft;
		this.size = size;
	};

	var createCorners = function(gameSize){
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



