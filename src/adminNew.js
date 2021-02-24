import express from 'express';
import { body, validationResult } from 'express-validator';

import passport from 'passport';
import dotenv from 'dotenv';
import { Strategy, ExtractJwt } from 'passport-jwt';
import jwt from 'jsonwebtoken';

import {
  comparePasswords,
  findByUsername,
  findById,
} from './users.js';

dotenv.config();

const {
    PORT: port = 3000,
    JWT_SECRET: jwtSecret,
    TOKEN_LIFETIME: tokenLifetime = 60,
    DATABASE_URL: databaseUrl,
  } = process.env;

  if (!jwtSecret || !databaseUrl) {
    console.error('Vantar .env gildi');
    process.exit(1);
  }


export const router = express.Router();

/**
 * Higher-order fall sem umlykur async middleware með villumeðhöndlun.
 *
 * @param {function} fn Middleware sem grípa á villur fyrir
 * @returns {function} Middleware með villumeðhöndlun
 */
function catchErrors(fn) {
    return (req, res, next) => fn(req, res, next).catch(next);
  }

const jwtOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: jwtSecret,
  };

  async function strat(data, next) {
    // fáum id gegnum data sem geymt er í token
    const user = await findById(data.id);

    if (user) {
      next(null, user);
    } else {
      next(null, false);
    }
  }

passport.use(new Strategy(jwtOptions, strat));

router.use(passport.initialize());


// Gott að skilgreina eitthvað svona til að gera user hlut aðgengilegan í
// viewum ef við erum að nota þannig
router.use((req, res, next) => {
    if (req.isAuthenticated()) {
      // getum núna notað user í viewum
      res.locals.user = req.user;
    }

    next();
  });

 router.get('/admin', (req, res) => {
     res.json({
       login: '/login',
       admin: '/admin',
     });
   });

// router.get('/login', (req, res) => {

//   });

router.post('/', async (req, res) => {
    const { username, password = '' } = req.body;

    const user = await findByUsername(username);

    if (!user) {
      return res.status(401).json({ error: 'No such user' });
    }
    const passwordIsCorrect = await comparePasswords(password, user.password);


    if (passwordIsCorrect) {
      const payload = { id: user.id };
      const tokenOptions = { expiresIn: tokenLifetime };
      const token = jwt.sign(payload, jwtOptions.secretOrKey, tokenOptions);
      return res.json({ token });
    }

    return res.status(401).json({ error: 'Invalid password' });
  });

function requireAuthentication(req, res, next) {
    return passport.authenticate(
      'jwt',
      { session: false },
      (err, user, info) => {
        if (err) {
          return next(err);
        }

        if (!user) {
          const error = info.name === 'TokenExpiredError'
            ? 'expired token' : 'invalid token';

          return res.status(401).json({ error });
        }

        // Látum notanda vera aðgengilegan í rest af middlewares
        req.user = user;
        return next();
      },
    )(req, res, next);
}

async function secret(req, res){
    res.json({data: 'top secret'});
}
/// fer inna local/admin/ ef ekkert er á eftir admin þá ferðu þarna inn þetta er síðan sem er að eyða gögnum en þaðð á eftir að verða til
router.get('/', requireAuthentication,catchErrors(secret));

router.post()