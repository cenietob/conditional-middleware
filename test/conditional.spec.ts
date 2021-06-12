import chai from 'chai';
import sinon from 'sinon';
import express from 'express';
import request from 'supertest';

import condition from '../src/index';

describe('Run Middlewares By App Type Tests', () => {
  let sandbox = sinon.createSandbox();
  let middleware1;
  let middleware2;
  let middleware3;
  let initialMiddleware;
  let finalMiddleware;
  let errorMiddleware;
  let callOrder: any[];
  let asyncMiddleware;
  let middlewareThrowsError;

  const getAsyncTask = (time, name) =>
    new Promise((resolve, reject) => {
      setTimeout(() => {
        callOrder.push(name);
        resolve(null);
      }, time);
    });

  beforeEach('', () => {
    callOrder = [];
    sandbox = sinon.createSandbox();

    middleware1 = sandbox.spy((req, res, next) => {
      callOrder.push('middleware1');
      next();
    });

    middleware2 = sandbox.spy((req, res, next) => {
      callOrder.push('middleware2');
      next();
    });

    middleware3 = sandbox.spy((req, res, next) => {
      callOrder.push('middleware3');
      next();
    });

    initialMiddleware = sandbox.spy((req, res, next) => {
      callOrder.push('initialMiddleware');
      next();
    });

    finalMiddleware = sandbox.spy((req, res, next) => {
      callOrder.push('finalMiddleware');
      res.status(200).json('pass');
    });

    asyncMiddleware = sandbox.spy(async (req, res, next) => {
      callOrder.push('asyncMiddleware - start');
      await getAsyncTask(1000, 'asyncMiddleware - end');
      next();
    });

    errorMiddleware = sandbox.spy((err, req, res, next) => {
      callOrder.push('errorMiddleware');
      res.status(400).json(`${err}`);
    });

    middlewareThrowsError = sandbox.spy((req, res, next) => {
      callOrder.push('middlewareThrowsError');
      next(new Error('custom error'));
    });
  });

  afterEach('', () => {
    sandbox.restore();
  });

  const requestCallback = (fn, callback) => (err, res) => {
    if (err) return callback(err);

    try {
      fn(res);
    } catch (error) {
      return callback(error);
    }

    return callback();
  };

  it('When condition is not a function, then fail.', (done) => {
    const app = express().get(
      '/',
      initialMiddleware,
      condition(1 as any)(),
      finalMiddleware,
      errorMiddleware
    );

    request(app)
      .get('/')
      .end(
        requestCallback((res) => {
          chai
            .expect(res.body)
            .to.be.eql('Error: Condition should be a function');
          chai.expect(res.status).to.be.eql(400);
        }, done)
      );
  });

  it("When no middlewares are passed, then don't do anything.", (done) => {
    const app = express().get(
      '/',
      initialMiddleware,
      condition(() => true)(),
      finalMiddleware,
      errorMiddleware
    );

    request(app)
      .get('/')
      .end(
        requestCallback((res) => {
          chai.expect(finalMiddleware.callCount).to.be.eql(1);
          chai.expect(errorMiddleware.callCount).to.be.eql(0);
          chai.expect(res.status).to.be.eql(200);
        }, done)
      );
  });

  it(`When one middleware is passed, then use it independent of the 
    condition.`, (done) => {
    const app = express().get(
      '/',
      initialMiddleware,
      condition(() => false)([ middleware2 ]),
      finalMiddleware,
      errorMiddleware
    );

    request(app)
      .get('/')
      .end(
        requestCallback((res) => {
          chai.expect(finalMiddleware.callCount).to.be.eql(1);
          chai.expect(errorMiddleware.callCount).to.be.eql(0);
          chai.expect(middleware2.callCount).to.be.eql(1);
          chai.expect(res.status).to.be.eql(200);
        }, done)
      );
  });

  it(`When condition returns a boolean "true", then take the first 
    array.`, (done) => {
    const app = express().get(
      '/',
      initialMiddleware,
      condition(() => true)([ middleware1 ], [ middleware2 ]),
      finalMiddleware,
      errorMiddleware
    );

    request(app)
      .get('/')
      .end(
        requestCallback((res) => {
          chai.expect(finalMiddleware.callCount).to.be.eql(1);
          chai.expect(errorMiddleware.callCount).to.be.eql(0);
          chai.expect(middleware2.callCount).to.be.eql(0);
          chai.expect(middleware1.callCount).to.be.eql(1);
          chai.expect(res.status).to.be.eql(200);
        }, done)
      );
  });

  it(`When condition returns a boolean "false", then take the second 
    array.`, (done) => {
    const app = express().get(
      '/',
      initialMiddleware,
      condition(() => false)([ middleware1 ], [ middleware2 ]),
      finalMiddleware,
      errorMiddleware
    );

    request(app)
      .get('/')
      .end(
        requestCallback((res) => {
          chai.expect(finalMiddleware.callCount).to.be.eql(1);
          chai.expect(errorMiddleware.callCount).to.be.eql(0);
          chai.expect(middleware2.callCount).to.be.eql(1);
          chai.expect(middleware1.callCount).to.be.eql(0);
          chai.expect(res.status).to.be.eql(200);
        }, done)
      );
  });

  it(`When condition returns a number "i", then take the middlewares in the
    passed in the argument "i".`, (done) => {
    const app = express().get(
      '/',
      initialMiddleware,
      condition(() => 2)([ middleware1 ], [ middleware2 ], [ middleware3 ]),
      finalMiddleware,
      errorMiddleware
    );

    request(app)
      .get('/')
      .end(
        requestCallback((res) => {
          chai.expect(finalMiddleware.callCount).to.be.eql(1);
          chai.expect(errorMiddleware.callCount).to.be.eql(0);
          chai.expect(middleware3.callCount).to.be.eql(1);
          chai.expect(middleware2.callCount).to.be.eql(0);
          chai.expect(middleware1.callCount).to.be.eql(0);
          chai.expect(res.status).to.be.eql(200);
        }, done)
      );
  });

  it(`When not passed a list of middlewares or an object, then don't 
    execute any middleware.`, (done) => {
    const app = express().get(
      '/',
      initialMiddleware,
      condition(() => true)('test' as any, [ middleware1 ]),
      finalMiddleware,
      errorMiddleware
    );

    request(app)
      .get('/')
      .end(
        requestCallback((res) => {
          chai.expect(finalMiddleware.callCount).to.be.eql(1);
          chai.expect(errorMiddleware.callCount).to.be.eql(0);
          chai.expect(middleware1.callCount).to.be.eql(0);
          chai.expect(res.status).to.be.eql(200);
        }, done)
      );
  });

  it(`When an object is passed and the string returned in the condition is found 
    in the object, then execute the middlewares in that key.`, (done) => {
    const app = express().get(
      '/',
      initialMiddleware,
      condition(() => 'testing')({
        testing : [ middleware1, middleware2 ],
        not     : [ middleware3 ],
      }),
      finalMiddleware,
      errorMiddleware
    );

    request(app)
      .get('/')
      .end(
        requestCallback((res) => {
          chai.expect(finalMiddleware.callCount).to.be.eql(1);
          chai.expect(errorMiddleware.callCount).to.be.eql(0);
          chai.expect(middleware1.callCount).to.be.eql(1);
          chai.expect(middleware2.callCount).to.be.eql(1);
          chai.expect(middleware3.callCount).to.be.eql(0);
          chai.expect(res.status).to.be.eql(200);
        }, done)
      );
  });

  it(`When an object is passed and the string returned in the condition is 
    not found in the object, then don't execute any middleware in the 
    conditional.`, (done) => {
    const app = express().get(
      '/',
      initialMiddleware,
      condition(() => 'not-found')({ testing: [ middleware1, middleware2 ] }),
      finalMiddleware,
      errorMiddleware
    );

    request(app)
      .get('/')
      .end(
        requestCallback((res) => {
          chai.expect(finalMiddleware.callCount).to.be.eql(1);
          chai.expect(errorMiddleware.callCount).to.be.eql(0);
          chai.expect(middleware1.callCount).to.be.eql(0);
          chai.expect(middleware2.callCount).to.be.eql(0);
          chai.expect(res.status).to.be.eql(200);
        }, done)
      );
  });

  it(`When condition don't returns a number, a boolean or a string, then don't take 
    any option.`, (done) => {
    const app = express().get(
      '/',
      initialMiddleware,
      condition(() => 'other')([ middleware1 ], [ middleware2 ], [ middleware3 ]),
      finalMiddleware,
      errorMiddleware
    );

    request(app)
      .get('/')
      .end(
        requestCallback((res) => {
          chai.expect(finalMiddleware.callCount).to.be.eql(1);
          chai.expect(errorMiddleware.callCount).to.be.eql(0);
          chai.expect(middleware3.callCount).to.be.eql(0);
          chai.expect(middleware2.callCount).to.be.eql(0);
          chai.expect(middleware1.callCount).to.be.eql(0);
          chai.expect(res.status).to.be.eql(200);
        }, done)
      );
  });

  it(`When one of the middlewares selected is an "error middleware", 
    then fail`, (done) => {
    const app = express().get(
      '/',
      initialMiddleware,
      condition(() => 0)([ errorMiddleware ], [ middleware2 ], [ middleware3 ]),
      finalMiddleware,
      errorMiddleware
    );

    request(app)
      .get('/')
      .end(
        requestCallback((res) => {
          chai.expect(finalMiddleware.callCount).to.be.eql(0);
          chai.expect(errorMiddleware.callCount).to.be.eql(1);
          chai
            .expect(res.body)
            .to.be.eql("Error: Error middleware can't be used");
          chai.expect(res.status).to.be.eql(400);
        }, done)
      );
  });

  it(`When one of the middlewares selected is not a function, 
    then fail.`, (done) => {
    const app = express().get(
      '/',
      initialMiddleware,
      condition(() => 0)(
        [ { anything: 'here' } as any ],
        [ middleware2 ],
        [ middleware3 ]
      ),
      finalMiddleware,
      errorMiddleware
    );

    request(app)
      .get('/')
      .end(
        requestCallback((res) => {
          chai.expect(finalMiddleware.callCount).to.be.eql(0);
          chai.expect(errorMiddleware.callCount).to.be.eql(1);
          chai
            .expect(res.body)
            .to.be.eql('Error: Middleware is not a function');
          chai.expect(res.status).to.be.eql(400);
        }, done)
      );
  });

  it(`When multiples middlewares are executed, then execute them in the order 
    that are added.`, (done) => {
    const app = express().get(
      '/',
      initialMiddleware,
      condition(() => true)([ middleware2, middleware1 ], [ middleware3 ]),
      finalMiddleware,
      errorMiddleware
    );

    request(app)
      .get('/')
      .end(
        requestCallback((res) => {
          chai.expect(finalMiddleware.callCount).to.be.eql(1);
          chai.expect(errorMiddleware.callCount).to.be.eql(0);
          chai.expect(middleware2.callCount).to.be.eql(1);
          chai.expect(middleware1.callCount).to.be.eql(1);
          chai
            .expect(callOrder)
            .to.be.eql([
              'initialMiddleware',
              'middleware2',
              'middleware1',
              'finalMiddleware'
            ]);
          chai.expect(res.status).to.be.eql(200);
        }, done)
      );
  });

  it(`When one of the middlewares perform a long operation, then wait until finish 
    to execute the rest of the middlewares.`, (done) => {
    const app = express().get(
      '/',
      initialMiddleware,
      condition(() => true)(
        [ middleware2, asyncMiddleware, middleware1 ],
        [ middleware3 ]
      ),
      finalMiddleware,
      errorMiddleware
    );

    request(app)
      .get('/')
      .end(
        requestCallback((res) => {
          chai.expect(finalMiddleware.callCount).to.be.eql(1);
          chai.expect(errorMiddleware.callCount).to.be.eql(0);
          chai.expect(middleware2.callCount).to.be.eql(1);
          chai.expect(asyncMiddleware.callCount).to.be.eql(1);
          chai.expect(middleware1.callCount).to.be.eql(1);
          chai
            .expect(callOrder)
            .to.be.eql([
              'initialMiddleware',
              'middleware2',
              'asyncMiddleware - start',
              'asyncMiddleware - end',
              'middleware1',
              'finalMiddleware'
            ]);
          chai.expect(res.status).to.be.eql(200);
        }, done)
      );
  });

  it(`When one of the middlewares selected throws an error, then capture it and pass 
    to the error middleware and don't call next middlewares.`, (done) => {
    const app = express().get(
      '/',
      initialMiddleware,
      condition(() => true)(
        [ middleware2, middlewareThrowsError, middleware1 ],
        [ middleware3 ]
      ),
      finalMiddleware,
      errorMiddleware
    );

    request(app)
      .get('/')
      .end(
        requestCallback((res) => {
          chai.expect(finalMiddleware.callCount).to.be.eql(0);
          chai.expect(errorMiddleware.callCount).to.be.eql(1);
          chai.expect(middleware2.callCount).to.be.eql(1);
          chai.expect(middlewareThrowsError.callCount).to.be.eql(1);
          chai.expect(middleware1.callCount).to.be.eql(0);
          chai
            .expect(callOrder)
            .to.be.eql([
              'initialMiddleware',
              'middleware2',
              'middlewareThrowsError',
              'errorMiddleware'
            ]);
          chai.expect(res.status).to.be.eql(400);
        }, done)
      );
  });

  it(`When modified the request in one of the middlewares selected, then see 
    the request modified in the middlewares outside the conditional 
    middleware.`, (done) => {
    initialMiddleware = (req, res, next) => {
      req.test = 'init';
      next();
    };
    const middlewareModifyRequest1 = (req, res, next) => {
      if (req.test === 'init') req.test = 'correct';
      else req.test = 'incorrect';
      next();
    };
    const middlewareModifyRequest2 = (req, res, next) => {
      if (req.test === 'correct') {
        req.test = 'it works';
        next();
      } else next(new Error('Does not work the edit of the request'));
    };
    finalMiddleware = (req, res, next) => {
      res.status(200).json(req.test);
    };
    const app = express().get(
      '/',
      initialMiddleware,
      condition(() => true)(
        [ middlewareModifyRequest1, middlewareModifyRequest2, middleware1 ],
        [ middleware3 ]
      ),
      finalMiddleware,
      errorMiddleware
    );

    request(app)
      .get('/')
      .end(
        requestCallback((res) => {
          chai.expect(res.body).to.be.eql('it works');
          chai.expect(res.status).to.be.eql(200);
        }, done)
      );
  });

  it(`When multiples middlewares are passed, then only execute the middlewares 
    that were selected.`, (done) => {
    const app = express().get(
      '/',
      initialMiddleware,
      condition(() => true)(
        [ middleware3 ],
        [ middleware2, middleware1 ],
        [ asyncMiddleware ]
      ),
      finalMiddleware,
      errorMiddleware
    );

    request(app)
      .get('/')
      .end(
        requestCallback((res) => {
          chai.expect(finalMiddleware.callCount).to.be.eql(1);
          chai.expect(errorMiddleware.callCount).to.be.eql(0);
          chai.expect(middleware3.callCount).to.be.eql(1);
          chai.expect(middleware2.callCount).to.be.eql(0);
          chai.expect(middleware1.callCount).to.be.eql(0);
          chai.expect(asyncMiddleware.callCount).to.be.eql(0);
          chai.expect(res.status).to.be.eql(200);
        }, done)
      );
  });

  it(`When multiples conditional middlewares are nested, then execute the conditions 
    that match.`, (done) => {
    const middlewareModifyRequest1 = sandbox.spy((req, res, next) => {
      req.test = 1;
      next();
    });
    const app = express().get(
      '/',
      initialMiddleware,
      condition(() => true)(
        [
          middlewareModifyRequest1,
          condition((req: any) => req.test)(
            [ middleware2, middleware1 ],
            [ middleware3 ]
          )
        ],
        [ middleware2, middleware1 ],
        [ asyncMiddleware ]
      ),
      finalMiddleware,
      errorMiddleware
    );

    request(app)
      .get('/')
      .end(
        requestCallback((res) => {
          chai.expect(finalMiddleware.callCount).to.be.eql(1);
          chai.expect(middlewareModifyRequest1.callCount).to.be.eql(1);
          chai.expect(middleware3.callCount).to.be.eql(1);
          chai.expect(middleware2.callCount).to.be.eql(0);
          chai.expect(middleware1.callCount).to.be.eql(0);
          chai.expect(asyncMiddleware.callCount).to.be.eql(0);
          chai.expect(res.status).to.be.eql(200);
        }, done)
      );
  });

  it(`When multiple requests are executed in a flow that has a middleware that 
    performs an async operation, then don't block the process.`, async () => {
    const asyncMiddlewareLonger = sandbox.spy(async (req, res, next) => {
      callOrder.push('asyncMiddlewareLonger - start');
      await getAsyncTask(1000, 'asyncMiddlewareLonger - end');
      next();
    });
    const asyncMiddlewareLower = sandbox.spy(async (req, res, next) => {
      callOrder.push('asyncMiddlewareLower - start');
      await getAsyncTask(500, 'asyncMiddlewareLower - end');
      next();
    });
    const app = express().get(
      '/',
      initialMiddleware,
      condition((req) => +req.query.i)(
        [ asyncMiddlewareLonger ],
        [ asyncMiddlewareLower ]
      ),
      finalMiddleware,
      errorMiddleware
    );

    await Promise.all([
      request(app).get('/').query({ i: 0 }),
      request(app).get('/').query({ i: 1 })
    ]);

    chai
      .expect(callOrder)
      .to.be.eql([
        'initialMiddleware',
        'asyncMiddlewareLonger - start',
        'initialMiddleware',
        'asyncMiddlewareLower - start',
        'asyncMiddlewareLower - end',
        'finalMiddleware',
        'asyncMiddlewareLonger - end',
        'finalMiddleware'
      ]);
  });
});
