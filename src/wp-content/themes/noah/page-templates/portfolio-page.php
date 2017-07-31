<?php
/**
 * Template Name: Portfolio
 *
 * @package Noah
 */

//let the template parts know about our location
$location = pixelgrade_set_location( 'page portfolio-page' );

get_header(); ?>

<?php
/**
 * pixelgrade_before_main_content hook.
 *
 * @hooked nothing() - 10 (outputs nothing)
 */
do_action( 'pixelgrade_before_main_content', $location );
?>

	<div id="primary" data-section-name="<?php echo get_post_field( 'post_name', get_post() ); ?>"
	     class="content-area  u-side-padding">
		<main id="main" class="site-main" role="main">

			<?php
			/**
			 * pixelgrade_before_loop hook.
			 *
			 * @hooked noah_custom_page_css - 10 (outputs the page's custom css)
			 */
			do_action( 'pixelgrade_before_loop', $location );
			?>

			<?php while ( have_posts() ) : the_post(); ?>

				<article id="post-<?php the_ID(); ?>" <?php post_class( 'c-article' ); ?>>

					<?php
					/**
					 * pixelgrade_before_entry_title hook.
					 *
					 * @hooked pixelgrade_the_hero() - 10 (outputs the hero markup)
					 */
					do_action( 'pixelgrade_before_entry_title', $location );
					?>

					<?php
					//allow others to prevent this from displaying
					if ( apply_filters( 'pixelgrade_display_entry_header', false, $location ) ) { ?>
						<header class="c-page-header  entry-header">
							<?php the_title( '<h1 class="c-page-header__title  entry-title"><span>', '</span></h1>' ); ?>
						</header><!-- .entry-header -->
					<?php } ?>

					<?php
					/**
					 * pixelgrade_after_entry_title hook.
					 *
					 * @hooked nothing() - 10 (outputs nothing)
					 */
					do_action( 'pixelgrade_after_entry_title', $location );
					?>

					<div
						class="c-article__content  u-content-background  u-content_container_padding_top  u-container_sides_spacing">

						<?php if ( get_the_content() ): ?>
							<div class="o-wrapper  u-content-width  js-header-height-padding-top">
								<?php the_content();

								wp_link_pages( array(
									'before' => '<div class="c-article__page-links  page-links">' . esc_html__( 'Pages:', 'noah' ),
									'after'  => '</div>',
								) ); ?>
							</div>
						<?php endif; ?>

						<?php
						//We are displaying the loop so we need the proper location
						$location = pixelgrade_set_location( 'portfolio jetpack' );
						// in case this is a static front page
						if ( get_query_var( 'page' ) ) {
							$paged = ( get_query_var( 'page' ) ) ? get_query_var( 'page' ) : 1;
						} else {
							$paged = ( get_query_var( 'paged' ) ) ? get_query_var( 'paged' ) : 1;
						}

						$nr_of_projects = 10;

						if ( class_exists( 'Jetpack_Portfolio' ) ) {
							$nr_of_projects = get_option( Jetpack_Portfolio::OPTION_READING_SETTING, '10' );
						}

						$projects = new WP_Query( array(
							'post_type'      => 'jetpack-portfolio',
							'posts_per_page' => $nr_of_projects,
						) );
						if ( $projects->have_posts() ) : ?>

							<div class="js-header-height-padding-top">

								<div class="u-content-background">
									<section class="c-archive-loop  u-full-width  u-portfolio_sides_spacing  u-content-bottom-spacing">
										<div class="o-wrapper u-portfolio_grid_width">
											<div <?php noah_portfolio_class( '', $location ); ?>>

												<?php while ( $projects->have_posts() ) : $projects->the_post();
													get_template_part( 'template-parts/content', 'jetpack-portfolio' );
												endwhile; ?>

											</div>
										</div>
									</section>
								</div>

								<?php noah_the_older_projects_button( $projects ); ?>

							</div>

						<?php else : ?>
							<div class="u-content-bottom-spacing  js-header-height-padding-top">
								<div class="u-content-width entry-content">
									<?php get_template_part( 'template-parts/content', 'none' ); ?>
								</div>
							</div>
						<?php endif;

						wp_reset_postdata();
						//Set the previous location back
						$location = pixelgrade_set_location( 'page portfolio-page' ); ?>

					</div><!-- .c-article__content -->

				</article><!-- #post-## -->

			<?php endwhile; // End of the loop. ?>

			<?php
			/**
			 * pixelgrade_after_loop hook.
			 *
			 * @hooked nothing - 10 (outputs nothing)
			 */
			do_action( 'pixelgrade_after_loop', $location );
			?>

		</main><!-- #main -->
	</div><!-- #primary -->

<?php
/**
 * pixelgrade_after_main_content hook.
 *
 * @hooked nothing - 10 (outputs nothing)
 */
do_action( 'pixelgrade_after_main_content', $location );
?>

<?php get_footer();
