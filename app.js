
import _ from "lodash";

import { config } from "dotenv";
import { getsDate, getsDay } from "./date.js";
import bodyParser from "body-parser";
import express from "express";
import mongoose from "mongoose";

import bcrypt from "bcrypt";

import session from "express-session";

const saltRounds = 10;
const app = express();
config();

const port = process.env.PORT || 5000;
// const mongodb_uri = process.env.MONGODB_URI;

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static("public"));

// Initialize session
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      expires: new Date(Date.now() + 36000000),
      httpOnly: true,
    },
  })
);

const date = getsDate();
console.log(date);

mongoose.set("strictQuery", false);
// const mongoUrl=`mongodb+srv://${process.env.CLIENT_IDm}/userTodoDB`
// mongoose.connect(mongoUrl);
mongoose.connect('mongodb://127.0.0.1:27017/userTodoDb');


const itemSchema = {
  name: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
};


const Item = mongoose.model("Item", itemSchema);

const defaultItems = [
  {
    name: "Let's plan our day ✍!",
  },
];


const userSchema = {
  email: String,
  password: String,
  items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Item' }],
};


const User = mongoose.model("User", userSchema);


const listSchema = {
  name: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  item: [itemSchema],
};


const List = mongoose.model("List", listSchema);

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/login", (req, res) => {
  res.render("login");
});


app.get("/list", (req, res) => {
  console.log(req.session);

  if (req.session.user === undefined) {
    return res.redirect("/login");
  }

  const userId = req.session.user._id;

  Item.find({ user: userId })
    .then((foundItems) => {
      if (foundItems.length === 0) {
        res.render("list", { keyHead: date, listTitle: [], userId });
      } else {
        res.render("list", { keyHead: date, listTitle: foundItems, userId });
      }
    })
    .catch((err) => {
      console.log(err);
    });
});

app.get("/:customListName/:id", async (req, res) => {
  const requestTitle = _.capitalize(req.params.customListName);
  const userId = req.params.id;

  try {
    const foundList = await List.findOne({
      name: requestTitle,
      user: userId,
    }).populate('item').exec();

    if (!foundList) {
      // Create a new list associated with the current user
      const listItem = new List({
        name: requestTitle,
        item: defaultItems,
        user: userId,
      });

      await listItem.save();
      res.redirect(`/${requestTitle}/${userId}`);
    } else {
      res.render("list", {
        keyHead: foundList.name,
        listTitle: foundList.item,
        userId,
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});



app.post("/register", async (req, res) => {
  try {
    const userEmail = req.body.username;
    const userPassword = req.body.password;

    bcrypt.hash(userPassword, saltRounds, async function (err, hash) {
      const newUser = new User({
        email: userEmail,
        password: hash,
      });

      await newUser.save();
      console.log("User saved");
      res.redirect("/list");
    });
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.post("/login", async (req, res) => {
  try {
    const userEmail = req.body.username;
    const userPassword = req.body.password;

    const foundUser = await User.findOne({ email: userEmail });
    if (!foundUser) {
      return res.sendStatus(401);
    }

    // Checking bcrypt password
    bcrypt.compare(userPassword, foundUser.password, (err, result) => {
      if (err) {
        console.log(err);
        return res.sendStatus(500);
      }

      if (result === true) {
        req.session.user = foundUser;
        res.redirect("/list");
      } else {
        console.log("Password not matched");
        return res.sendStatus(401);
      }
    });

    // Make sure to create the 'secrets' view
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.post("/list", (req, res) => {
  const list_Name = req.body.list;
  const item_Name = req.body.itemNew;

  if (!item_Name) {
    if (list_Name === date) {
      res.redirect("/list");
    } else {
      res.redirect("/" + list_Name);
    }
  } else {
    const item_new = new Item({ name: item_Name, user: req.session.user });

    if (list_Name === date) {
      item_new.save()
        .then(() => {
          res.redirect("/list");
        })
        .catch((err) => {
          console.log(err);
          res.sendStatus(500);
        });
    } else {
      List.findOne({ name: list_Name })
        .then((foundList) => {
          foundList.item.push(item_new);
          return foundList.save();
        })
        .then(() => {
          res.redirect("/" + list_Name);
        })
        .catch((err) => {
          console.log(err);
          res.sendStatus(500);
        });
    }
  }
});
app.post("/delete", (req, res) => {
  const listHeading = req.body.listName;
  const checkItemId = req.body.checkBox;

  if (!req.session.user) {
    // User is not authenticated
    return res.redirect("/login");
  }

  const userId = req.session.user._id;

  if (listHeading === date) {
    Item.findByIdAndRemove(checkItemId)
      .then(() => {
        console.log("Item deleted successfully");
        res.redirect("/list");
      })
      .catch((err) => {
        console.log(err);
        res.sendStatus(500);
      });
  } else {
    List.findOneAndUpdate(
      { name: listHeading, user: userId },
      { $pull: { item: { _id: checkItemId } } }
    )
      .then(() => {
        res.redirect(`/${listHeading}/${userId}`);
      })
      .catch((err) => {
        console.log(err);
        res.sendStatus(500);
      });
  }
});



app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (!err) {
      res.redirect("/");
    } else {
      console.log(err);
    }
  });
});

app.post("/newList/:userId", async (req, res) => {
  const createdList = req.body.createdList;
  const userId = req.params.userId;
  const itemName = req.body.itemNew;

  try {
    const foundList = await List.findOne({ name: createdList, user: userId }).populate('item').exec();

    if (foundList) {
      // List with the same name already exists for the user
      return res.redirect(`/${createdList}/${userId}`);
    }

    const newItem = new Item({ name: itemName, user: userId });
    const newList = new List({
      name: createdList,
      user: userId // Associate the current user with the list
    });

    newList.item.push(newItem);

    await newList.save();

    res.redirect(`/${createdList}/${userId}`);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.get("/customList/:customListName", async (req, res) => {
  const customListName = req.params.customListName;
  const userId = req.session.user._id;

  try {
    const foundList = await List.findOne({
      name: customListName,
      user: userId,
    }).populate('item').exec();

    if (!foundList) {
      // Custom list not found, handle it accordingly (e.g., show an error message)
      // ...
    } else {
      res.render("list", {
        keyHead: foundList.name,
        listTitle: foundList.item,
        userId,
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});


app.listen(port, () => {
  console.log(`server is running at http://localhost:${port}`);
});