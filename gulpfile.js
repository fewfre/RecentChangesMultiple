var gulp = require('gulp');
var concat = require('gulp-concat');
var insert = require('gulp-insert');
var replace = require('gulp-replace');
// var jshint = require('gulp-jshint');
var less = require('gulp-less');
var path = require('path');
var browserify = require("browserify");
var source = require('vinyl-source-stream');
var tsify = require("tsify");

// gulp.task('core', function() {
// 	// Make sure these are ordered from least reliant to most reliant.
// 	return gulp.src(['src/js/Utils.js', 'src/js/WikiData.js', 'src/js/i18n.js', 'src/js/RCMOptions.js', 'src/js/RCMWikiPanel.js',  'src/js/RCMModal.js', 'src/js/RCData.js', 'src/js/RCList.js', , 'src/js/RCMManager.js', 'src/js/Main.js'])
// 		// .pipe(jshint())
// 		// .pipe(jshint.reporter('default', {  }))
// 		.pipe(concat('core.js'))
// 		.pipe(gulp.dest("build"))
// 	;
// });

gulp.task('core', function() {
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
	.pipe(gulp.dest("build"))
	;
});

gulp.task('core_comments', ['core'], function() {
	return gulp.src('build/core.js', {base: './'})
	// This is needed for the script to validate on Wikia
	.pipe(replace(/\.default(\W)/g, '["default"]$1'))
	// Surround code with comments
	.pipe(insert.prepend(
	`//<syntaxhighlight lang="javascript">
/*
 * Script: RecentChangesMultiple
 * Author: Fewfre
 *
 * Uses ajax loading to view the Special:RecentChanges of multiple wikis all on one page.
 * PLEASE DON'T EDIT DIRECTLY WITHOUT INFORMING ME! If you do so it will likely be overwritten at a later date, as this script is pre-compiled and stored at https://github.com/fewfre/RecentChangesMultiple
 */\n`
	))
	.pipe(insert.append('//</syntaxhighlight>\n'))
	.pipe(gulp.dest("./"))
	;
});

gulp.task('loader', function() {
	return gulp.src(['src/js/loader.js'])
		.pipe(concat('code.2.js'))
		.pipe(gulp.dest("build"))
	;
});

gulp.task('css', function() {
	return gulp.src(['src/css/stylesheet.less'])
		.pipe(less({ paths: [ path.join(__dirname, 'less', 'includes') ] }))
		.pipe(concat('stylesheet.css'))
		.pipe(gulp.dest("build"))
	;
});

// gulp.task('typescript', function() {
// 	return tsProject.src()
// 		.pipe(tsProject())
// 		.js.pipe(gulp.dest("dist"));
// 	;
// });

// place code for your default task here
gulp.task('default', [ 'core', 'core_comments', 'loader', 'css' ]);
