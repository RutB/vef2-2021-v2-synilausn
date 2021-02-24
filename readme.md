# Sýnilausn á verkefni 2 í vef2 2021

[Yfirferð á sýnilausn](https://youtu.be/jxKehIRjWa0).

Keyrt með:

```bash
npm install
createdb vef2-2021-v2
# setja rétt DATABASE_URL í .env
node ./src/setup.js # eða npm run setup
npm run dev
```

Uppsetning á heroku, gefið að appið sé til undir nafninu <APP> og þú sért loggedin á heroku cli:

```bash
heroku git:remote -a <APP>
heroku addons:create heroku-postgresql:hobby-dev
git push heroku main
heroku run npm run setup
```
