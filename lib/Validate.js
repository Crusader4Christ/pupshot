const Ajv = require('ajv');

const schema = {
  additionalProperties: false,
  required: ['url'],
  properties: {
    url: {
      type: 'string',
      format: 'url'
    },
    viewport: {
      default: { width: 1080, height: 900 },
      additionalProperties: {},
      type: "object",
      properties: {
        width: {
          type: "integer",
          default: 1080
        },
        height: {
          type: "integer",
          default: 900
        }
      }
    },
    options: {
      type: "object",
      default: { fullPage: true, waitUntil: "networkidle2" },
      additionalProperties: false,
      properties: {
        fullPage: {
          type: "boolean"
        },
        type: {
          type: "string",
          default: "png",
          enum: ['jpeg', 'png']
        },
        clip: {
          type: "object",
          additionalProperties: false,
          properties: {
            width: {
              type: "integer",
              default: 1080
            },
            height: {
              type: "integer",
              default: 900
            },
            x: {
              type: "integer",
              maximum: { "$data": "1/width" },
              default: 1
            },
            y: {
              type: "integer",
              maximum: { "$data": "1/height" },
              default: 1
            }
          }
        },
        waitUntil: {
          default: "networkidle2",
          oneOf: [{
            type: "string",
            default: "networkidle2",
            enum: ['networkidle2', 'networkidle0', 'domcontentloaded', 'load']
          }, {
            type: "array",
            default: ["networkidle2"],
            items: {
              type: "string",
              enum: ['networkidle2', 'networkidle0', 'domcontentloaded', 'load']
            }
          }]
        }
      }
    }
  }
};

module.exports = class Validate {
  constructor({ logger, headersToIgnore } = {}) {
    this.headersToIgnore = headersToIgnore || [
      'Host'
    ];
    logger = logger || console;
    this.ajv = new Ajv({
      useDefaults: true,
      allErrors: true,
      verbose: true,
      coerceTypes: true,
      $data: true,
      removeAdditional: "failing",
      logger
    });

    this.validate = this.ajv.compile(schema);
  }

  parse(req, res) {
    if (!req.query.url || !req.query.url.length) {
      res.status(404)
        .send('need a valid url');
      return false;
    }
    let result = req.query;
    if (!this.validate(result)) {
      res.status(400)
        .send(this.validate.errors);
      return false;
    }
    if (!result.options.clip) {
      result.options.fullPage = true
    }
    switch (result.options.type) {
      case 'png':
        result.contentType = 'image/png'; break;
      case 'jpg':
      default:
        result.contentType = 'image/jpeg'; break;
    }
    result.headers = this.transformHeaders(req.raw.rawHeaders);
    return result;
  }

  /**
   * pass through cookies, auth, etc.
   * Using rawHeaders to ensure the values are strings
   * `req.headers` could have array values
   * Ex: [ 'headerKey', 'headerValue', ... ] => { 'headerKey': 'headerValue', ... }
   */
  transformHeaders(rawHeaders) {
    return rawHeaders.reduce((prev, cur, i, array) =>
        i % 2 === 0 && !this.headersToIgnore.includes(cur)
          ? {
            ...prev,
            [cur]: array[i + 1]
          }
          : prev
      , {})
  }
};