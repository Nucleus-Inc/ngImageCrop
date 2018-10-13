'use strict'

import gulp from 'gulp'
import babel from 'gulp-babel'
import runSequence from 'gulp-run-sequence'
import rename from 'gulp-rename'

import yarn from 'gulp-yarn'
import htmlToJs from 'gulp-ng-html2js'
import minify from 'gulp-babel-minify'
import clean from 'gulp-clean'
import concat from 'gulp-concat'
import umd from 'gulp-umd'
import patterns from 'umd-templates'
import karma from 'karma'

const karmaServer = karma.Server

gulp.task('yarn', () => {
  return gulp.src(['./package.json'])
    .pipe(yarn())
})

gulp.task('htmlToJs', () => {
  gulp.src(['src/**/*.html'])
      .pipe(htmlToJs({
          moduleName:function(file){
              return 'ngImageCrop'
          },
          prefix: 'templates/',
          declareModule: false
      }))
      .pipe(gulp.dest('src/tmp'))
})

gulp.task('concat', () => {
  return gulp.src(['src/**/*.js'])
    .pipe(babel({
      presets: ['es2015']
    }))
    .pipe(concat({
      newLine: ';',
      path: 'ngImageCrop.js'
    }))
    .pipe(gulp.dest('tmp'))
})

gulp.task('minify', () => {
  return gulp.src('dist/ngImageCrop.js')
    .pipe(minify({
      mangle: false
    }))
    .pipe(rename({suffix: '.min'}))
    .pipe(gulp.dest('dist'))
})

gulp.task('clean', () => {
  return gulp.src(['tmp','src/tmp'], {read: false})
    .pipe(clean({force: true}))
})

gulp.task('umd', function() {
  return gulp.src('tmp/**/*.js')
    .pipe(babel({
      presets: ['es2015']
    }))
    .pipe(umd({
      dependencies: function(file) {
        return [
          {
            name: 'angular',
            amd: 'angular',
            cjs: 'angular',
            global: 'angular',
            param: 'angular'
          }
        ];
      },
      namespace: function(file) {
        return 'ngImageCrop'
      },
      template: patterns.commonjsStrict.path
    }))
    .pipe(gulp.dest('dist'))
})

gulp.task('watch', () => {
  gulp.watch('gulpfile.babel.js', () => {
    runSequence('yarn','htmlToJs','concat','umd')
  })
  gulp.watch(['src/**/*.js','src/**/.html'], () => {
    runSequence('yarn','htmlToJs','concat','umd')
  })
})

gulp.task('test', (done) => {
  karmaServer.start({
    configFile: __dirname + '/karma.conf.js',
    singleRun: true
  }, () => { done() })
})

gulp.task('dev', () => {
  runSequence('yarn','htmlToJs','concat','umd','minify',['watch'])
})

gulp.task('build', () => {
  runSequence('yarn','htmlToJs','concat','umd','minify')
})

gulp.task('default', () => {
  runSequence('yarn','htmlToJs','concat','umd','minify',['watch'])
})
