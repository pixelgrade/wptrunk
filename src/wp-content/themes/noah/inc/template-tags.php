<?php
/**
 * Custom template tags for this theme and functions that will result in html output.
 *
 * Eventually, some of the functionality here could be replaced by core features.
 *
 * @package Noah
 */

if ( ! function_exists( 'noah_get_cats_list' ) ) {

	/**
	 * Returns HTML with comma separated category links
	 *
	 * @since Noah 1.0
	 *
	 * @param int|WP_Post $post_ID Optional. Post ID or post object.
	 *
	 * @return string
	 */
	function noah_get_cats_list( $post_ID = null ) {

		//use the current post ID is none given
		if ( empty( $post_ID ) ) {
			$post_ID = get_the_ID();
		}

		//obviously pages don't have categories
		if ( 'page' == get_post_type( $post_ID ) ) {
			return '';
		}

		$cats = '';
		/* translators: used between list items, there is a space after the comma */
		$categories_list = get_the_category_list( esc_html__( ', ', 'noah' ), '', $post_ID );
		if ( $categories_list && noah_categorized_blog() ) {
			$cats = '<span class="cat-links">' . $categories_list . '</span>';
		}

		return $cats;

	} #function

}

if ( ! function_exists( 'noah_cats_list' ) ) {

	/**
	 * Prints HTML with comma separated category links
	 *
	 * @since Noah 1.0
	 *
	 * @param int|WP_Post $post_ID Optional. Post ID or post object.
	 */
	function noah_cats_list( $post_ID = null ) {

		echo noah_get_cats_list( $post_ID );

	} #function

}

if ( ! function_exists( 'noah_the_first_category' ) ) {
	/**
	 * Prints an anchor of the first category of post
	 *
	 * @since Noah 1.0
	 *
	 * @param int|WP_Post $post_ID Optional. Post ID or post object.
	 * @param string $tag_class Optional. A CSS class that the tag will receive.
	 */
	function noah_the_first_category( $post_ID = null, $tag_class = '' ) {

		$categories = get_the_category();

		if ( empty( $categories ) ) {
			return;
		}
		$category = $categories[0];

		$class_markup = null;

		if ( '' !== $tag_class ) {
			$class_markup = 'class="' . $tag_class . '" ';
		}
		echo '<a ' . $class_markup . 'href="' . esc_url( get_category_link( $category->term_id ) ) . '" title="' . esc_attr( $category->name ) . '">' . $category->name . '</a>';

	} #function
}

if ( ! function_exists( 'noah_the_older_projects_button' ) ) {
	/**
	 * Prints an anchor to the second page of the jetpack-portfolio archive
	 *
	 * @param WP_Query $query Optional.
	 */
	function noah_the_older_projects_button( $query = null ) {
		$older_posts_link = noah_paginate_url( wp_make_link_relative( get_post_type_archive_link( 'jetpack-portfolio' ) ), 2, false, $query );

		if ( ! empty( $older_posts_link ) ) : ?>

			<nav class="navigation posts-navigation" role="navigation">
				<h2 class="screen-reader-text"><?php esc_html_e( 'Projects navigation', 'noah' ); ?></h2>
				<div class="nav-links">
					<div class="nav-previous">
						<a href="<?php echo esc_url( $older_posts_link ); ?>"><?php esc_html_e( 'Older projects', 'noah' ); ?></a>
					</div>
				</div>
			</nav>
		<?php endif;
	} #function
}

if ( ! function_exists( 'noah_the_taxonomy_dropdown' ) ) {

	function noah_the_taxonomy_dropdown( $taxonomy, $selected = '' ) {
		$output = '';

		$id = $taxonomy . '-dropdown';

		$terms = get_terms( $taxonomy );

		$taxonomy_obj = get_taxonomy( $taxonomy );
		// bail if we couldn't get the taxonomy object or other important data
		if ( empty( $taxonomy_obj ) || empty( $taxonomy_obj->object_type ) ) {
			return false;
		}

		// get the first post type
		$post_type = reset( $taxonomy_obj->object_type );
		// get the post type's archive URL
		$archive_link = get_post_type_archive_link( $post_type );

		$output .= '<select class="taxonomy-select js-taxonomy-dropdown" name="' . esc_attr( $id ) . '" id="' . esc_attr( $id ) . '">';

		$selected_attr = '';
		if ( empty( $selected ) ) {
			$selected_attr = 'selected';
		}
		$output .= '<option value="' . esc_attr( $archive_link ) . '" ' . esc_attr( $selected_attr ) . '>' . esc_html__( 'Everything', 'noah' ) . '</option>';

		foreach ( $terms as $term ) {
			$selected_attr = '';
			if ( ! empty( $selected ) && $selected == $term->slug ) {
				$selected_attr = 'selected';
			}
			$output .= '<option value="' . esc_attr( get_term_link( intval( $term->term_id ), $taxonomy ) ) . '" ' . esc_attr( $selected_attr ) . '>' . esc_html( $term->name ) . '</option>';
		}
		$output .= '</select>';

		// Allow others to have a go at it
		$output = apply_filters( 'noah_the_taxonomy_dropdown', $output, $taxonomy, $selected );

		// Display it
		echo $output;
	} #function
}

if ( ! function_exists( 'noah_maybe_read_more' ) ) {
	/**
	 * Handle the case when there is a <!-- more --> tag in the content
	 */
	function noah_maybe_read_more() {
		$temp_post     = get_post();
		$content_parts = get_extended( $temp_post->post_content );
		if ( ! empty( $content_parts['extended'] ) ) {
			// This means there is a read more tag in the content
			$more_link_text = sprintf(
				'<span aria-label="%1$s">%2$s</span>',
				sprintf(
				/* translators: %s: Name of current post */
					__( 'Continue reading %s', 'noah' ),
					the_title_attribute( array( 'echo' => false ) )
				),
				__( '(more&hellip;)', 'noah' )
			);
			if ( ! empty( $content_parts['mote_text'] ) ) {
				$more_link_text = strip_tags( wp_kses_no_null( trim( $content_parts['mote_text'] ) ) );
			}
			echo apply_filters( 'the_content_more_link', ' <a href="' . get_permalink() . "#more-{$temp_post->ID}\" class=\"more-link\">$more_link_text</a>", $more_link_text );
		}
	}
}

if ( ! function_exists( 'noah_is_blog' ) ) :
/**
 * Check if we are on blog
 */
function noah_is_blog() {
	global $post;
	$posttype = get_post_type( $post );

	return ( ( is_archive() || is_author() || is_category() || is_home() || is_single() || is_tag() ) && ( $posttype == 'post' ) ) ? true : false;
}
endif;

if ( ! function_exists( 'noah_the_comments_navigation' ) ) :
	/**
	 * Display navigation to next/previous comments when applicable.
	 *
	 * @since Noah 1.0
	 */
	function noah_the_comments_navigation() {
		// Are there comments to navigate through?
		if ( get_comment_pages_count() > 1 && get_option( 'page_comments' ) ) :
			?>
			<nav class="navigation comment-navigation" role="navigation">
				<h2 class="screen-reader-text"><?php esc_html_e( 'Comment navigation', 'noah' ); ?></h2>
				<div class="nav-links">
					<?php
					if ( $prev_link = get_previous_comments_link( esc_html__( 'Older Comments', 'noah' ) ) ) :
						printf( '<div class="c-btn nav-previous">%s</div>', $prev_link );
					endif;

					if ( $next_link = get_next_comments_link( esc_html__( 'Newer Comments', 'noah' ) ) ) :
						printf( '<div class="c-btn nav-next">%s</div>', $next_link );
					endif;
					?>
				</div><!-- .nav-links -->
			</nav><!-- .comment-navigation -->
			<?php
		endif;
	}
endif;

/**
 * Displays the navigation to next/previous post, when applicable.
 *
 * @param array $args Optional. See get_the_post_navigation() for available arguments.
 *                    Default empty array.
 */
function noah_the_post_navigation( $args = array() ) {
	echo noah_get_the_post_navigation( $args );
}

/**
 * Retrieves the navigation to next/previous post, when applicable.
 *
 * @param array $args {
 *     Optional. Default post navigation arguments. Default empty array.
 *
 * @type string $prev_text Anchor text to display in the previous post link. Default '%title'.
 * @type string $next_text Anchor text to display in the next post link. Default '%title'.
 * @type bool $in_same_term Whether link should be in a same taxonomy term. Default false.
 * @type array|string $excluded_terms Array or comma-separated list of excluded term IDs. Default empty.
 * @type string $taxonomy Taxonomy, if `$in_same_term` is true. Default 'category'.
 * @type string $screen_reader_text Screen reader text for nav element. Default 'Post navigation'.
 * }
 * @return string Markup for post links.
 */
function noah_get_the_post_navigation( $args = array() ) {
	$args = wp_parse_args( $args, array(
		'prev_text'          => '%title',
		'next_text'          => '%title',
		'in_same_term'       => false,
		'excluded_terms'     => '',
		'taxonomy'           => 'category',
		'screen_reader_text' => esc_html__( 'Post navigation', 'noah' ),
	) );

	$navigation = '';

	$previous = get_previous_post_link(
		'<div class="nav-previous"><span class="h3 nav-previous-title">%link</span>' . '<span class="h7 u-color-accent">' . esc_html__( 'Previous', 'noah' ) . '</span></div>',
		$args['prev_text'],
		$args['in_same_term'],
		$args['excluded_terms'],
		$args['taxonomy']
	);

	$next = get_next_post_link(
		'<div class="nav-next"><span class="h3 nav-next-title">%link</span>' . '<span class="h7 u-color-accent">' . esc_html__( 'Next', 'noah' ) . '</span></div>',
		$args['next_text'],
		$args['in_same_term'],
		$args['excluded_terms'],
		$args['taxonomy']
	);

	// Only add markup if there's somewhere to navigate to.
	if ( $previous || $next ) {
		$navigation = _navigation_markup( $previous . $next, 'post-navigation', $args['screen_reader_text'] );
	}

	return $navigation;
}

function noah_the_author_info_box() {
	echo noah_get_the_author_info_box();
}

function noah_get_the_author_info_box() {

	global $post;

	$author_details = '';

	// Detect if it is a single post with a post author
	if ( is_single() && isset( $post->post_author ) ) {

		// Get author's display name
		$display_name = get_the_author_meta( 'display_name', $post->post_author );

		// If display name is not available then use nickname as display name
		if ( empty( $display_name ) ) {
			$display_name = get_the_author_meta( 'nickname', $post->post_author );
		}

		// Get author's biographical information or description
		$user_description = get_the_author_meta( 'user_description', $post->post_author );


		if ( ! empty( $user_description ) ) {
			$author_details .= '<div class="c-author  has-description" itemscope itemtype="http://schema.org/Person">';
		} else {
			$author_details .= '<div class="c-author" itemscope itemtype="http://schema.org/Person">';
		}

		// Get link to the author archive page
		$user_posts = get_author_posts_url( get_the_author_meta( 'ID', $post->post_author ) );

		$author_avatar = get_avatar( get_the_author_meta( 'user_email' ), 100 );

		if ( ! empty( $author_avatar ) ) {
			$author_details .= '<div class="c-author__avatar">' . $author_avatar . '</div>';
		}

		$author_details .= '<div class="c-author__details">';

		if ( ! empty( $display_name ) ) {
			$author_details .= '<span class="c-author__label h7">' . esc_html__( 'Posted by', 'noah' ) . '</span>';
			$author_details .= '<span class="c-author__name h2">' . $display_name . '</span>';
		}

		// Author avatar and bio
		if ( ! empty( $user_description ) ) {
			$author_details .= '<p class="c-author__description" itemprop="description">' . nl2br( $user_description ) . '</p>';
		}

		$author_details .= '<div class="o-inline o-inline-xs h7">';

		$author_details .= '<a class="_color-inherit" href="' . esc_url( $user_posts ) . '" rel="author" title="' . esc_attr( sprintf( __( 'View all posts by %s', 'noah' ), get_the_author() ) ) . '">' . esc_html__( 'All posts', 'noah' ) . '</a>';

		$author_details .= noah_get_author_bio_links();

		$author_details .= '</div>';
		$author_details .= '</div><!-- .c-author__details -->';
		$author_details .= '</div><!-- .c-author -->';
	}

	return $author_details;
}

if ( ! function_exists( 'noah_get_author_bio_links' ) ) :
	/**
	 * Return the markup for the author bio links.
	 * These are the links/websites added by one to it's Gravatar profile
	 *
	 * @param int|WP_Post $post_id Optional. Post ID or post object.
	 * @return string The HTML markup of the author bio links list.
	 */
	function noah_get_author_bio_links( $post_id = null ) {
		$post = get_post( $post_id );
		$markup = '';
		if ( empty( $post ) ) {
			return $markup;
		}

		// Get author's website URL
		$user_website = get_the_author_meta( 'url', $post->post_author );

		$str = wp_remote_fopen( 'https://www.gravatar.com/' . md5( strtolower( trim( get_the_author_meta( 'user_email' ) ) ) ) . '.php' );
		$profile = unserialize( $str );
		if ( is_array( $profile ) && ! empty( $profile['entry'][0]['urls'] ) ) {
			$markup .= '<div class="c-author__links o-inline o-inline-s u-color-accent">' . PHP_EOL;
			foreach ( $profile['entry'][0]['urls'] as $link ) {
				if ( ! empty( $link['value'] ) && ! empty( $link['title'] ) ) {
					$markup .= '<a class="c-author__social-link" href="' . esc_url( $link['value'] ) . '" target="_blank">' . $link['title'] . '</a>' . PHP_EOL;
				}
			}
			$markup .= '</div><!-- .c-author__links -->' . PHP_EOL;
		} elseif ( ! empty( $user_website ) ) {
			$markup .= '<div class="c-author__links o-inline o-inline-s u-color-accent">' . PHP_EOL;
			$markup .= '<a class="c-author__social-link" href="' . esc_url( $user_website ) . '" target="_blank">' . esc_html__( 'Website', 'noah' ) . '</a>' . PHP_EOL;
			$markup .= '</div><!-- .c-author__links -->' . PHP_EOL;
		}

		return $markup;
	} #function
endif;

if ( ! function_exists( 'noah_posted_on' ) ) :
	/**
	 * Prints HTML with meta information for the current post-date/time and author.
	 */
	function noah_posted_on() {

		echo '<span class="posted-on">' . noah_date_link() . '</span>';
	}
endif;

if ( ! function_exists( 'noah_date_link' ) ) :
	/**
	 * Prints HTML with meta information for the current post-date/time and author.
	 */
	function noah_date_link() {
		$time_string = '<time class="entry-date published updated" datetime="%1$s">%2$s</time>';
		if ( get_the_time( 'U' ) !== get_the_modified_time( 'U' ) ) {
			$time_string = '<time class="entry-date published" datetime="%1$s">%2$s</time><time class="updated" hidden datetime="%3$s">%4$s</time>';
		}

		$time_string = sprintf( $time_string,
			get_the_date( DATE_W3C ),
			get_the_date(),
			get_the_modified_date( DATE_W3C ),
			get_the_modified_date()
		);

		// Wrap the time string in a link, and preface it with 'Posted on'.
		return sprintf(
		/* translators: %s: post date */
			__( '<span class="screen-reader-text">Posted on</span> %s', 'noah' ),
			'<a href="' . esc_url( get_permalink() ) . '" rel="bookmark">' . $time_string . '</a>'
		);
	} #function
endif;

if ( ! function_exists( 'noah_single_entry_footer' ) ) :
	/**
	 * Prints HTML with meta information for the categories, tags, Jetpack likes, shares, related, and comments.
	 */
	function noah_single_entry_footer() {
		edit_post_link( esc_html__( 'Edit', 'noah' ), '<span class="edit-link">', '</span>' );
	} #function
endif;