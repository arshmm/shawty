const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const cors = require("cors");
const path = require("path");
const schema = require("./models/schema");
const { nanoid } = require("nanoid");
const monk = require("monk");
require("dotenv").config();

const db = monk(process.env.MONGO_URI);

const urls = db.get("urls");

urls.createIndex("alias");

const app = express();
app.use(helmet());
app.use(morgan("tiny"));
app.use(express.json());
app.use(cors());

app.get("/:id", async (req, res) => {
  const { id: alias } = req.params;
  try {
    const url = await urls.findOne({ alias });
    if (url) {
      res.redirect(url.url);
    }
    res.redirect(`/?error=${alias}NotFound`);
  } catch (e) {
    res.redirect(`/?error=linkNotFound`);
  }
});

app.post("/url", async (req, res, next) => {
  let { alias, url } = req.body;
  try {
    await schema.validate({ alias, url });

    if (!alias) {
      alias = nanoid(5);
    } else {
      const exists = await urls.findOne({ alias });
      if (exists) {
        throw new Error("alias already eists");
      }
    }

    alias = alias.toLowerCase();

    const newUrl = {
      alias,
      url,
    };

    const created = await urls.insert(newUrl);
    res.json(created);
  } catch (e) {
    console.log("hello");
    next(e);
  }
});

const port = process.env.PORT || 3000;

app.use((error, req, res, next) => {
  if (error.status) {
    res.status(error.status);
  } else {
    res.status(500);
  }
  res.json({
    message: error.message,
    stack: process.env.NODE_ENV === "production" ? "🥞" : error.stack,
  });
});

app.listen(port, () => {
  console.log(`App running on http://localhost:${port}`);
});
