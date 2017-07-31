var Overlay = (
	function() {
		var $overlay,
			$content,
			$close;

		init();

		function init() {

			$close = $( '<div class="c-overlay__close"></div>' );

			$overlay = $( '<div/>', {
				class: 'c-overlay u-container-sides-spacings js-header-height-padding-top'
			} );

			$content = $( '<div/>', {
				class: 'c-overlay__content u-content-width u-content-bottom-spacing entry-content content-area'
			} );

			$content.appendTo( $overlay );
			$overlay.appendTo( 'body' );
			$close.appendTo( 'body' );

			bindEvents();
		}

		function bindEvents() {

			$close.on( 'click', function() {
				hide();
			} );

			$content.on( 'click', function( e ) {
				e.stopPropagation();
			} );

			$overlay.on( 'click', function( e ) {
				hide();
			} );

			$( document ).on( 'keydown', function( evt ) {
				evt = evt || window.event;
				var isEscape = false;
				if ( "key" in evt ) {
					isEscape = (
					evt.key == "Escape" || evt.key == "Esc"
					);
				} else {
					isEscape = (
					evt.keyCode == 27
					);
				}
				if ( isEscape ) {
					hide();
				}
			} );
		}

		function setContent( html ) {
			$content.empty().html( html );
			$content.addClass( 'is-visible' );
		}

		function show() {
			$( 'body' ).addClass( 'has-overlay' ).css( 'overflow', 'hidden' );

			$overlay.addClass( 'is-visible' );
		}

		function hide() {
			$( 'body' ).removeClass( 'has-overlay' ).css( 'overflow', '' );

			$overlay.removeClass( 'is-visible' );
			$content.removeClass( 'is-visible' );
		}

		function load( url ) {

			Overlay.show();

			$.get( {
				url: url,
				success: function( result ) {
					var $content, title, content;

					$content = $( result ).find( '#main' );

					if ( typeof $content === "undefined" || ! $content.length ) {
						Overlay.hide();
						return;
					}

					title = $content.find( '.c-page-header__title' ).text();
					content = $content.find( '.entry-content' ).first().html();

					if ( title.length ) {
						content = '<div class="c-page-header__title h1 u-align-center">' + title + '</div>' + content;
					}

					if ( content.length ) {
						Overlay.setContent( content );
					} else {
						Overlay.hide();
					}
				}
			} );
		}

		return {
			show: show,
			hide: hide,
			load: load,
			setContent: setContent
		};

	}
)();
