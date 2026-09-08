const { app, ready } = require("../server");

module.exports = async (request, response) => {
  await ready;
  return app(request, response);
};