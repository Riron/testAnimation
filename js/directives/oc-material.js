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
		container: el.querySelector('.item'),
		image: el.querySelector('.item-image'),
		title: el.querySelector('.item-title'),
		subtitle: el.querySelector('.item-subtitle'),
		content: el.querySelector('.item-content')
	};
	this.expanded_ = false;
	this.boxPositionOnExpand_ = null;

	this.parts_ = Object.keys(this.elements_);
	this.properties_ = ['left', 'top', 'width', 'height', 'scaleX', 'scaleY', 'opacity'];

	this.collapsedPositions_ = makeObject(this.parts_, null);
  	this.expandedPositions_ = makeObject(this.parts_, null);
	this.diffs_ = {
		root: makeObject(this.properties_, 0),
		container: makeObject(this.properties_, 0),
		title: makeObject(this.properties_, 0),
		image: makeObject(this.properties_, 0),
		subtitle: makeObject(this.properties_, 0),
		content: makeObject(this.properties_, 0)
	};

	this.onCollapseTransitionEnd_ = this.onCollapseTransitionEnd_.bind(this);
	this.onExpandTransitionEnd_ = this.onExpandTransitionEnd_.bind(this);
}

Card.prototype.expand = function() {
	this.boxPositionOnExpand_ = this.elements_.root.getBoundingClientRect();
	this.expanded_ = true;

	// Read the viewport position of the card and elements.
    this.collectProperties_(this.collapsedPositions_);

    // Set the expanded class
    this.elements_.root.classList.add('card--expanded');
    this.elements_.container.classList.add('card__container--scrollable');

    // CHROME FIX: When we scroll, the content musnt be sticked on top=0
	// https://code.google.com/p/chromium/issues/detail?id=20574 
	if(this.expanded_) {
		var scrollTop = document.getElementsByClassName('scroll-content')[0].scrollTop;
		this.elements_['container'].style.top = scrollTop + 'px';
	}
	else {
		this.elements_['container'].style.top = 0;
	}

    // Read them in their expanded positions.
    this.collectProperties_(this.expandedPositions_);

    // Calculate the position differences.
    this.calculatePositionDiffs_();

    // Set them all back to collapsed.
    this.setElementTransformsToStartAndClipToCollapsed_();

    // Read again to force the style change to take hold.
    var readValue2 = this.elements_.root.offsetTop;

	// Switch on animations.
    this.elements_.root.classList.add('card--animatable');

    // Now expand.
    this.setElementTransformsToZeroAndClipToExpanded_();

    this.elements_.container.addEventListener('transitionend', this.onExpandTransitionEnd_);
    this.elements_.container.addEventListener('webkittransitionend', this.onExpandTransitionEnd_);
}

Card.prototype.collapse = function() {
	this.applyClipRect_();

    this.elements_.container.classList.remove('card__container--scrollable');
    this.elements_.root.classList.add('card--collapsing');
    this.elements_.root.classList.add('card--animatable');

	this.setElementTransformsToStartAndClipToCollapsed_();


	this.elements_.content.addEventListener('transitionend', this.onCollapseTransitionEnd_);
    this.elements_.content.addEventListener('webkittransitionend', this.onCollapseTransitionEnd_);
}

Card.prototype.collectProperties_ =  function(target) {
	var part, rect;
	for (var p = 0; p < this.parts_.length; p++) {
		part = this.parts_[p];
		rect = this.elements_[part].getBoundingClientRect();

		// We need to make a copy here because the gBCR call
		// gives us an immutable object.
		target[part] = {
			left: rect.left,
			top: rect.top,
			width: rect.width,
			height: rect.height,
			right: rect.right,
			bottom: rect.bottom
		};

		target[part].opacity = parseFloat(window.getComputedStyle(
		  this.elements_[part]).opacity);

		// We need to limit the size for browsers that
		// allow bleed past the edge of the viewport.
		target[part].width = Math.min(target[part].width, window.innerWidth);
		target[part].height = Math.min(target[part].height, window.innerHeight);
	}
}

Card.prototype.calculatePositionDiffs_ = function() {
	var part;
	for (var p = 0; p < this.parts_.length; p++) {
		part = this.parts_[p];

		this.diffs_[part].left = this.collapsedPositions_[part].left - this.expandedPositions_[part].left;
		this.diffs_[part].top = this.collapsedPositions_[part].top - this.expandedPositions_[part].top;
		this.diffs_[part].width = this.collapsedPositions_[part].width - this.expandedPositions_[part].width;
		this.diffs_[part].height = this.collapsedPositions_[part].height - this.expandedPositions_[part].height;
		this.diffs_[part].scaleX = this.collapsedPositions_[part].width / this.expandedPositions_[part].width;
		this.diffs_[part].scaleY = this.collapsedPositions_[part].height / this.expandedPositions_[part].height;
		if (part === 'title' && this.preventChangesToTitleScale_)
			this.diffs_[part].scaleX = this.diffs_[part].scaleY = 1;
		this.diffs_[part].opacity = 1 - (this.expandedPositions_[part].opacity - this.collapsedPositions_[part].opacity);
	}
}

Card.prototype.setElementTransformsToStartAndClipToCollapsed_ = function() {
	// Work out if the root element has moved and adjust
	// the values for the animation correspondingly.
	var currentBoxPosition = this.elements_.root.getBoundingClientRect();
	var leftDifference = currentBoxPosition.left - this.boxPositionOnExpand_.left;
	var topDifference = currentBoxPosition.top - this.boxPositionOnExpand_.top;

	var part;
	for (var p = 0; p < this.parts_.length; p++) {
		part = this.parts_[p];

		// We don't need or want to move the container or the root
		// element during this animation so ignore them.
		if (part === 'container' || part === 'root')
			continue;

		// Adjust for changes in scroll position since the card expanded.
		this.diffs_[part].top += topDifference;
		this.diffs_[part].left += leftDifference;

		this.setElementTransformAndOpacity_(this.elements_[part], this.diffs_[part], this.diffs_[part].opacity);
	}

	var clipLeft = this.collapsedPositions_.container.left + leftDifference;
	var clipRight = this.collapsedPositions_.container.right + leftDifference;
	var clipTop = this.collapsedPositions_.container.top + topDifference;
	var clipBottom = this.collapsedPositions_.container.bottom + topDifference;

	// Ionic Fix - .has-header introduce a top: 44px property that reflects in here 
	var top = clipTop - 44;
	this.elements_.container.style.clip = 'rect(' +
		top + 'px, ' +
		clipRight + 'px, ' +
		clipBottom + 'px, ' +
		clipLeft + 'px)';
}

Card.prototype.setElementTransformsToZeroAndClipToExpanded_ = function() {
	var part;
	for (var p = 0; p < this.parts_.length; p++) {
		part = this.parts_[p];

		if (part === 'container' && !this.runLoFiAnimations_)
		continue;

		if (part === 'root')
		continue;

		this.setElementTransformAndOpacity_(this.elements_[part], 'translate(0,0) scale(1)', this.expandedPositions_[part].opacity);
	}

	// Ionic Fix - .has-header introduce a top: 44px property that reflects in here 
	var top = this.expandedPositions_.container.top - 44;
	this.elements_.container.style.clip = 'rect(' +
		top + 'px, ' +
		this.expandedPositions_.container.right + 'px, ' +
		this.expandedPositions_.container.bottom + 'px, ' +
		this.expandedPositions_.container.left + 'px)';
}

Card.prototype.setElementTransformAndOpacity_ = function(element, transform, opacity) {
	var transformString = transform;

	if (typeof transform !== 'string') {
		transformString = 'translate(' + transform.left + 'px,' + transform.top + 'px)';

		if (element !== this.elements_.content && element !== this.elements_.content)
			transformString += ' scale(' + transform.scaleX + ', ' + transform.scaleY + ')';
	}

	element.style.webkitTransform = transformString;
	element.style.transform = transformString;

	if (typeof opacity !== 'undefined')
		element.style.opacity = opacity;
}

Card.prototype.onExpandTransitionEnd_ = function(evt) {
	if (typeof evt !== 'undefined' && evt.target !== this.elements_.container)
		return;

	this.elements_.container.classList.add('card__container--scrollable');
	this.elements_.root.classList.remove('card--animatable');

	this.resetElementTransformsAndOpacity_();
	this.resetElementClip_();

	this.elements_.container.removeEventListener('transitionend', this.onExpandTransitionEnd_);
	this.elements_.container.removeEventListener('webkittransitionend', this.onExpandTransitionEnd_);

	//this.enableTabbingToLinksAndFocusBackButton_();
}

Card.prototype.onCollapseTransitionEnd_ = function(evt) {
    if (typeof evt !== 'undefined' && evt.target !== this.elements_.content)
		return;

    this.expanded_ = false;
    this.elements_.root.classList.remove('card--expanded');
    this.elements_.root.classList.remove('card--collapsing');
    this.elements_.root.classList.remove('card--animatable');

    this.resetElementTransformsAndOpacity_();
    this.resetElementClip_();

    // CHROME FIX
    this.elements_['container'].style.top = 0;

    this.elements_.content.removeEventListener('transitionend', this.onCollapseTransitionEnd_);
    this.elements_.content.removeEventListener('webkittransitionend', this.onCollapseTransitionEnd_);

    //this.disableTabbingToLinks_();
}

Card.prototype.resetElementTransformsAndOpacity_ = function() {
	var part;
	for (var p = 0; p < this.parts_.length; p++) {
		part = this.parts_[p];
		this.setElementTransformAndOpacity_(this.elements_[part], '', '');
	}
}

Card.prototype.resetElementClip_ = function() {
	this.elements_.container.style.clip = '';
}

Card.prototype.applyClipRect_ = function() {
	if (!this.expanded_)
		return;

	var contentLocation = this.elements_.container.getBoundingClientRect();

	this.elements_.container.style.clip = 'rect(0, ' +
		contentLocation.width + 'px, ' +
		contentLocation.height + 'px, 0)';
}

/****
Directive
*****/
angular.module('starter.controllers')
.directive('ocMaterial', function($ionicNavBarDelegate) {
	return {
		priority: 1001,
		restrict: 'EA',
		link: function(scope, element) {
			var $el = element[0];
			var card = new Card($el);
			var title = $ionicNavBarDelegate.title();
			$el.addEventListener('click', function(evt) {
				if(!card.expanded_) {
					card.expand();
					$ionicNavBarDelegate.title('subpage');
					$ionicNavBarDelegate.showBackButton(false);
				}
				else {
					card.collapse();
					$ionicNavBarDelegate.title(title);
				}
			});
		}
	};
});

