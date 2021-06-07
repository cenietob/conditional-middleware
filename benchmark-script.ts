import fs from 'fs';
import express from 'express';
import { Writable } from 'stream';
import Convert from 'ansi-to-html';
import autocannon from 'autocannon';

import conditional from './src/index';

const testsFile = 'benchmark.md';
const amountMiddlewares = 10;
const portExpressTest = 3002;
const autocannonOptions: Partial<autocannon.Options> = {
  connections: 300,
  pipelining: 20,
  amount: 100000,

};

const app = express();

const [first, second, ...rest] = new Array(amountMiddlewares).fill(
  (req, res, next) => {
    next();
  }
);

app.get('/without', first, second, ...rest, function (req, res) {
  res.send('Hello World');
});

app.get(
  '/with',
  first,
  conditional(() => 0)(rest, rest, rest),
  second,
  function (req, res) {
    res.send('Hello World');
  }
);

const server = app.listen(portExpressTest);

const convert = new Convert({ newline: true });
Writable.prototype._write = function (chunk, data, next) {
  appendToFile(convert.toHtml(unescape(chunk.toString('utf8'))));
  next();
};
var customStream = new Writable();

(async () => {
  writeToFile(
    `<h2 style="text-align:center;"><b>Tests Without Conditionals</b> </h2>`
  );

  const instance1: any = await runAutocannonTests('without');

  appendToFile(
    `<h2 style="text-align:center;"><b>Tests With Conditionals</b> </h2> `
  );

  const instance2: any = await runAutocannonTests('with');

  appendToFile(`*${amountMiddlewares} middlewares used*`);
  appendToFile(`Tests done with autocannon`);

  instance1.stop();
  instance2.stop();
  server.close();

  process.once('SIGINT', () => {
    instance1.stop();
    instance2.stop();
    server.close();
  });
})();

function writeLineBreakToFile() {
  fs.appendFileSync(testsFile, '\r\n \r\n');
}

function appendToFile(text) {
  writeLineBreakToFile();
  writeLineBreakToFile();
  fs.appendFileSync(testsFile, text);
}

function writeToFile(text) {
  fs.writeFileSync(testsFile, text);
}

function runAutocannonTests(path) {
  return new Promise((resolve, reject) => {
    const instance1 = autocannon(
      {
        url: `http://localhost:${portExpressTest}/${path}`,
        ...autocannonOptions,
      },
      () => resolve(instance1)
    );
    autocannon.track(instance1, {
      outputStream: customStream,
    });
  });
}
