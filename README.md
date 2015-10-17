<div align="center"><img src="http://i.imgur.com/BLweULE.png" alt="Oryx"></div>
<br/>
<p align="center" style="margin: 2em auto auto auto; width:70%;">
	<a href="https://codeclimate.com/github/zackehh/oryx">
        <img src="https://codeclimate.com/github/zackehh/oryx/badges/gpa.svg" style="float:left;"/>
    </a>
    <a href="https://travis-ci.org/zackehh/oryx">
		<img src="https://travis-ci.org/zackehh/oryx.svg?branch=master" alt="Build Status" />
    </a>
    <a href="https://codeclimate.com/github/zackehh/oryx/coverage">
        <img src="https://codeclimate.com/github/zackehh/oryx/badges/coverage.svg" style="float:right;"/>
    </a>
</p>

Oryx is a convenient API scaffolding framework for Node.js and Express, taking away the pains of constructing an API without opting for a full-fledged framework such as [Angular](https://angularjs.org/). The idea behind Oryx is to make it possible to get an app up-and-running very quickly with little effort. Due to Oryx being built on Express, it's a reliable tool to use in any Node.js application.

### Compatibility

Oryx is currently tested against Node.js 0.10.x, 0.12.x and 4.x. Even though 0.8.x is not in the CI loops, it should still be supported at the present time.

All commits are sent to TravisCI for testing, and then on to [Code Climate](https://codeclimate.com/github/zackehh/oryx) for analysis.

### Setup

Oryx lives on npm, so just install it via the command line and you're good to go. All other dependencies will be pulled automatically.

*Note: Oryx does not depend on Express - this is to allow the user to decide on the version to use.*

```
$ npm install --save oryx
```

### Getting Started

Let's take a look at how easy it is to build a simple app using the Oryx defaults:

```javascript
var express = require('express');
var Oryx = require('oryx');

var app = express();
var oryx = new Oryx(app);

oryx.autowire(function (err, models, apis){
    if(err){
        throw err;
    }
    
    console.log('Generated models: ' + JSON.stringify(models));
    console.log('Generated APIs: ' + JSON.stringify(apis));
            
    app.listen(3000);
});
```

**That's it.**

For more information on how this works, the options which can be provided to Oryx, or any other features, visit the [documentation](https://github.com/zackehh/oryx/wiki).

### Contributing

If you want to contribute to Oryx, please file an issue before filing a PR - I wouldn't want anyone to spend time on a PR which might not be merged. This project is a personal project (at the moment), and so there is no real roadmap with regards to features at this time.

All PRs should pass `grunt lint` and maintain 100% test coverage. If something isn't covered by `lint`, please just use the existing code as an example of the style which should be used.

### Testing

Tests are run using `grunt` or `npm`, and written using [Mocha](https://mochajs.org/). I aim to maintain 100% coverage where possible (both line and branch).

Tests can be run as follows:

```bash
$ npm test
$ grunt test
$ grunt # runs the default Travis loop
```

### Issues

If you spot any issues when using Oryx, please file an [issue](https://github.com/zackehh/oryx/issues). Oryx can't get better otherwise!