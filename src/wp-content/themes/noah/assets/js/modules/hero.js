var Hero = function() {

	this.refresh = function() {
		this.scrolled = null;
		this.hasHero = $( 'body' ).is( '.has-hero' );
		this.adminBarHeight = $( '#wpadminbar' ).height();
		this.heroHeight = $( '.c-hero' ).outerHeight() || 0;
		this.borderWidth = parseInt( $( '.c-border' ).css( 'borderTopWidth' ), 10 );

		$( '.site-header' ).css( 'top', this.heroHeight );

	};

	this.refresh();
};

Hero.prototype.update = function( scrollY ) {

	if ( ! this.hasHero ) {
		return;
	}

	if ( this.scrolled !== true && scrollY > this.heroHeight ) {
		this.scrolled = true;
		$( 'body' ).addClass( 'is-scrolled' );
		return;
	}

	if ( this.scrolled !== false && scrollY <= this.heroHeight ) {
		this.scrolled = false;
		$( 'body' ).removeClass( 'is-scrolled' );
	}
};
