;(function(){
	// ----------------------------------- GLOBAL FUNCTIONS ------------------------------------ //
	// Returns the function it is passed with the argument already applied
	var partial = function(arg, fn) {
		return function() {
			var args = Array.prototype.slice.call(arguments)
			fn.apply(null, [arg].concat(args))
		};
	};

	// Returns the distance between two points
	var distance = function(p1, p2) {
		var a = p1.x - p2.x;
		var b = p1.y - p2.y;

		return Math.sqrt(a * a + b * b);
	}

	// -------------------------------------- COLLISION DETECTION ---------------------------------- //

	// takes a mouse object and an array of vertices
	// returns the first vertex that collides with the mouse, otherwise returns undefined
	var vertexClickedOn = function(mouse, vertices) {
		// sort the vertices by z index, high to low
		this.vertices.sort(function(a, b){
			if (a.zIndex > b.zIndex) {
				return -1;
			} else {
				return 1;
			}
		});

		for (var i = 0; i < vertices.length; i++) {
			if (distance(mouse, vertices[i].center) < vertices[i].radius){
				return vertices[i];
			}
		}
	};

	// returns the max z index of the vertices
	var maxZIndex = function(vertices) {
		// sort high to low
		vertices.sort(function(a, b){
			if (a.zIndex > b.zIndex) {
				return -1;
			} else {
				return 1;
			}
		});
		return vertices[0].zIndex;
	}

	// ------------------------------------------ COLORING --------------------------------------- //
	// returns the color a vertex has been assigned
	var determineColor = function(vertex, colorCorners) {
		var xMin, xMax, yMin, yMax, size;

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

	// checks if the vertices have been colored properly
	var checkColoring = function(vertices) {
		var curColor;	// the color of the vertex we are currently testing
		var neighbors;	// the neighbors of that vertex

		// loop through all the vertices
		// checking that their neighbors all have a valid color that is different from their own
		for (var i = 0; i < vertices.length; i++){
			curColor = vertices[i].color;
			neighbors = vertices[i].neighbors;

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
		var self = this;
		var canvas = document.getElementById(canvasId);
		var screen = canvas.getContext('2d');
		var gameSize = {x : canvas.width, y : canvas.height};
		var center = {x : canvas.width / 2, y : canvas.height / 2};

		this.gameWinner = false;
		this.resetGame = false;				// true for the one frame when the game is reset
		this.activeVertex;					// to hold the vertex that the user is currently moving
		this.mouser = new Mouser(canvas);
		this.transition = new Transition(gameSize, 21);
		this.colorSwipe = new ColorSwipe(gameSize, 21);
		this.endGameDisplay = new EndGameDisplay(gameSize, center);

		// color corners
		this.colorCorners = createCorners(gameSize);

		// Graph vertices and edges
		this.allGraphs = [{V : [0, 1, 2, 3, 4, 5], E : [[0,1], [0,5], [1,2], [2,3], [3,4], [4,5]],
						 						   Nbrs : [[1, 5], [0, 2], [1, 3], [2, 4], [3, 5], [0, 4]]},
						  {V : [0, 1, 2, 3], E : [[0,1], [0,2], [0,3], [1,2], [1,3], [2,3]],
											 Nbrs : [[1, 2, 3], [0, 2, 3], [0, 1, 3], [0, 1, 2]]},
						  {V : [0, 1, 2, 3, 4, 5], E : [[0,3], [0,4], [0,5], [1,3], [1,4], [1,5], [2, 3], [2, 4], [2, 5]],
						 						   Nbrs : [[3, 4, 5], [3, 4, 5], [3, 4, 5], [0, 1, 2], [0, 1, 2], [0, 1, 2]]},
						  {V : [0, 1, 2, 3, 4], E : [[0,1], [0,2], [0,3], [0,4], [1,2], [1,3], [1,4], [2,3], [2,4]], 
						 				        Nbrs : [[1, 2, 3, 4], [0, 2, 3, 4], [0, 1, 3, 4], [0, 1, 2], [0, 1, 2]]},
						  {V : [0, 1, 2, 3, 4, 5], E : [[0,1], [0,2], [0,3], [0,4], [0,5], [1,2], [3,4]],
						 						   Nbrs : [[1, 2, 3, 4, 5], [0, 2], [0, 1], [0, 4], [0, 3], [0]]}]
		this.currentGraph = this.allGraphs.shift();

		// vertices are initialized with a neighbor index list
		// the actual neighbor objects are assigned to each vertex once all vertices are created
		this.vertices = createVertices(center, this.currentGraph.V, this.currentGraph.Nbrs);
		for (var i = 0; i < this.vertices.length; i++) {
			this.vertices[i].assignNeighbors(this.vertices);
		}
		this.edges = createEdges(this.vertices, this.currentGraph.E);


		// Main game loop
		var tick = function() {
			self.update(gameSize);
			self.draw(screen, gameSize);
			requestAnimationFrame(tick);
		};

		tick();
	};

	Game.prototype = {
		update: function(gameSize){
			// ------------------------ MAIN GAME LOGIC --------------------------- // 
			// while the mouse is down
			if (this.mouser.getIsDown()) {
				// if the user has clicked on a vertex, and isn't already dragging one, pick it up
				if (this.activeVertex === undefined) {
					this.activeVertex = vertexClickedOn(this.mouser.getPosition(), this.vertices);
				} else {
					// set the z index to be the new max
					this.activeVertex.zIndex = maxZIndex(this.vertices) + 1;
					// update the coordinates
					this.activeVertex.center.x = this.mouser.getPosition().x;
					this.activeVertex.center.y = this.mouser.getPosition().y;
				}
			} else {
				// if the vertex was just placed assign it a color
				if (this.activeVertex !== undefined){
					this.activeVertex.color = determineColor(this.activeVertex, this.colorCorners);

					// if the coloring is correct the player has won the game
					this.gameWinner = checkColoring(this.vertices);
				}

				// mouse is released, reset activeVertex to undefined
				this.activeVertex = undefined;
			}

			// ------------------------ TRANSITION --------------------------- // 
			// if the player has won, start the winner transition
			if (this.gameWinner) {
				this.transition.isRunning = true;
			} 

			// update transition
			if(this.transition.isRunning) {
				this.transition.update();
				// if the transition has finished, trigger the color swipe
				if (this.transition.isFinished) {
					this.colorSwipe.isRunning = true;
				}
			}

			// update colorswipe
			if (this.colorSwipe.isRunning) {
				this.colorSwipe.update();

				// if the colorswipe is covering the screen, reset puzzle and transition
				if (this.colorSwipe.isCoveringScreen && !this.resetGame) {
					if (this.allGraphs.length > 0) {
						this.reset(gameSize);
					} else {
						this.endGame(gameSize);
					}
					this.resetGame = true;
				}
				// once the colorswipe is finished running, reset it
				if (this.colorSwipe.isFinished) {
					this.colorSwipe = new ColorSwipe(gameSize, 20);
					this.resetGame = false;
				}
			}
		},

		draw: function(screen, gameSize) {
			// clear the screen
			screen.clearRect(0, 0, gameSize.x, gameSize.y);

			// --------------------- GAME OBJECTS ------------------------ // 
			// draw the color corners
			for (var i = 0; i < this.colorCorners.length; i++){
				this.colorCorners[i].draw(screen);
			}

			// draw the graph edges
			for (var i = 0; i < this.edges.length; i++){
				this.edges[i].draw(screen);
			}

			// sort the vertices by increasing z index
			this.vertices.sort(function(a, b){
				if (a.zIndex < b.zIndex) {
					return -1;
				} else {
					return 1;
				}
			});
			// draw the graph vertices
			for (var i = 0; i < this.vertices.length; i++){
				this.vertices[i].draw(screen);
			}

			// ------------------------ TRANSITION / END GAME --------------------------- // 
			if (this.transition.isRunning) {
				this.transition.draw(screen, gameSize);
			}
			if (this.endGameDisplay.isRunning) {
				this.endGameDisplay.draw(screen);
			}
			if (this.colorSwipe.isRunning) {
				this.colorSwipe.draw(screen);
			}
		},

		reset : function(gameSize) {
			// reset game objects
			this.gameWinner = false;
			this.currentGraph = this.allGraphs.shift();
			this.vertices = createVertices({ x : gameSize.x / 2, y : gameSize.y / 2},
											 this.currentGraph.V,
											 this.currentGraph.Nbrs);
			for (var i = 0; i < this.vertices.length; i++) {
				this.vertices[i].assignNeighbors(this.vertices);
			}
			this.edges = createEdges(this.vertices, this.currentGraph.E);

			// reset transition
			this.transition = new Transition(gameSize, 20);
		},

		endGame : function(gameSize) {
			this.gameWinner = false;
			this.endGameDisplay.isRunning = true;

			// reset transition
			this.transition = new Transition(gameSize, 20);
		}
	};

	// --------------------------------------- MOUSER ---------------------------------------- //
	var Mouser = function(canvas) {
		this.x = 0;
		this.y = 0;
		this.isDown = false;
		var self = this;

		// Event listeners for user input (mouse clicks)
		canvas.addEventListener("mousedown", partial(canvas, this.onMouseDown.bind(this)));
		canvas.addEventListener("mouseup", partial(canvas, this.onMouseUp.bind(this)));
		canvas.addEventListener("mousemove", partial(canvas, this.whileMouseMove.bind(this)));
	};

	Mouser.prototype = {
		getIsDown : function() {
			return this.isDown;
		},

		getPosition : function() {
			return { x : this.x, y : this.y};
		},

		setCoordinates : function(canvas) {
			var rect = canvas.getBoundingClientRect();
			this.x = event.offsetX || event.pageX - rect.left - window.scrollX;
	    	this.y = event.offsetY || event.pageY - rect.top - window.scrollY;

		   	// need to clip to make sure x,y are within the canvas dimensions
			this.x = Math.min(Math.max(this.x, 0), canvas.width);
			this.y = Math.min(Math.max(this.y, 0), canvas.height);
		},

		onMouseDown : function(canvas, event) {
			this.setCoordinates(canvas);
			this.isDown = true;
		},

		// for now have an optional param to account for when the mouse is dragged off canvas
		// NOTE: still need to fix the issue of dragging an element off then BACK onto the canvas
		onMouseUp : function(canvas, event) {
			this.isDown = false;
		},

		whileMouseMove : function(canvas, event) {
			// update the mouse position if the mouse is down
			if (this.isDown) {
				this.setCoordinates(canvas);
		    }
		}
	};

	// -------------------------------------- VERTICES --------------------------------------- //
	var Vertex = function(center, neighborIndexList, zIndex) {
		this.radius = 20;
		this.center = center;
		this.color = "none";
		this.neighborIndexList = neighborIndexList;
		this.neighbors = [];
		this.zIndex = zIndex;
	};

	Vertex.prototype = {
		draw : function(screen) {
			screen.beginPath();
			screen.lineWidth = 4;
			screen.arc(this.center.x, this.center.y, 
					   this.radius, 0, 2 * Math.PI);
			screen.stroke();
			if (this.color === "none") screen.fillStyle = "rgb(240, 240, 240)";	// fill offwhite
			else screen.fillStyle = this.color;
			screen.fill();
			screen.closePath();
		},

		assignNeighbors : function(vertices) {
			for (var i = 0; i < this.neighborIndexList.length; i++) {
				this.neighbors.push(vertices[this.neighborIndexList[i]]);
			}
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
			vertices.push(new Vertex({x : xPos, y : yPos}, neighborList[i], i));
		}
		return vertices;
	};

	// ---------------------------------- EDGES --------------------------------------- //
	var Edge = function(v1, v2) {
		this.v1 = v1;
		this.v2 = v2;
	};

	Edge.prototype = {
		draw : function(screen) {
			screen.beginPath();
			screen.lineWidth = 3;

			screen.moveTo(this.v1.center.x, this.v1.center.y);
			screen.lineTo(this.v2.center.x, this.v2.center.y);

			screen.stroke();
			screen.closePath();
		}
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

	ColorCorner.prototype = {
		draw : function(screen)	{
				screen.beginPath();
				// color rect
				screen.fillStyle = this.color;
				screen.fillRect(this.topLeft.x, 
								this.topLeft.y,
								this.size, 
								this.size);
				screen.closePath();
			}
	};

	var createCorners = function(gameSize) {
		corners = [];
		var size = gameSize.x / 6;
		var colors = ["red", "yellow", "blue", "green"];

		corners.push(new ColorCorner("red", 	{x : 0, y : 0}, 			     				     size));
		corners.push(new ColorCorner("red", 	{x : size, y : 0}, 			     				     size));
		corners.push(new ColorCorner("red", 	{x : size * 2, y : 0}, 			     				 size));
		corners.push(new ColorCorner("red", 	{x : 0, y : size}, 			     				     size));
		corners.push(new ColorCorner("red", 	{x : 0, y : size * 2}, 			     				 size));

		corners.push(new ColorCorner("yellow",  {x : gameSize.x - size, y : 0},  				     size));
		corners.push(new ColorCorner("yellow",  {x : gameSize.x - size * 2, y : 0},  			     size));
		corners.push(new ColorCorner("yellow",  {x : gameSize.x - size * 3, y : 0},  			     size));
		corners.push(new ColorCorner("yellow",  {x : gameSize.x - size, y : size},  			     size));
		corners.push(new ColorCorner("yellow",  {x : gameSize.x - size, y : size * 2},  			 size));

		corners.push(new ColorCorner("blue",	{x : 0, y : gameSize.y - size}, 			         size));
		corners.push(new ColorCorner("blue",	{x : size, y : gameSize.y - size}, 			         size));
		corners.push(new ColorCorner("blue",	{x : size * 2, y : gameSize.y - size}, 			     size));
		corners.push(new ColorCorner("blue",	{x : 0, y : gameSize.y - size * 2}, 			         size));
		corners.push(new ColorCorner("blue",	{x : 0, y : gameSize.y - size * 3}, 			         size));

		corners.push(new ColorCorner("green", 	{x : gameSize.x - size, y : gameSize.y - size}, 	 size));
		corners.push(new ColorCorner("green", 	{x : gameSize.x - size * 2, y : gameSize.y - size},  size));
		corners.push(new ColorCorner("green", 	{x : gameSize.x - size * 3, y : gameSize.y - size},  size));
		corners.push(new ColorCorner("green", 	{x : gameSize.x - size, y : gameSize.y - size * 2}, 	 size));
		corners.push(new ColorCorner("green", 	{x : gameSize.x - size, y : gameSize.y - size * 3}, 	 size));
		return corners;
	};

	// ---------------------------------- TRANSITION SCREEN ------------------------------------ //
	var Transition = function(gameSize, blockThickness) {
		this.fontSize = 0;
		this.maxFontSize = 100;
		this.textPos = { x : gameSize.x / 2, y : gameSize.y / 2};
		this.blocks = createHorizontalBlocks(1.5 * gameSize.x, blockThickness, gameSize.x, gameSize);

		this.isRunning = false;
		this.isFinished = false;
	};


	Transition.prototype = {
		draw : function(screen, gameSize)	{			
			// draw greyscale blocks
			for (var i = 0; i < this.blocks.length; i++) {
				screen.fillStyle = this.blocks[i].color;
				screen.fillRect(this.blocks[i].x, 
								this.blocks[i].y,
								this.blocks[i].width, 
								this.blocks[i].height);
			}

			// draw text
			screen.textAlign = "center"; 
			var size = Math.min(this.fontSize, this.maxFontSize);
			screen.font = "" + size + "px Courier";

			var thickness = 4;
			var offSet = 4 * thickness;
			var colors = ["yellow", "red", "blue", "green"];
			var maxTextPosGreat = { x : (gameSize.x / 2) + thickness, y : (gameSize.y / 2) - 25};
			var maxTextPosJob = { x : (gameSize.x / 2) + thickness, y : (gameSize.y / 2) + 75};

			// underlying color text
			for (var i = 0; i < colors.length; i++) {
				screen.fillStyle = colors[i];
				screen.fillText("GREAT", maxTextPosGreat.x - (offSet / 2),
										 Math.min(maxTextPosGreat.y + offSet, this.textPos.y + offSet));
				screen.fillText("JOB!", maxTextPosJob.x - (offSet / 2),
										Math.min(maxTextPosJob.y + offSet, this.textPos.y + offSet));
				offSet -= thickness;
			}

			// topmost black text
			screen.fillStyle = "black";
			screen.fillText("GREAT", maxTextPosGreat.x,
									  Math.min(maxTextPosGreat.y, this.textPos.y));
			screen.fillText("JOB!", maxTextPosJob.x,
									 Math.min(maxTextPosJob.y, this.textPos.y));
		},

		update : function() {
			// stretch the greyscale blocks
			for (var i = 0; i < this.blocks.length; i++){
				if ((i % 2) == 1) {
					this.blocks[i].x -= 25;
				}
				this.blocks[i].width += 25;
			}

			// update font size once the screen is covered with greyscale blocks
			// ie. once a left moving block has x position < 0
			if (this.blocks[1].x < 0){
				this.fontSize += 6;
				this.textPos.y += 5;
			}

			// transition is finished running once fontsize has reached its max value
			if (this.fontSize >= this.maxFontSize) {
				this.isFinished = true;
			}

		},
	};

	var ColorSwipe = function(gameSize, blockThickness) {
		this.fallingBlocks = createVerticalBlocks(blockThickness, 1.5 * gameSize.y, 2 * gameSize.y, gameSize);
		this.isRunning = false;
		this.isCoveringScreen = false;
		this.isFinished = false;
		this.maxY = gameSize.y;
	};

	ColorSwipe.prototype = {
		draw : function(screen) {
			for (var i = 0; i < this.fallingBlocks.length; i++) {
				screen.fillStyle = this.fallingBlocks[i].color;
				screen.fillRect(this.fallingBlocks[i].x, 
								this.fallingBlocks[i].y,
								this.fallingBlocks[i].width, 
								this.fallingBlocks[i].height);
			}
		},

		update : function() {
			for (var i = 0; i < this.fallingBlocks.length; i++){
				this.fallingBlocks[i].y += 20;
			}

			// determine when the blocks are covering the screen
			// and when they've moved off screen
			if (this.fallingBlocks[0].y >= this.maxY) {
				this.isFinished = true;
			} else if (this.fallingBlocks[0].y + this.fallingBlocks[0].height >= this.maxY) {
				this.isCoveringScreen = true;
			}
		}

	};

	var EndGameDisplay = function(gameSize, center) {
		this.isRunning = false;
		this.gameSize = gameSize;
		this.center = center;
		this.diagonal = Math.sqrt(this.gameSize.x * this.gameSize.x + this.gameSize.y * this.gameSize.y) / 2;
	}

	EndGameDisplay.prototype = {
		draw : function(screen) {
			// draw background
			var offSet = 24;
			var colors = ["yellow", "red", "blue", "green"];
			for (var r = Math.ceil((this.diagonal / offSet)); r > 0; r--) {
				screen.fillStyle = colors[r % colors.length];
				screen.beginPath();
				screen.arc(this.center.x, this.center.y, r * offSet, 0, 2 * Math.PI);
				screen.fill();
			}

			// draw text
			screen.textAlign = "center"; 
			screen.font = "80px Courier";

			var maxTextPosThanks = { x : this.gameSize.x / 2, y : (this.gameSize.y / 2) - 25};
			var maxTextPosPlaying = { x : this.gameSize.x / 2, y : (this.gameSize.y / 2) + 75};

			screen.fillStyle = "black";
			screen.fillText("THANKS FOR", maxTextPosThanks.x, maxTextPosThanks.y);
			screen.fillText("PLAYING!", maxTextPosPlaying.x, maxTextPosPlaying.y);
		}
	}

	// create an array of horizontal transition blocks
	var createHorizontalBlocks = function(width, height, offSet, gameSize) {
		var blocks = [];
		var xPos;

		for (var i = 0; i < gameSize.y / height; i++) {
			// alternate positions to be offscreen left and right
			xPos = ((i % 2) == 0) ? -(offSet + width) : gameSize.x + offSet;

			blocks.push({x : xPos,
						 y : i * height,
						 width : width,
						 height : height,
						 color : randomGreyscale(i * (height / gameSize.y))});
		}
		return blocks;
	};

	// returns a random greyscale color given a range between 0 and 1, light to dark
	var randomGreyscale = function(range){
		
		var x = 255 - Math.floor(Math.random() * range * 255);
		var grey = "rgb(" + x + "," + x + "," + x + ")";
		
		return grey;
	};

	// create an array of transition blocks
	var createVerticalBlocks = function(width, height, offSet, gameSize) {
		var blocks = [];
		var yPos;
		var colors = ["yellow", "red", "blue", "green"];

		for (var i = 0; i < gameSize.x / width; i++) {
			yPos = -(offSet + height);
			var c = colors[i % colors.length];
			blocks.push({x : i * width, y : yPos, width : width, height : height, color : c});
		}
		return blocks;
	};

	window.onload = function() {
		new Game("canvas");
	};
})();

