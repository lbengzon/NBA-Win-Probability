/*****
 * Really simple tooltip implementation.
 * I may build upon it, but really trying to keep it minimal.
 *****/

(function($) {
	//create the tooltip that can be accessed from anywhere in the page
	var nvtooltip = window.nvtooltip = {};

	nvtooltip.show = function(pos, content, quartile, dist) {
		//get the tooltip
		var container = $('<div class="nvtooltip">');
		dist = dist || 40;
		//set the content of the container
		container
			.html(content)
			.css({left: -1000, top: -1000, opacity: 0})
			.appendTo('body');

		var height = container.height() + parseInt(container.css('padding-top'))  + parseInt(container.css('padding-bottom')),
				width = container.width() + parseInt(container.css('padding-left'))  + parseInt(container.css('padding-right')),
				windowWidth = $(window).width(),
				windowHeight = $(window).height(),
				scrollTop = $('body').scrollTop(),  //TODO: also adjust horizontal scroll
				left, top;

		//calculate the left and top based on which quartile the mouse is in
		switch (quartile) {
			case 'q3':
				left = pos[0] + dist;
				top = pos[1] - height - dist;
				break;
			case 'q4':
				left = pos[0] - width - dist;
				top = pos[1] - height - dist;
				break;
			case 'q1':
				left = pos[0] - width - dist;
				top = pos[1] + dist;
				break;
			case 'q2':
				left = pos[0] + dist;
				top = pos[1] + dist;
				//if (left < 0) left = 5;
				//if (left + width > windowWidth) left = windowWidth - width - 5;
				//if (scrollTop > top) top = pos[1] + dist;
				break;
		}
		//place the tooltip
		container
			.css({
				left: left,
				top: top,
				opacity: 1
			});
	};

	nvtooltip.cleanup = function() {
		//File the tooltip
		var tooltips = $('.nvtooltip');
		//Clear the opacity
		tooltips.css('opacity',0);
		//Remove tooltip after half a second
		setTimeout(function() {
			tooltips.remove()
		}, 500);
	};

})(jQuery);