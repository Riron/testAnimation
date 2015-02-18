/****
Helper
*****/
function makeObject(keys, defaultValue) {

	var obj = {};
	for (var i = 0; i < keys.length; i++) {
	  obj[keys[i]] = defaultValue;
	}

	return obj;
}

/****
Card
*****/
function Card(el) {
	this.elements_ = {
		root: el,
		image: el.querySelector('img'),
		title: el.querySelector('.item-title'),
		subtitle: el.querySelector('.item-subtitle'),
		content: el.querySelector('.item-content')
	};
	this.expanded_ = false;

	this.parts_ = Object.keys(this.elements_);
	this.properties_ = ['left', 'top', 'width', 'height', 'scaleX', 'scaleY', 'opacity'];

	this.currentPositions_ = makeObject(this.parts_, null);
  	this.nextPositions_ = makeObject(this.parts_, null);
	this.diffs_ = {
		root: makeObject(this.properties_, 0),
		title: makeObject(this.properties_, 0),
		image: makeObject(this.properties_, 0),
		subtitle: makeObject(this.properties_, 0),
		content: makeObject(this.properties_, 0)
	};
}

Card.prototype.expand = function() {
	this.expanded_ = true;
	this.getDiffs();
	this.animate();
}

Card.prototype.collapse = function() {
	this.expanded_ = false;
	this.getDiffs();
	this.animate();
}

Card.prototype.animate = function() {
	for(var index in this.elements_) {
		var transformation = 'translateY(' + this.diffs_[index].top + 'px) translateX(' + this.diffs_[index].left + 'px)';
		if(index == 'image') {
			transformation += 'scale(' + this.diffs_[index].height + ')';
		}
		// Go from the inverted position to last.
		var player = this.elements_[index].animate(
		[
			{ transform: transformation },
			{ transform: 'translateY(0) translateX(0) scale(1)' },
		],
		{
			duration: 300,
			easing: 'cubic-bezier(0,0,0.32,1)',
			fill: 'forwards'
		});
	}
}

Card.prototype.getDiffs = function() {
	// Get the first positions
	for(var index in this.elements_) {
		this.currentPositions_[index] = this.elements_[index].getBoundingClientRect();
	}

	for(var index in this.elements_) {
		// CHROME FIX: When we scroll, the content musnt be sticked on top=0
		// https://code.google.com/p/chromium/issues/detail?id=20574 
		if(this.expanded_) {
			var scrollTop = document.getElementsByClassName('scroll-content')[0].scrollTop;
			this.elements_['root'].style.top = scrollTop + 'px';
		}
		else {
			this.elements_['root'].style.top = 0;
		}

		// Now set the element to the last position
		this.elements_[index].classList.toggle('item--expanded');
		// Read again. This forces a sync layout, so be careful.
		this.nextPositions_[index] = this.elements_[index].getBoundingClientRect();
		
		// Invert.
		this.diffs_[index].top = this.currentPositions_[index].top - this.nextPositions_[index].top;
		this.diffs_[index].left = this.currentPositions_[index].left - this.nextPositions_[index].left;
		this.diffs_[index].height = this.currentPositions_[index].height / this.nextPositions_[index].height;
		
		this.elements_[index].style.transform = 'translateY(' + this.diffs_[index].top + 'px) translateX(' + this.diffs_[index].left + 'px)';
		if(index == 'image') {
			this.elements_[index].style.transform += 'scale(' + this.diffs_[index].height + ')';
		}
	}
}

/****
Directive
*****/
angular.module('starter.controllers')
.directive('ocMaterial', function() {
	return {
		priority: 1001,
		restrict: 'EA',
		link: function(scope, element) {
			var $el = element[0];
			var card = new Card($el);
			$el.addEventListener('click', function(evt) {
				if(!card.expanded_)
					card.expand();
				else
					card.collapse();
			});
		}
	};
});

