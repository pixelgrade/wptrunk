<?php
/**
 * The main template file.
 *
 * This is the most generic template file in a WordPress theme
 * and one of the two required files for a theme (the other being style.css).
 * It is used to display a page when nothing more specific matches a query.
 * E.g., it puts together the home page when no home.php file exists.
 *
 * @link https://codex.wordpress.org/Template_Hierarchy
 *
 * @package Noah
 * @since   Noah 1.0.0
 */

//let the template parts know about our location
$location = pixelgrade_set_location( 'index' );

get_header(); ?>

<?php
	/**
	 * pixelgrade_before_main_content hook.
	 *
	 * @hooked nothing() - 10 (outputs nothing)
	 */
	do_action( 'pixelgrade_before_main_content', $location );
?>

	<div id="primary" class="content-area  u-blog_sides_spacing">
		<main id="main" class="o-wrapper  u-blog_grid_width  site-main  u-content-bottom-spacing" role="main">

			<?php if ( is_home() && ! is_front_page() ): ?>
				<div class="c-page-header">
					<h1 class="c-page-header__title h1">
						<?php echo get_the_title( get_option( 'page_for_posts', true ) ); ?>
					</h1>
					<div class="c-page-header__meta h7">
						<span><?php _e( 'Show', 'noah' ); ?></span>
						<span class="c-page-header__taxonomy  u-color-accent"><?php noah_the_taxonomy_dropdown( 'category' ); ?></span>
					</div>
					<?php if ( term_description() ) {
						echo term_description();
					} ?>
				</div>
			<?php endif; ?>

			<?php if ( have_posts() ) : /* Start the Loop */ ?>

				<div <?php noah_blog_class(); ?> id="posts-container">
					<?php /* Start the Loop */ ?>
					<?php while ( have_posts() ) : the_post(); ?>
						<?php
						/**
						 * Include the Post-Format-specific template for the content.
						 * If you want to override this in a child theme, then include a file
						 * called content-___.php (where ___ is the Post Format name) and that will be used instead.
						 */
						get_template_part( 'template-parts/content', get_post_format() ); ?>
					<?php endwhile; ?>
				</div>
				<?php the_posts_navigation(); ?>

			<?php else : ?>
				<div class="u-content-width  entry-content">
					<?php get_template_part( 'template-parts/content', 'none' ); ?>
				</div>
			<?php endif; ?>

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
