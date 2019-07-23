var Ajv = require('ajv');

var schema = {
  additionalProperties: false,
  properties: {
    required: ['url'],
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

export default class Validate {
  constructor({ logger, headersToIgnore }) {
    this.headersToIgnore = headersToIgnore || [
      'Host'
    ]
    logger = logger || console.log;
    this.ajv = new Ajv({
      useDefaults: true,
      allErrors: true,
      verbose: true,
      coerceTypes: true,
      removeAdditional: "failing",
      logger
    });

    this.validate = ajv.compile(schema);
  }

  parse(req, res) {
    if (!req.query.url || !req.query.url.length) {
      res.status(404)
        .send('need a valid url')
      return false;
    }
    return this.validate(req.query)
  }
}