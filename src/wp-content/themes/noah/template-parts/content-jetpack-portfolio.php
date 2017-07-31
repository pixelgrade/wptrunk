<?php
/**
 * The template used for displaying project content on archives
 *
 * @package Noah
 * @since   Noah 1.0.0
 */

//we first need to know the bigger picture - the location this template part was loaded from
$location = pixelgrade_get_location( 'portfolio jetpack' );
?>

<article id="post-<?php the_ID(); ?>" <?php post_class() ?>>
	<div class="c-card">
		<div class="c-card__link">
            <div class="u-card-thumbnail-background">
                <a href="<?php the_permalink(); ?>" class="c-card__content-link c-card__frame">
                    <?php
                    // Output the featured image
                    the_post_thumbnail();

                    // Also output the markup for the hover image if we have it
                    // Make sure that we have the Featured Image component loaded
                    if ( function_exists( 'pixelgrade_featured_image_get_hover_id' ) ) {
                        $hover_image_id = pixelgrade_featured_image_get_hover_id();
                        if ( ! empty( $hover_image_id ) ) { ?>

                            <div class="c-card__frame-hover">
                                <?php echo wp_get_attachment_image( $hover_image_id, 'full' ); ?>
                            </div>

                        <?php }
                    } ?>
                </a>
            </div>
			<div class="c-card__content">
				<?php
				// Gather up all the meta we might need to display
				// But first initialize please
				$meta = array(
					'category' => false,
					'tags' => false,
					'author' => false,
					'date' => false,
					'comments' => false,
				);

				// And get the options
				$items_primary_meta = pixelgrade_option( 'portfolio_items_primary_meta', 'none' );
				$items_secondary_meta = pixelgrade_option( 'portfolio_items_secondary_meta', 'none' );

				if ( ( noah_portfolio_items_primary_meta_control_show() && 'category' == $items_primary_meta )
				     || ( noah_portfolio_items_secondary_meta_control_show() && 'category' == $items_secondary_meta ) ) {
					$portfolio_categories = get_the_terms( get_the_ID(), 'jetpack-portfolio-type' );
					$category             = "";
					if ( ! is_wp_error( $portfolio_categories ) && ! empty( $portfolio_categories ) ) {
						$category .= '<ul class="o-inline">' . PHP_EOL;
						foreach ( $portfolio_categories as $portfolio_category ) {
							$category .= '<li><a href="' . esc_url( get_category_link( $portfolio_category->term_id ) ) . '">' . $portfolio_category->name . '</a></li>' . PHP_EOL;
						};
						$category .= '</ul>' . PHP_EOL;
					}
					$meta['category'] = $category;
				}

				if ( ( noah_portfolio_items_primary_meta_control_show() && 'tags' == $items_primary_meta )
				     || ( noah_portfolio_items_secondary_meta_control_show() && 'tags' == $items_secondary_meta ) ) {
					$portfolio_tags = get_the_terms( get_the_ID(), 'jetpack-portfolio-tag' );
					$tags           = "";
					if ( ! is_wp_error( $portfolio_tags ) && ! empty( $portfolio_tags ) ) {
						$tags .= '<ul class="o-inline">' . PHP_EOL;
						foreach ( $portfolio_tags as $portfolio_tag ) {
							$tags .= '<li>' . $portfolio_tag->name . '</li>' . PHP_EOL;
						};
						$tags .= '</ul>' . PHP_EOL;
					}
					$meta['tags'] = $tags;
				}

				$meta['author'] = '<span class="byline">' . get_the_author() . '</span>';
				$meta['date']   = '<span class="posted-on">' . noah_date_link() . '</span>';

				$comments_number = get_comments_number(); // get_comments_number returns only a numeric value
				if ( comments_open() ) {
					if ( $comments_number == 0 ) {
						$comments = esc_html__( 'No Comments', 'noah' );
					} else {
						$comments = sprintf( _n( '%d Comment', '%d Comments', $comments_number, 'noah' ), $comments_number );
					}
					$meta['comments'] = '<a href="' . esc_url( get_comments_link() ) .'">' . esc_html( $comments ) . '</a>';
				} else {
					$meta['comments'] = '';
				}

				if ( noah_portfolio_items_primary_meta_control_show() && 'none' !== $items_primary_meta && ! empty( $meta[ $items_primary_meta ] ) ) {
					echo "<div class='c-card__meta h7'>" . $meta[ $items_primary_meta ] . "</div>";
				}

				if ( pixelgrade_option( 'portfolio_items_title_visibility', true ) ) { ?>
					<h2 class="c-card__title h5"><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
				<?php }

				if ( noah_portfolio_items_excerpt_visibility_control_show() && pixelgrade_option( 'portfolio_items_excerpt_visibility', false ) && get_the_excerpt() ) { ?>
					<div class="c-card__excerpt entry-content">
						<?php the_excerpt(); ?>
					</div>
				<?php }

				if ( noah_portfolio_items_secondary_meta_control_show() && 'none' !== $items_secondary_meta && ! empty( $meta[ $items_secondary_meta ] ) ) {
					echo '<div class="c-card__footer h7">' . $meta[ $items_secondary_meta ] . "</div>";
				} ?>
				<a class="c-card__content-link" href="<?php the_permalink(); ?>"></a>
			</div><!-- .c-card__content -->
		</div><!-- .c-card__link -->
	</div><!-- .c-card -->
</article><!-- #post-XX -->