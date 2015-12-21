var gulp = require('gulp')
	, concat = require('gulp-concat')
	// , jshint = require('gulp-jshint')
;

gulp.task('core', function() {
	// Make sure these are ordered from least reliant to most reliant.
	return gulp.src(['src/js/Utils.js', 'src/js/WikiData.js', 'src/js/i18n.js', 'src/js/RCMOptions.js', 'src/js/RCData.js', 'src/js/RCList.js', , 'src/js/RCMManager.js', 'src/js/Main.js'])
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
	return gulp.src(['src/css/stylesheet.css'])
		.pipe(concat('stylesheet.css'))
		.pipe(gulp.dest("build"))
	;
});

// place code for your default task here
gulp.task('default', [ 'core', 'loader', 'css' ]);