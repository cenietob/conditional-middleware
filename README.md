<h1 align=center>Condition middleware</h1> 

<p align=center>Middleware to run different middlewares depending on a condition.</p>

<p align=center>
<a href="https://www.npmjs.com/package/condition-middleware"><img alt="GitHub package.json version" src="https://img.shields.io/github/package-json/v/cenietob/conditional-middleware"></a>
<a href="https://www.npmjs.com/package/conditional-middleware"><img alt="NPM version" src="https://img.shields.io/npm/v/conditional-middleware.svg?style=flat-square"></a>
<a href="https://travis-ci.org/cenietob/conditional-middleware"><img alt="Build" src="https://travis-ci.org/cenietob/conditional-middleware.svg?branch=master"></a>
<a href="https://codecov.io/github/cenietob/conditional-middleware?branch=master"><img alt="codecov.io" src="https://codecov.io/github/cenietob/conditional-middleware/coverage.svg?branch=master"></a>
<a href="http://standardjs.com/"><img alt="js-standard-style" src="https://img.shields.io/badge/code%20style-standard-brightgreen.svg"></a>
</p>


<h2>Installation</h2>

```
$ npm install --save condition-middleware
```

<h2>Usage</h2>

<h3>Express</h3>

Right now error middlewares are not accepted inside a condition middleware.

The modifications done to the request inside a condition middleware will maintain in all the next middlewares,, including the ones outside the condition.

The middlewares can be passed to the condition in two different ways, the firs one is passing multiple list of middlewares and the second option is passing an object with multiple keys and values as a list of middlewares.

When passing multiple list of middlewares, then you can in the condition returns a boolean or a number.

Return a boolean

```js
import condition from 'condition-middleware';

const isAdmin = (req) => {
    return req.user.role === 'admin' ? true: false;
}

express().get(
    '/',
    initialMiddleware,
    condition(isAdmin)(
        [validateRequestAdmin, otherMiddlewareAdmin], // true
        [validateRequestOthers] // false
    ),
    otherMiddlewares,
    finalMiddleware,
    errorMiddleware
);
```

Returns a number

```js
import condition from 'condition-middleware';

const getRoleCondition = (req) => {
    const role = req.user.role;
    if(role === 'admin'){
        return 0
    } else if(role === 'supervisor') {
        return 1
    } else {
        return 2
    }
}

express().get(
    '/',
    initialMiddleware,
    condition(getRoleCondition)(
        [validateRequestAdmin, otherMiddlewareAdmin], // 0
        [validateRequestSupervisor], // 1
        [validateRequestOthers] // 2
    ),
    otherMiddlewares,
    finalMiddleware,
    errorMiddleware
);
```

When passing an object with a list of middlewares, then you can return in the condition any stuff that you are using in the object. If the value returned in the condition is not found in the object, then no middleware inside the condition middleware will be executed.

```js
import condition from 'condition-middleware';

const getRoleCondition = (req) => {
    const role = req.user.role;
    if(role === 'admin'){
        return 'admin'
    } else if(role === 'supervisor') {
        return 'supervisor'
    } else {
        return 'others'
    }
}

express().get(
    '/',
    initialMiddleware,
    condition(getRoleCondition)(
        {
            admin: [validateRequestAdmin, otherMiddlewareAdmin], 
            supervisor: [validateRequestSupervisor],
            others: [validateRequestOthers]
        }
    ),
    otherMiddlewares,
    finalMiddleware,
    errorMiddleware
);
```

You can also nest the condition middleware inside other condition middlewares, using the different ways of use.

```js
import condition from 'condition-middleware';

express().get(
    '/',
    initialMiddleware,
    condition(isAdmin)(
        [validateRequestAdmin, condition(hasCustomValue)(
            {
                value1: [performAnyOperation1],
                value2: [performAnyOperation2],
            }
        )],
        [validateRequestOthers]
    ),
    otherMiddlewares,
    finalMiddleware,
    errorMiddleware
);
```

Right now it only can be used with express.

