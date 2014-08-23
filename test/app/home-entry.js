var user = require('./user');
var home = require('./home');

home.page.init();

/**
 *  As soon as we load, navigate to /users/tory using
 *  revsci-page.
 */

user.page.visit({
  //host: 'http://localhost:3333',
  params: {user: 'tory'}
});
