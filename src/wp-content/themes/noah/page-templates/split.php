<?php
/**
 * Template Name: Split
 *
 * @package Noah
 */

//let the template parts know about our location
$location = pixelgrade_set_location( 'page split' );

get_header(); ?>

<?php
/**
 * pixelgrade_before_main_content hook.
 *
 * @hooked nothing() - 10 (outputs nothing)
 */
do_action( 'pixelgrade_before_main_content', $location );
?>

	<div id="primary" class="content-area  u-side-padding  u-content-background">
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
				<div class="o-split">

				<?php if ( has_post_thumbnail() ) { ?>
					<div class="o-split__img"><?php the_post_thumbnail( 'full' ); ?></div>
				<?php } ?>

					<div class="o-split__body u-container-sides-spacings">
						<div class="o-wrapper u-content-width">
							<header class="c-page-header  entry-header">

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
						if ( apply_filters( 'pixelgrade_display_entry_header', true, $location ) ) {
							the_title( '<h1 class="c-page-header__title  entry-title">', '</h1>' );
						} ?>

						<?php
						/**
						 * pixelgrade_after_entry_title hook.
						 *
						 * @hooked nothing() - 10 (outputs nothing)
						 */
						do_action( 'pixelgrade_after_entry_title', $location );
						?>

									</header><!-- .entry-header -->

									<div class="u-content-bottom-spacing  entry-content">
						<?php the_content();
						wp_link_pages( array(
							'before' => '<div class="c-article__page-links  page-links">' . esc_html__( 'Pages:', 'noah' ),
							'after'  => '</div>',
						) ); ?>
									</div><!-- .entry-content -->

						</div><!-- .o-wrapper -->
					</div><!-- .o-split__body -->
				</div><!-- .o-split -->

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

<?php
get_footer();
