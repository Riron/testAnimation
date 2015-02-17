angular.module('starter.controllers')

.directive('ocMaterial', function() {
	return {
		priority: 1001,
		restrict: 'EA',
		link: function(scope, element) {
			var expanded_ = false;
			var $el = element[0];
			var elements_ = {
				root: $el,
				title: $el.querySelector('h2'),
				image: $el.querySelector('img'),
				content: $el.querySelector('p')
			};
			
			$el.addEventListener('click', function(evt) {
				if(!expanded_){
					expanded_ = true;
					for(var index in elements_) {
						// Get the first position.
						var first = elements_[index].getBoundingClientRect();

						// Now set the element to the last position.
						elements_[index].classList.add('item--expanded');

						// Read again. This forces a sync layout, so be careful.
						var last = elements_[index].getBoundingClientRect();

						// Invert.
						var invertHeight = first.top - last.top;
						var invertWidth = first.left - last.left;
						var invertScale = first.height / last.height;
						
						elements_[index].style.transform = 'translateY(' + invertHeight + 'px) translateX(' + invertWidth + 'px)';
						if(index == 'image') {
							elements_[index].style.transform += 'scale(' + invertScale + ')';
						}
					};
				}
				else {
					expanded_ = false;
					for(var index in elements_) {
						elements_[index].classList.remove('item--expanded');
						elements_[index].style.transform = '';
					}
				}
			});

			

			
			

			
		}
	};
});