const os = require('os');
const NUM_BROWSERS = parseInt(process.argv[2], 10) || os.cpus().length;
const PORT = process.env.PORT || 3003
const Browser = require('./lib/Browser');
const Validate = require('./lib/Validate');
/*
 * IMPORTANT - each browser is listening to process's "exit" event
 * this line allows more than the default 10 listeners / browsers open at a time
 */
process.setMaxListeners(NUM_BROWSERS);

const browser = new Browser();

// Require the framework and instantiate it
const fastify = require('fastify')({
  logger: {
    customLevels: {
      log: 35
    }
  }
});
/**
 * @type {Validate}
 */
var validator;
// Declare a route
fastify.all('*', async (req, res) => {
  let request = validator.parse(req, res);
  if (!request) {
    return;
  }
  let url = req.query.url;
  try {
    const picture = await browser.screenshot(url, request);
    res.status(200)
      .type(request.contentType)
      .send(picture)
  } catch (e) {
    res.status(500)
      .send(`Puppeteer Failed
      - url: ${url}
      - screenshot request: ${JSON.stringify(request)}
      - stacktrace: \n\n${e.stack}`)
  }
});

// Run the server!
fastify.listen(PORT, '0.0.0.0', (err, address) => {
  if (err) throw err;
  validator = new Validate({logger: fastify.log});
  return browser.init(NUM_BROWSERS);
});