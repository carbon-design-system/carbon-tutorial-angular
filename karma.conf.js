// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

module.exports = function (config) {
  const puppeteer = require('puppeteer');
  process.env.CHROME_BIN = puppeteer.executablePath();
  console.log(process.env.CHROME_BIN)
  // process.env.CHROME_BIN = require('puppeteer').executablePath();
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      // require('karma-firefox-launcher'),
      require('karma-phantomjs-launcher'),
      // require('karma-phantomjs2-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    client: {
      jasmine: {
        // you can add configuration options for Jasmine here
        // the possible options are listed at https://jasmine.github.io/api/edge/Configuration.html
        // for example, you can disable the random execution with `random: false`
        // or set a specific seed with `seed: 4321`
      },
      clearContext: false // leave Jasmine Spec Runner output visible in browser
    },
    jasmineHtmlReporter: {
      suppressAll: true // removes the duplicated traces
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/carbon-angular-tutorial'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' }
      ]
    },
    reporters: ['progress', 'kjhtml'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    // browsers: ['FirefoxHeadless'],
  //   customLaunchers: {
  //     'FirefoxHeadless': {
  //         base: 'Firefox',
  //         flags: [
  //             '-headless',
  //         ],
  //         prefs: {
  //             'network.proxy.type': 0
  //         }
  //     }
  // },
    // browsers: ['PhantomJS'],
  //     browsers: ['ChromeHeadless'],
  //   customLaunchers: {
  //     'ChromeHeadless': {
  //         base: 'Chrome',
  //         flags: [
  //             '-headless',
  //         ],
  //         prefs: {
  //             'network.proxy.type': 0
  //         }
  //     }
  // },
  // browsers: ['Chrome'], 
  // customLaunchers: {
  //   chrome_without_security: {
  //     base: 'Chrome',
  //     flags: ['--disable-web-security'],
  //     displayName: 'Chrome w/o security'
  //   }
  // },
  capabilities: {
    'browserName': 'chrome',
    chromeOptions: {
      args: ["--headless", "--disable-gpu", "--window-size=1200,900"],
      binary: process.env.CHROME_BIN
    }
  },
  browsers: ['Chrome'],
  // browsers: ['ChromeHeadless'],
  customLaunchers: {
    chrome_without_security: {
      base: 'Chrome',
      flags: ['--disable-web-security']
    },
  },
    singleRun: false,
    restartOnFileChange: true
  });
};
