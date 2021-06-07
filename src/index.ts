import { Request, RequestHandler } from 'express';

type Middlewares = RequestHandler[][] | Record<string, RequestHandler[]>[];

const errors = {
  conditionFn: `Condition should be a function`,
  errorMiddleware: "Error middleware can't be used",
  middlewareFn: 'Middleware is not a function',
};

const isPlainObject = (o: any) =>
  Boolean(
    o &&
      o.constructor &&
      o.constructor.prototype &&
      o.constructor.prototype.hasOwnProperty('isPrototypeOf')
  );

function selectMiddlewares(
  middlewares: Middlewares,
  conditionResult: string | number | boolean | null
) {
  let middlewaresSelected: RequestHandler[] = [];

  if (Array.isArray(middlewares[0])) {
    if (middlewares.length === 1) {
      middlewaresSelected = <RequestHandler[]>middlewares[0];
    } else {
      if (typeof conditionResult === 'boolean') {
        middlewaresSelected = conditionResult
          ? <RequestHandler[]>middlewares[0]
          : <RequestHandler[]>middlewares[1];
      } else if (typeof conditionResult === 'number') {
        middlewaresSelected = <RequestHandler[]>middlewares[conditionResult];
      }
    }
  } else if (isPlainObject(middlewares[0])) {
    middlewaresSelected = middlewares[0][conditionResult as string];
  }
  return middlewaresSelected || [];
}

const conditional =
  (condition: (req: Request) => boolean | number | string) =>
  (...middlewares: Middlewares): RequestHandler =>
    async function (req, res, next) {
      let middlewaresBind: any[] = [];
      let conditionResult = null;

      try {
        conditionResult = condition(req);
      } catch (error) {
        next(new Error(errors.conditionFn));
      }

      if (middlewares.length === 0 || !middlewares) {
        return next();
      }

      const middlewaresSelected = selectMiddlewares(
        middlewares,
        conditionResult
      );

      for (const middleware of middlewaresSelected) {
        if (middleware.length > 3) {
          return next(new Error(errors.errorMiddleware));
        }

        try {
          middlewaresBind.push(middleware.bind(null, req, res));
        } catch (error) {
          return next(new Error(errors.middlewareFn));
        }
      }

      for (const middleware of middlewaresBind) {
        try {
          await new Promise((resolve, reject) => {
            middleware((error: any) => {
              if (error) reject(error);
              resolve(null);
            });
          });
        } catch (error) {
          return next(error);
        }
      }

      return next();
    };

export default conditional;
