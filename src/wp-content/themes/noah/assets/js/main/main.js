// let the magic begin!
var Noah = new pixelgradeTheme(),
	resizeEvent = "ontouchstart" in window && "onorientationchange" in window ? "pxg:orientationchange" : "pxg:resize";

//Noah.debug = true;

Noah.init = function() {

	Noah.Parallax = new Parallax( '.c-hero__background, .c-hero__background-mask', {
		bleed: 20,
		scale: 1.2,
		container: '.c-hero__background-mask'
	} );

	Noah.Parallax.disabled = "ontouchstart" in window && "onorientationchange" in window;

	Noah.Hero = new Hero();
	Noah.Navbar = new Navbar();

	// expose pixelgradeTheme API
	$.Noah = Noah;
};

Noah.update = function() {
	Noah.Hero.update( Noah.getScroll() );
	Noah.Navbar.update( Noah.getScroll() );

	if ( typeof Noah.Gallery !== "undefined" ) {
		Noah.Gallery.update( Noah.getScroll() + Noah.getWindowHeight() * 3 / 4 );
	}
};

Noah.adjustLayout = function() {
	Noah.log( "Noah.adjustLayout" );

	Noah.Navbar.destroy();

	if ( below( 'lap' ) ) {
		Noah.Navbar.init();
		Noah.Navbar.onChange();
	}

	$( '.c-hero' ).each( function( i, obj ) {
		var $hero = $( obj ),
			heroHeight = $hero.css( 'minHeight', '' ).css( 'height' );

		$hero.css( 'minHeight', heroHeight );
	} );

	// initialize or destroy slideshows
	if ( below( 'pad' ) || ( below( 'lap' ) && Util.isTouch && Noah.getOrientation() === 'landscape' ) ) {
		$( '.gallery' ).noahSlideshow( 'destroy' );
	} else {
		$( '.gallery' ).noahSlideshow();
	}

	Noah.Gallery = new Gallery();

	// use header height as spacing measure for specific elements
	var $updatable = $( '.js-header-height-padding-top, .c-navbar__content' ),
		headerHeight = $( '.c-navbar' ).outerHeight() || $( '.c-navbar__middle' ).outerHeight();

	// set padding top to certain elements which is equal to the header height
	$updatable.css( 'paddingTop', '' );
	$updatable.css( 'paddingTop', headerHeight );

	Noah.Hero.refresh();

	$( window ).trigger( 'rellax' );
};

Noah.handleContent = function( $container ) {
	Noah.log( "Noah.handleContent" );

	$container = typeof $container !== "undefined" ? $container : $( 'body' );

	unwrapImages( $container.find( '.entry-content' ) );
	wrapEmbeds( $container.find( '.entry-content' ) );
	wrapCommentActions( $container );
	handleVideos( $container );
	handleCustomCSS( $container );

	// add every image on the page the .is-loaded class
	// after the image has actually loaded
	$container.find( '.c-card, img' ).each( function( i, obj ) {
		var $each = $( obj );
		$each.imagesLoaded( function() {
			$each.addClass( 'is-loaded' );
		} );
	} );

	$container.find( '.gallery' ).each( function( i, obj ) {
		var $each = $( obj );
		$each.wrap( '<div class="u-full-width u-container-sides-spacings">' );
		$each.wrap( '<div class="o-wrapper u-container-width">' );
	} );

	$container.find( '.js-taxonomy-dropdown' ).resizeselect();

	Slider.init( $container.find( '.c-hero__slider' ) );

	Noah.Parallax.init( $container );
	Noah.Gallery = new Gallery( $container );

	Noah.eventHandlers( $container );

	if ( $( 'body' ).is( '.single-jetpack-portfolio' ) ) {
		var $share,
			$target = $container.find( '.js-share-target' );

		$container.find( '.js-share-clone' ).remove();
		$container.find( '.c-meta__share-link' ).clone().addClass( 'js-share-clone h4' ).appendTo( $target );
	}

	if ( $( '.sharedaddy' ).length == 0 ) {
		$( '.c-meta__share-link' ).remove();
	}
};

Noah.eventHandlersOnce = function() {
	Noah.log( "Noah.eventHandlersOnce" );

	var $body = $( 'body' );

	$( window ).on( resizeEvent, Noah.adjustLayout );
	$( window ).on( 'beforeunload', Noah.fadeOut );

	Noah.ev.on( 'render', Noah.update );

	$body.on( 'click', '.c-meta__share-link', function( e ) {
		e.preventDefault();

		var shareContent = $( '.sharedaddy' );

		if ( shareContent.length ) {
			Overlay.setContent( shareContent );
			shareContent.show();
			Overlay.show();
		}
	} );

	$body.on( 'click', '.menu-item.overlay a', function( e ) {
		var url = $( this ).attr( 'href' );

		if ( window.location.protocol !== this.protocol || window.location.hostname !== this.hostname ) {
			return;
		}

		stopEvent( e );

		Overlay.load( url );
	} );

	$body.on( 'click', '.gallery-item a img', function( e ) {
		stopEvent( e );
	} );
};

Noah.eventHandlers = function( $container ) {
	Noah.log( 'Noah.eventHandlers', $container );

	$container = typeof $container !== "undefined" ? $container : $( 'body' );

	$container.find( '.js-taxonomy-dropdown' ).on( 'change', function() {
		var destination = $( this ).val();
		if ( typeof destination !== "undefined" && destination !== "#" ) {
			if ( typeof Noah.Ajax !== "undefined" && typeof Barba !== "undefined" && Barba.hasOwnProperty( "Pjax" ) ) {
				Barba.Pjax.goTo( destination );
			} else {
				window.location.href = destination;
			}
		}
	} );
};

Noah.initializeAjax = function() {
	Noah.log( 'Noah.initializeAjax' );

	var $body = $( 'body' );

	if ( $body.is( '.customizer-preview' ) || typeof $body.data( 'ajaxloading' ) === "undefined" ) {
		return;
	}

	Noah.Ajax = new AjaxLoading();

	Noah.Ajax.ev.on( 'beforeOut', function( ev, container ) {
		Noah.Parallax.destroy();
		Noah.Navbar.close();
		Noah.fadeOut();
	} );

	Noah.Ajax.ev.on( 'afterOut', function( ev, container ) {
		$( 'html' ).addClass( 'no-transitions' );
	} );

	Noah.Ajax.ev.on( 'afterIn', function( ev, container ) {

		var $container = $( container ).css( 'top', 100 );

		Util.reload_js( 'related-posts.js' );

		setTimeout( function() {
			$( 'html' ).removeClass( 'no-transitions' );
			$container.css( 'top', '' );
			Noah.handleContent( $container );
			Noah.adjustLayout();
			Noah.update();
			Noah.fadeIn();
		}, 0 );

	} );
};

Noah.fadeOut = function() {
	Noah.log( 'Noah.fadeOut' );

	$( 'html' ).removeClass( 'fade-in' ).addClass( 'fade-out' );

	Overlay.hide();
};

Noah.fadeIn = function() {
	Noah.log( 'Noah.fadeIn' );

	$( 'html' ).removeClass( 'fade-out no-transitions' ).addClass( 'fade-in' );
};

Noah.init();

$( document ).ready( function() {
	Noah.initializeAjax();
	Noah.handleContent();
	Noah.adjustLayout();
	Noah.eventHandlersOnce();
	Noah.update();
	Noah.fadeIn();
} );
