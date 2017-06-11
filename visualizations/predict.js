
$(document).ready(() => {

	let margin = {top: 19.5, right: 0, bottom: 19.5, left: 50};
	let width = 960 - margin.right;
	let height = 500 - margin.top - margin.bottom;
	const PERIOD_TICKS = {0:"Q1", 720:"Q2",  1440:"Q3",  2160: "Q4", 2880:"OT1", 3180:"OT2", 3480:"OT3", 3780:"OT4", 4080:"OT5", 4380:"OT6"}
	const PERCENTAGE_TICKS = [0, 0.5, 1]
	const chartTop = $("#chart")[0].getBoundingClientRect().top;
	const chartLeft = $("#chart")[0].getBoundingClientRect().left;
	const scoreRegex = new RegExp('([0-9]*) - ([0-9]*)');

	d3.json("../single_game_prediction.json", function(plays) {
		let homeTeam = "ORL";
		let awayTeam = "OKC";

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
		//get the slider element
		let slider = $('#slider')[0];
		//set the slider width
		slider.style.width = width + "px";

		slider.style.margin = '0 auto 30px';
		let sliderTicks = getSliderTicks(minTimePassed, maxTimePassed);
		noUiSlider.create(slider, {
			start: [minTimePassed, maxTimePassed],
			connect: true,
			range: {
				'min': minTimePassed,
				'max': maxTimePassed
			},
			pips: {
				mode: 'values',
				values: sliderTicks,
				density: 1
			}
		});
		recountVal(3180);
		$('.noUi-value.noUi-value-horizontal.noUi-value-large').each(function(){
	        var val = $(this).html();
	        val = recountVal(parseInt(val));
	        $(this).html(val);
	    });




		//create the y scale using a domain from 0 to max distance
		let yScale = d3.scaleLinear().domain([1, 0]).range([0, height])
		

		//Create the y axis with ticks of the percentage of home team winning the game
		let yAxis = d3.axisLeft(yScale).tickValues(PERCENTAGE_TICKS).tickFormat(function(period, i){
			return period;
		}).tickSize(-width, 0);

		// Create the SVG container and set the origin
		let svg = d3.select("#chart").append("svg")
			.attr("width", width + margin.left + margin.right + 1)
			.attr("height", height + margin.top + margin.bottom)
			.append("g")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		//Define the variables necessary to rescale and draw the x axis
		let xScale, 
		xAxis, 
		xAxisVis = svg.append("g").attr("transform", "translate(0," + height + ")");

		//draw the x axis based on the min time passed and max time passed found in the game
		redrawXAxis(minTimePassed, maxTimePassed);


		//Add the y axis
		svg.append("g").call(yAxis);

		var yLabel = svg.append("text").attr("class", "label").attr("transform", "translate(-15, 0)rotate(270)").text("Win Probability (ORL)").attr("text-anchor", "end")

		//create the g where the clipping rect and the path representing the winning probability of the home team will be appended.
		let winProb = svg.append("g").attr("class", "winProb");
		
		//create the clipping rectangle so that when zooming, the line doesnt go passed the graph
		var clip = winProb.append("defs").append("svg:clipPath")
			.attr("id", "clip")
			.append("svg:rect")
			.attr("id", "clip-rect")
			.attr("x", "0")
			.attr("y", "0")
			.attr("width", width)
			.attr("height", height);

		//draw the path representing the winning probability of the home team
		drawWinPath();
		//this is the where the tooltip circle will be added 
		let focus = svg.append("g")
			.style("display", "none");

		//add the tooltip circle
		focus.append("circle") 
			.attr("class", "y")
			.style("fill", "none") 
			.style("stroke", "blue")
			.attr("r", 4);

		//Create the voronoi that will be used to find the nearest point
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

		//Whenever the slider updates, redraw the graph.
		slider.noUiSlider.on('update', redrawGraph);

		function recountVal(timePassed){
	        periodNumber = 0;
	        leftOver = timePassed;
	        while(leftOver > 0){
	        	let secondsInPeriod = 0;
	        	if(periodNumber < 4){
		    		secondsInPeriod = 720;
		    	} else{
		    		secondsInPeriod = 300;
		    	}
	        	leftOver -= secondsInPeriod;
	        	periodNumber += 1;
	        }

	        let periodString = getPeriodString(periodNumber);
	        leftOver = -leftOver
	        let min = Math.floor(leftOver/60);
	        let seconds = leftOver % 60;
	        if(seconds < 10){
	        	seconds = "0" + seconds;
	        }
	        let playClock = min + ":" + seconds;
	        return periodString + "<br>" + playClock;
	    }

		//Redraws the entire graph based on the new min and max time passed values
		function redrawGraph(values){
			redrawXAxis(values[0], values[1]);
			drawWinPath();
			//recallibrate the voronoi
			voronoiData = voronoi(plays);
		}

		//Draws the path of the win probability of the home team.
		function drawWinPath(){
			winProb.selectAll("path").remove();
			winProb.selectAll("path").data([plays]).enter().append("path").attr("d", 
				position).attr("stroke", "black").attr("stroke-width", "2").attr("fill", "transparent").attr("clip-path", "url(#clip)");
		}

		//Draws the x axis based on the min and max time passed values
		function redrawXAxis(minTimePassed, maxTimePassed){
			//create the x scale using the earliest departure and latest arrival time.
			xScale = d3.scaleLinear().domain([minTimePassed, maxTimePassed]).range([0, width])
			//get the period ticks based on the min and max time passed of the game
			let periodTicks = getPeriodTicks(minTimePassed, maxTimePassed);
			// Create the x axis with the ticks for the periods (e.g Q1, Q2)
			xAxis = d3.axisBottom(xScale);
			//get the minute ticks
			let minuteTicks = getSliderTicks(minTimePassed, maxTimePassed, 60);
			//add all the ticks with the ticks that signifiy the end of a period having a label
			xAxis.tickValues(minuteTicks).tickFormat(function(period, i){
				if (period in periodTicks){
					return periodTicks[period];
				}
				return "";
			}).tickSize(-height, 0);
			xAxisVis.selectAll("g")
		        .filter(function(period, i){
				if (period in periodTicks){
					return true;
				}
				return false;
			}).style("opacity", "1");

			//change all ticks that dont signify the end of a period to a lower opacity (minor ticks)
			xAxisVis.selectAll("g")
		        .filter(function(period, i){
				if (period in periodTicks){
					return false;
				}
				return true;
			}).style("opacity", "0.2");

		    
			//Draw the axis
			xAxisVis.call(xAxis);
		}

		//Gets the ticks based on the the start and end of the graph
		function getPeriodTicks(minSliderTimePassed, maxSliderTimePassedX){
			let periodTicks = {};
			minSliderTimePassed = Math.round(minSliderTimePassed)
			maxSliderTimePassedX = Math.round(maxSliderTimePassedX);
			ticks = Object.keys(PERIOD_TICKS);
			for(let i in ticks){
				let tick = ticks[i];
				if (tick >= minSliderTimePassed && tick < maxSliderTimePassedX){
					periodTicks[+tick] = PERIOD_TICKS[tick];
				}
			}
			periodTicks[maxTimePassed] = "";

			return periodTicks;
		}

		function getSliderTicks(minTimePassed, maxTimePassed, tickSize){
			tickSize = tickSize || 120;
			let sliderTicks = [];
			minTimePassed = Math.round(minTimePassed);
			maxTimePassed = Math.round(maxTimePassed);
			let tick = minTimePassed + tickSize - (minTimePassed % tickSize);
			sliderTicks.push(tick);
			while(tick < maxTimePassed){
				tick += tickSize;
				sliderTicks.push(tick);
			}
			return sliderTicks;
		}

		function mouseMove(){
			const mouseX = d3.mouse(this)[0]
			const mouseY = d3.mouse(this)[1]
			//try to find a point that is close to the mouse cursor
			const point = voronoiData.find(mouseX, mouseY, 50)
			//if we have found a point within 50 px from the mouse
			if(point !== null){
				//Show the focus tool tip
				focus.style("display", null);
				//Move the circle to the point that was found
				focus.select("circle.y")
					.attr("transform",  
						"translate(" + point[0] + "," +  
										point[1] + ")"); 
				//remove the old tool tip if there was one
				nvtooltip.cleanup();
				//get the content to be displayed in the tool tip from the data
				content = createToolTipContent(point.data);
				//Get the quartile that the point is in so that we know where to place the tooltip
				let quartile = getQuartile(point);
				//display the tooltip
				nvtooltip.show([point[0] + margin.left + chartLeft, point[1] + margin.top + chartTop], content, quartile)
			} //if we haven't found a point
			else{
				//remove the tooltip
				nvtooltip.cleanup()
				focus.style("display", "none");
			}
		}

		//returns the quartile that the mouse is in. Either 'q1', 'q2', 'q3', 'q3'
		function getQuartile(point){
			let quartile = ""
			if(point[0] > width/2 && point[1] < height/2){
				quartile = "q1"
			} else if(point[0] < width/2 && point[1] < height/2){
				quartile = "q2"
			} else if(point[0] < width/2 && point[1] > height/2){
				quartile = "q3"
			} else if(point[0] > width/2 && point[1] > height/2){
				quartile = "q4"
			}
			return quartile;
		}

		function getPeriodString(periodNumber){
			let period = "";
			if(periodNumber < 5){
				period = "Q" + periodNumber;
			} else{
				const ot = periodNumber - 4;
				period = "OT" + ot;
			}
			return period;
		}

		function getPercentageChange(pointData){
			let index = plays.indexOf(pointData);
			if(index > 0){
				let playBefore = plays[index - 1];
				return convertToPercentage((+pointData.home_percentage) - (+playBefore.home_percentage))
			}
			else{
				return convertToPercentage(pointData.home_percentage);
			}
		}

		function convertToPercentage(decimal){
			return Math.round(decimal * 10000)/100 + "%";
		}

		//given the point data, creates the content that will be inside the tool tip
		function createToolTipContent(pointData){
			//Change the winning percentage from decimal to a percentage rounded to the nearest hundredth
			let winPercentage = convertToPercentage(pointData.home_percentage);
			let percentageChange = getPercentageChange(pointData);


			let score = pointData.score;
			let scoreArray = score.match(scoreRegex);
			let fullScore = awayTeam + ": "+ scoreArray[1] + " " +  homeTeam + ": " + scoreArray[2];
			let playClock = pointData.play_clock
			//Figure out the text for the quarter (eg. OT1, or Q4, we dont want any Q5)
			let period = getPeriodString(pointData.period);

			//figure out the description based on which descriptions are null in the data
			let description = "";
			if(pointData.home_description !== ""){
				description = pointData.home_description;
			} else if (pointData.away_description !== ""){
				description = pointData.away_description;
			} else if(pointData.event_description !== ""){
				description = pointData.event_description + " : ";
				if(pointData.player1_name !== ""){
					description += pointData.player1_name + ", "
				}
				if(pointData.player2_name !== ""){
					description += pointData.player1_name
				}
			}
			//Create the actual content to be appended to the tooltip
			let content = '<h3>' + fullScore + '</h3>' + '<p>' +
				'<span class="value">' + period + '-' + playClock + '</span><br>' +
				'<span class="value">' + homeTeam + ' win percentage: ' + winPercentage + ' ('+percentageChange+')</span><br>' +
				'<span class="value">' + description + '</span><br>' +
				'</p>';
			return content;
		}

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
