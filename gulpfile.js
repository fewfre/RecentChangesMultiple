const gulp = require('gulp');
const concat = require('gulp-concat');
const insert = require('gulp-insert');
const replace = require('gulp-replace');
const less = require('gulp-less');
const strip = require('gulp-strip-comments');
const path = require('path');
const browserify = require("browserify");
const source = require('vinyl-source-stream');
const tsify = require("tsify");

function core() {
	return browserify({
		basedir: '.',
		// debug: true,
		entries: ['src/js/start.ts'],
		cache: {},
		packageCache: {}
	})
	.plugin(tsify)
	.bundle()
	.pipe(source('core.js'))
	// .pipe(rename('core.js'))
	// .pipe(buffer())
	.pipe(gulp.dest("dist"))
	;
};

function core_comments() {
	return gulp.src('dist/core.js', {base: './'})
	.pipe(strip())
	// This is needed for the script to validate on Wikia
	.pipe(replace(/\.default(\W)/g, '["default"]$1'))
	// Surround code with comments
	.pipe(insert.prepend(
	`//<pre>
/*
 * Script: RecentChangesMultiple
 * Author: Fewfre
 *
 * Uses ajax loading to view the Special:RecentChanges of multiple wikis all on one page.
 * PLEASE DON'T EDIT DIRECTLY WITHOUT INFORMING ME! If you do so it will likely be overwritten at a later date, as this script is pre-compiled and stored at https://github.com/fewfre/RecentChangesMultiple
 */\n`
	))
	.pipe(insert.append('//</pre>\n'))
	.pipe(gulp.dest("./"))
	;
};

function loader() {
	return gulp.src(['src/js/loader.js'])
		.pipe(concat('code.2.js'))
		.pipe(gulp.dest("dist"))
	;
};

function css() {
	return gulp.src(['src/css/stylesheet.less'])
		.pipe(less({ paths: [ path.join(__dirname, 'less', 'includes') ] }))
		.pipe(concat('stylesheet.css'))
		.pipe(gulp.dest("dist"))
	;
};

// place code for your default task here
let coreBuild = gulp.series(core, core_comments);
gulp.task('default', gulp.parallel(coreBuild, loader, css) );
// gulp.task('default', [ 'core', 'core_comments', 'loader', 'css' ]);
