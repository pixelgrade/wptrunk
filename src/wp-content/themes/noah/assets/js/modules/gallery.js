var Gallery = function( $container ) {

	var _this = this;

	_this.$el = $();

	$container = typeof $container !== "undefined" ? $container : $( 'body' );

	$container.find( '.c-gallery' ).each( function( i, obj ) {
		var $gallery = $( obj );

		if ( ! $gallery.children().length ) {
			return;
		}

		_this.$el = _this.$el.add( $gallery );

		$gallery.data( 'offset', $gallery.offset() );

		$gallery.imagesLoaded( function() {
			_this.refresh( $gallery );
		} );
	} );
};

Gallery.prototype.update = function( trigger ) {
	var _this = this;

	_this.$el.each( function( i, obj ) {
		var $gallery = $( obj ),
			offset = $gallery.data( 'offset' );

		if ( trigger > offset.top ) {
			_this.show( $gallery );
		}
	} );
};

Gallery.prototype.show = function( $gallery ) {

	$gallery.find( '.c-card' ).each( function( i, obj ) {
		var $this = $( obj );

		if ( typeof $this.data( 'is-visible' ) !== "undefined" && $this.data( 'is-visible' ) ) {
			return;
		}

		$this.data( 'is-visible', true );

		setTimeout( function() {
			$this.imagesLoaded( function() {
				requestAnimationFrame( function() {
					$this.addClass( 'is-visible' );
				} );
			} );
		}, i * 100 );
	} );

};

Gallery.prototype.refresh = function( $galleries ) {
	var _this = this;

	if ( typeof $galleries === "undefined" ) {
		$galleries = _this.$el;
	}

	$galleries.each( function( i, obj ) {

		var $gallery = $( obj );

		if ( ! $gallery.is( '.js-masonry' ) ) {
			return;
		}

		var minWidth = $gallery.children()[0].getBoundingClientRect().width;

		$gallery.children().each( function() {
			var width = this.getBoundingClientRect().width;

			if ( width < minWidth ) {
				minWidth = width;
			}
		} );


		$gallery.masonry( {
			isAnimated: false,
			columnWidth: minWidth
		} );

	} );

};
