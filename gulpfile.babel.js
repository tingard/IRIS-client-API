/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
import gulp from 'gulp';
import eslint from 'gulp-eslint';
import babel from 'gulp-babel';

// define where our paths are
const paths = {
  allSrcJs: 'src/**/*.js', // all js(x) files
  entryPoint: './src/index.js',
  gulpFile: 'gulpfile.babel.js', // gulp configuration file
  distDir: './dist',
};

// linting task
gulp.task('lint', () =>
  gulp.src([
    paths.allSrcJs,
    paths.gulpFile,
  ])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError()),
);

gulp.task('build', () => (
  gulp.src(paths.entryPoint)
      .pipe(babel({
        presets: ['babel-preset-es2015'],
      }))
      .pipe(gulp.dest(paths.distDir))
));

gulp.task(
  'watch',
  () => gulp.watch(paths.allSrcJs, ['build'])
);

gulp.task('default', ['lint']);
