var Navbar = function () {

    var _this = this;

    _this.initialized = false;

    _this.bindEvents = function() {
        _this.$handle.on( 'change', function(e) {
            _this.onChange();
        });
    };

    _this.unbindEvents = function() {
        _this.$handle.off( 'change' );
    };

	_this.open = function() {
	    _this.$handle.prop( 'checked', true );
	    _this.$handle.trigger( 'change' );
	};

	_this.close = function() {
	    _this.$handle.prop( 'checked', false );
	    _this.$handle.trigger( 'change' );
	};

	_this.init();
};

Navbar.prototype.onChange = function() {
	var $body = $( 'body' );
	$body.attr( 'style', '' );

	if ( this.$handle.prop( 'checked' ) ) {
		$body.width( $body.width() );
		$body.css( 'overflow', 'hidden' );
	} else {
		$body.attr( 'style', '' );
	}
};

Navbar.prototype.init = function() {
    this.$handle = $( '#menu-toggle' );
    this.heroHeight = $('.c-hero').first().outerHeight();

    if ( this.initialized ) {
        this.headerHeight = this.$clone.outerHeight();
        return;
    }

    $( '.js-share-clone' ).remove();

    this.$navbar = $( '.c-navbar' );
	this.$logo = $( '.c-branding' ).closest( '.c-navbar__zone' ).addClass( 'c-navbar__zone--branding' );
    this.$share = $( '.c-meta__share-link:not(.c-meta__share-link--desktop)' );
	this.$clone = this.$logo.clone().css( 'overflow', 'hidden' ).addClass( 'mobile-logo-clone' );
	this.$clone.find( 'img' ).addClass( 'is-loaded' );
	this.$logo = $( '.c-branding' ).closest( '.c-navbar__zone' ).addClass( 'c-navbar__zone--branding' );

	if ( ! $( '.c-navbar__zone' ).filter( function() {
		var $obj = $( this );
		return ! $obj.is( '.c-navbar__zone--branding' ) && !! $obj.children().length;
	} ).length ) {
		$( '.c-navbar__label' ).hide();
	}

	if ( below( 'pad' ) || (
            below( 'lap' ) && Util.isTouch && window.innerWidth > window.innerHeight
        ) && this.$share.length ) {
        this.$target = this.$clone.wrapInner( "<div class='c-navbar__slide'></div>" ).children();
        this.$share.clone().addClass( 'js-share-clone' ).appendTo( this.$target );
    }

    this.$clone.appendTo( this.$navbar );

    this.headerHeight = this.$clone.outerHeight();

    this.unbindEvents();
    this.bindEvents();

    this.initialized = true;
};

Navbar.prototype.update = function( scrollY ) {

    if ( ! this.initialized || typeof this.$target === "undefined" || scrollY < 0
         || ! $( 'body' ).hasClass( 'single-jetpack-portfolio' )
         || this.$share.length == 0 ) {
        return;
    }

    if ( scrollY < this.heroHeight ) {
        this.$target.css( 'transform', 'translate3d(0,0,0)' );
        return;
    }

    if ( scrollY < this.heroHeight + this.headerHeight ) {
        this.$target.css( 'transform', 'translate3d(0,' + ( this.heroHeight - scrollY ) + 'px,0)' );
        return;
    }

    this.$target.css( 'transform', 'translate3d(0,' + -this.headerHeight + 'px,0)' );
};

Navbar.prototype.destroy = function() {
    if ( ! this.initialized ) {
        return;
    }

    if ( typeof this.$clone !== "undefined" ) {
        this.$clone.remove();
    }

    this.unbindEvents();
    this.initialized = false;
};
