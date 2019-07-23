const os = require('os')
const NUM_BROWSERS = parseInt(process.argv[2], 10) || os.cpus().length
const Browser = require('lib/Browser')
/*
 * IMPORTANT - each browser is listening to process's "exit" event
 * this line allows more than the default 10 listeners / browsers open at a time
 */
process.setMaxListeners(NUM_BROWSERS)

const browser = new Browser(NUM_BROWSERS);

// Require the framework and instantiate it
const fastify = require('fastify')({
  logger: true
})

// Declare a route
fastify.all('*', (req, res) => {
  if (!req.query.url || !req.query.url.length) {
    res.status(404)
      .send('need a valid url')
    return
  }

  let url
  try {
    url = decodeURIComponent(req.query.url);
  } catch (e) {
    res.status(404)
      .send('need a valid url')
    return
  }

  const headers = transformHeaders(req.rawHeaders)

  try {
    const picture = await browser.screenshot(headers, url, options, viewport, waitUntil)
    res.status(200)
      .set('Content-type', 'image/jpeg')
      .send(picture)
  } catch (e) {
    res.status(500)
      .send(`Puppeteer Failed 
      - url: ${url} 
      - screenshot options: ${JSON.stringify(options)} 
      - viewport: ${JSON.stringify(viewport)} 
      - waitUntil: ${waitUntil}
      - stacktrace: \n\n${e.stack}`)
  }
})

// Run the server!
fastify.listen(3000, (err, address) => {
  if (err) throw err
  fastify.log.info(`server listening on ${address}`)
})