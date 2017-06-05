
$(document).ready(() => {

	let margin = {top: 19.5, right: 0, bottom: 19.5, left: 50};
	let width = 960 - margin.right;
	let height = 500 - margin.top - margin.bottom;
	const PERIOD_TICKS = {"Q1": 0, "Q2": 720, "Q3": 1440, "Q4": 2160, "OT1": 2880, "OT2": 3180, "OT3": 3480, "OT4": 3780, "OT5": 4080, "OT6": 4380}
	const PERCENTAGE_TICKS = [0, 0.5, 1]

	d3.json("../single_game_prediction.json", function(plays) {
		//Figure out the max and min time passed
		let maxTimePassed = 0
		let minTimePassed = null
		for (let i in plays) {
			let play = plays[i]
		    if(maxTimePassed < play.time_passed){
		    	maxTimePassed = play.time_passed
		    }
		    if(minTimePassed === null || minTimePassed > play.time_passed){
		    	minTimePassed = play.time_passed
		    }
		}
		//round the earliest arrival time down to the hour
		//create the y scale using a domain from 0 to max distance
	    let yScale = d3.scaleLinear().domain([1, 0]).range([0, height])
	    //create the x scale using the earliest departure and latest arrival time.
		let xScale = d3.scaleLinear().domain([minTimePassed, maxTimePassed]).range([0, width])
		

		// Create the x axis with the ticks for the periods (e.g Q1, Q2)
		let xAxis = d3.axisBottom(xScale).tickValues(Object.values(PERIOD_TICKS)).tickFormat(function(period, i){
		    	return Object.keys(PERIOD_TICKS)[i];
		    }).tickSize(-height, 0);
		//Create the y axis with ticks of the percentage of home team winning the game
		let yAxis = d3.axisLeft(yScale).tickValues(PERCENTAGE_TICKS).tickFormat(function(period, i){
			return period;
		}).tickSize(-width, 0)

		// Create the SVG container and set the origin
		let svg = d3.select("#chart").append("svg")
		    .attr("width", width + margin.left + margin.right)
		    .attr("height", height + margin.top + margin.bottom)
		    .append("g")
		    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		//Place the x axis at the bottom
		svg.append("g")
		    .call(xAxis).attr("transform", "translate(0," + height + ")")

		//Add the y axis
		svg.append("g").call(yAxis);

		// //Moves the vertical line on the graph to be under the mouse.
		// function moveVerticalLine(){
		// 	const mouseX = d3.mouse(this)[0] - margin.left
		// 	let path = d3.path();
		// 	path.moveTo(mouseX, 0)
		// 	path.lineTo(mouseX, height)
		// 	verticalLine.attr("d", path.toString())
		// 	if(mouseX < 0 || mouseX > width){
		// 		verticalLine.attr("visibility", "hidden");
		// 	}
		// 	else{
		// 		verticalLine.attr("visibility", "visible");
		// 	}

		// }

		// //Shows the vertical line on the graph.
		// function showVerticalLine(){
		// 	verticalLine.attr("visibility", "visible");

		// }

		// //hides the vertical line on the graph.
		// function hideVerticalLine(){
		// 	verticalLine.attr("visibility", "hidden");

		// }

		// //Add the vertical line to the svg
		// let verticalLine = svg.append("path").attr("stroke", "black").attr("stroke-width", "2").attr("class", "verticalLine").on("mousemove", moveVerticalLine)

		// //add the event handlers making the vertical line appear under the mouse.
		// d3.select("#chart")
		// 	    .on("mousemove", moveVerticalLine)
		// 	    .on("mouseover", showVerticalLine)
		// 	    .on("mouseleave", hideVerticalLine);

		//Add the paths to the svg
		svg.append("g").attr("class", "schedules").selectAll("path").data([plays]).enter().append("path").attr("d", 
			position).attr("stroke", "black").attr("stroke-width", "3").attr("fill", "transparent");

		//this is the where the tooltip circle will be added 
		let focus = svg.append("g")
			.style("display", "none");

		//add the tooltip circle
		focus.append("circle") 
			.attr("class", "y")
			.style("fill", "none") 
			.style("stroke", "blue")
			.attr("r", 4);

		let voronoi = d3.voronoi()
			.x(function(d) { return xScale(d.time_passed); })
	  		.y(function(d) { return yScale(d.home_percentage); })
	  		.extent([[0, 0], [width, height]]);

	  	let voronoiData = voronoi(plays);

	    //append the rectangle which when interacted with, will affect the position and visibility of the tooltip
	    svg.append("rect")
			.attr("width", width)
			.attr("height", height)
			.style("fill", "none")
			.style("pointer-events", "all")
			.on("mouseover", function() { focus.style("display", null); })
			.on("mouseout", function() { focus.style("display", "none"); })
			.on("mousemove", mouseMove);

		let bisectTimePassed = d3.bisector(function(d) { return d.time_passed; }).left;
		

		function mouseMove(){
			const mouseX = d3.mouse(this)[0]
	    	const mouseY = d3.mouse(this)[1]
	    	const point = voronoiData.find(mouseX, mouseY, 50)
	    	if(point !== null){
	    		focus.style("display", null);
				focus.select("circle.y")
					.attr("transform",  
						"translate(" + point[0] + "," +  
										point[1] + ")"); 
				nvtooltip.show([point[0], point[1]], 'fdsafdsa')
	    	}
	    	else{
	    		focus.style("display", "none");
	    	}
		}
		// .on("mouseover", highlightPath)
		// .on("mouseout", unHighlightPath)

		// //Removes Highlights from the track that the mouse just left
		// function unHighlightPath(p){
		// 	d3.select(this).attr("stroke", "black").attr("stroke-width", "3")
		// }

		// //Highlights the path that the mouse is currently over
		// function highlightPath(p){
		// 	d3.select(this).attr("stroke", "red").attr("stroke-width", "5")
		// }

		//Returns the path to draw on screen given the play predictions data
		function position(plays) {
			//create a new path
			let path = d3.path();
			//Loop through each of the stops to calculate the path drawing
			for (let i = 0; i < plays.length; i++) {
				//Get the start and stop points for this station.
				let homePercentage = plays[i].home_percentage;
				let timePassed = plays[i].time_passed;
				//When the train arrived at the station
				let startX = xScale(timePassed);
				//the station currently at
				let startY = yScale(homePercentage);
				//if its the first station move to the beginning
				if(i == 0){
					path.moveTo(startX, startY);
				}
				else{
					//otherwise draw a path to this point from the last point
					path.lineTo(startX, startY);

				}
			}
			//return the stringified version of the path
			return path.toString()
		}

	})

})
