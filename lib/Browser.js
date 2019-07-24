const puppeteer = require('puppeteer-core');
const sleep = require('sleep-promise');

const defaultBrowserOptions = {
  args: [
    // This will write shared memory files into /tmp instead of /dev/shm,
    // because Docker’s default for /dev/shm is 64MB
    '--disable-dev-shm-usage'
  ],
  executablePath: process.env.CHROME_PATH || 'google-chrome-unstable'
};

module.exports = class BrowserProxy {
  async init(length, browserOptions = {}) {
   /*
   * IMPORTANT - each browser is listening to process's "exit" event
   * this line allows more than the default 10 listeners / browsers open at a time
   */
    process.setMaxListeners(length);

    browserOptions = Object.assign({}, defaultBrowserOptions, browserOptions);
    this._browsers = Array.from({ length }, _ => puppeteer.launch(browserOptions));
    /**
     * @type {puppeteer[]}
     * @private
     */
    this._browsers = await Promise.all(this._browsers);
  }

  async newPage() {
    const { browser, pages } = await this._getFreestBrowser();
    if (pages.length <= 1) {
      return browser.newPage()
    } else { // browser already rendering a page
      if (pages.length > 2) {
        // this should never happen
        throw new Error(`Too many pages open, possible memory leak - # of pages:${pages.length}`)
      }
      await sleep(50);
      return this.newPage()
    }
  }

  async goto(page, url, { viewport, headers, waitUntil } = {}) {
    if (!page)
      throw new Error('Couldn\'t create new page');

    await page.setViewport(viewport);
    await page.setExtraHTTPHeaders(headers);
    await page.goto(url, { waitUntil })
  }

  async screenshot(url, {headers, options, viewport, waitUntil}, retry = 0) {
    let page;
    try {
      page = await this.newPage();
      await this.goto(page, url, {viewport, headers, waitUntil});
      return await page.screenshot(options)
    } catch (e) {
      if (page)
        await page.close();

      if (retry < 2)
        return this.screenshot(url, {headers, options, viewport, waitUntil}, retry + 1);
      else
        throw new Error(`3 Retries failed - stacktrace: \n\n${e.stack}`)
    } finally {
      if (page)
        await page.close()
    }
  }

  async pdf(url, {headers, viewport, options, waitUntil}, retry = 0) {
    let page;
    try {
      page = await this.newPage();

      await this.goto(page, url, {viewport, headers, waitUntil});

      return await page.pdf(options)
    } catch (e) {
      if (page)
        await page.close();

      if (retry < 2)
        return this.pdf(url, {headers, viewport, options, waitUntil}, retry + 1);
      else
        throw new Error(`3 Retries failed - stacktrace: \n\n${e.stack}`)
    } finally {
      if (page)
        await page.close()
    }
  }

  async _getFreestBrowser() {
    let minLength = 3;
    let freestBrowser;
    for (let browser of this._browsers) {
      const pages = await browser.pages();

      if (pages.length === 0) {
        return { pages, browser }
      }
      if (pages.length < minLength) {
        freestBrowser = { pages, browser };
        minLength = pages.length;
      }
    }
    return freestBrowser
  }

};