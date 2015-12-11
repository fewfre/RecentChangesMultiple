var gulp = require('gulp')
	, gp_concat = require('gulp-concat')
;

gulp.task('default', function() {
	// place code for your default task here
	return gulp.src(['src/js/Utils.js', 'src/js/WikiData.js', 'src/js/i18n.js', 'src/js/RCMOptions.js', 'src/js/RCData.js', 'src/js/RCList.js', , 'src/js/RCMManager.js', 'src/js/Main.js'])
		.pipe(gp_concat('core.js'))
		.pipe(gulp.dest("build"))
	;
});

gulp.task('default', function() {
	// place code for your default task here
	return gulp.src(['src/js/code.2.js'])
		.pipe(gp_concat('code.2.js'))
		.pipe(gulp.dest("build"))
	;
});