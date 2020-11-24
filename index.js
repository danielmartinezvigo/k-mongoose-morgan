const mongoose = require('mongoose');
const morgan = require('morgan');
const stream = require('stream');
const carrier = require('carrier');
const passStream = new stream.PassThrough();

let logSchema;

const isNumberic = str => !isNaN(str) && !isNaN(parseFloat(str))

/**
 * MongooseMorgan object
 * @param  {object} mongoData - represents mongo database data, requires { connectionString : '{MONGO_URL}' } parameter.
 * @param  {object} options - represents morgan options, check their github, default value is empty object {}.
 */
function MongooseMorgan(mongoData, options) {
    // Filter the arguments
    var args = Array.prototype.slice.call(arguments);

    if (args.length == 0 || !mongoData.connectionString) {
        throw new Error('Mongo connection string is null or empty. Try by adding this: { connectionString : \'{mongo_url}\'}');
    }

    if (args.length > 1 && typeof options !== 'object') {
        throw new Error('Options parameter needs to be an object. You can specify empty object like {}.');
    }

    let format = (tokens, req, res) => [
      tokens.method(req, res),
      tokens.url(req, res),
      tokens.status(req, res),
      tokens['response-time'](req, res),
      'ms',
      JSON.stringify(req.body),
    ].join(' ');

    // if (args.length > 2 && typeof format === 'object') {
    //     throw new Error('Format parameter should be a string. Default parameter is \'combined\'.');
    // }

    options = options || {};
    format = format || 'combined';

    // Create connection to MongoDb
    var collection = mongoData.collection || 'logs';
    var capped = mongoData.capped;
    var cappedSize = (mongoData.cappedSize || 10000000);
    var cappedMax = mongoData.cappedMax;

    mongoose.connect(mongoData.connectionString, {
        user: mongoData.user || null,
        pass: mongoData.pass || null,
        dbName: mongoData.dbName || null,
        useNewUrlParser: mongoData.useNewUrlParser || true,
        useUnifiedTopology: mongoData.useUnifiedTopology || true
    });

    // Create stream to read from
    var lineStream = carrier.carry(passStream);
    lineStream.on('line', onLine);

    // Morgan options stream
    options.stream = passStream;

    // Para saber cuando guardar.
    const save = options.save;
    delete options.save;

    // Schema - only once created.
    if (!logSchema) {
        logSchema = mongoose.Schema({
            method: String,
            path: String,
            status: Number,
            time: Number,
            body: mongoose.Schema.Types.Mixed,
            log: String,
            _createdAt: {
              type: Date,
              default: Date.now
            },
        }, capped ? {
            capped: {
                size: cappedSize,
                max: cappedMax
            }
        } : {});
    }

    // Create mongoose model
    var Log = mongoose.model('Log', logSchema, collection);

    function onLine(line) {
        console.log(line);

        if (
          save
          && typeof save === 'function'
          && !save(line)
        ) {
          return;
        }

        var logModel = new Log();
  
        const parts = line.split(' ');
        if (
          parts.length >= 4
          && parts[4] === 'ms'
          && isNumberic(parts[2])
          && isNumberic(parts[3])
        ) {
          logModel.method = parts[0];
          logModel.path = parts[1];
          logModel.status = parts[2];
          logModel.time = parts[3];
          let body = parts.slice(5, parts.length)
          body = body.join(' ');
          try {
            aux = JSON.parse(body)
            body = aux;
          } catch (ex) {
          }
          logModel.body = body;
        } else {
          logModel.log = line;
        }

        logModel.save(function (err) {
            if (err) {
                throw err;
            }
        });
    }

    var mongooseMorgan = morgan(format, options);
    return mongooseMorgan;
}

module.exports = MongooseMorgan;
module.exports.compile = morgan.compile;
module.exports.format = morgan.format;
module.exports.token = morgan.token;