/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
import gulp from 'gulp';
import eslint from 'gulp-eslint';

// define where our paths are
const paths = {
  allSrcJs: '*.js?(x)', // all js(x) files
  srcJs: '**/*.js?(x)', // source js(x) files
  testJs: '**/*.spec.js?(x)', // server js(x) files
  serverEntryPoint: 'src/index.js', // client connection file
  gulpFile: 'gulpfile.babel.js', // gulp configuration file
  libDir: 'lib',
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


gulp.task('default', ['lint']);
