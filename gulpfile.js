var gulp = require('gulp');
var concat = require('gulp-concat');
// var jshint = require('gulp-jshint');
var less = require('gulp-less');
var path = require('path');

gulp.task('core', function() {
	// Make sure these are ordered from least reliant to most reliant.
	return gulp.src(['src/js/Utils.js', 'src/js/WikiData.js', 'src/js/i18n.js', 'src/js/RCMOptions.js', 'src/js/RCMWikiPanel.js',  'src/js/RCMModal.js', 'src/js/RCData.js', 'src/js/RCList.js', , 'src/js/RCMManager.js', 'src/js/Main.js'])
		// .pipe(jshint())
		// .pipe(jshint.reporter('default', {  }))
		.pipe(concat('core.js'))
		.pipe(gulp.dest("build"))
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

// place code for your default task here
gulp.task('default', [ 'core', 'loader', 'css' ]);
