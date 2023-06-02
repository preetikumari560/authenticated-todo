
import _ from 'lodash';

import { configDotenv } from "dotenv"
import { getsDate, getsDay } from './date.js';
import bodyParser from "body-parser"
import express from "express"
import mongoose from "mongoose"

import bcrypt from "bcrypt"

const saltRounds = 10
const app = express()

app.set('view engine', 'ejs')

app.use(bodyParser.urlencoded({ extended: true }))

app.use(express.static("public"))

const date = getsDate()
console.log(date)

mongoose.set('strictQuery', false)

mongoose.connect('mongodb://127.0.0.1:27017/userTodoDb');

const itemSchema = {
  name: String
}

const Item = mongoose.model("Item", itemSchema)

const defaultItems = [{
  name: "Let's plan our day ✍!"
}]

const userSchema = {
  email: String,
  password: String,
  item: [itemSchema]
}

const User = mongoose.model("User", userSchema)

const listSchema={
    name: String,
    item:[itemSchema]

}

const List = mongoose.model("List",listSchema)

app.get('/', (req, res) => { res.render('home') })

app.get('/register', (req, res) => { res.render('register') })

app.get('/login', (req, res) => { res.render('login') })

app.get('/list', (req, res) => {
    Item.find({})
      .then(foundItems => {
        if (foundItems.length === 0) {
          Item.insertMany(defaultItems)
            .then(() => {
              console.log("successfully added");
              res.redirect("/list");
            })
            .catch(err => {
              console.log(err);
            });
        } else {
          res.render("list", { keyHead: date, listTitle: foundItems });
        }
      })
      .catch(err => {
        console.log(err);
      });
  });
  
  app.post('/register', async (req, res) => {
    try {
      const userEmail = req.body.username;
      const userPassword = req.body.password;
  
      bcrypt.hash(userPassword, saltRounds, async function(err, hash) {
        const newUser = new User({
          email: userEmail,
          password: hash
        });
  
        await newUser.save();
        console.log('User saved');
        res.redirect("/list");
      });
    } catch (err) {
      console.log(err);
      res.sendStatus(500);
    }
  });
  

  app.post('/login', async (req, res) => {
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
      res.redirect('/list');
    } else {
      res.redirect('/' + list_Name);
    }
  } else {
    const item_new = new Item({ name: item_Name });

    if (list_Name === date) {
      item_new.save();
      res.redirect("/list");
    } else {
      List.findOne({ name: list_Name }, (err, foundList) => {
        foundList.item.push(item_new);
        foundList.save();
        res.redirect("/" + list_Name);
      });
    }
  }
});
app.post("/delete", (req, res) => {
    const listHeading = req.body.listName;
    const checkItemId = req.body.checkBox;
  
    if (listHeading === date) {
      Item.findByIdAndRemove(checkItemId)
        .then(() => {
          console.log("item deleted successfully");
          res.redirect("/list");
        })
        .catch(err => {
          console.log(err);
        });
    } else {
      List.findOneAndUpdate({ name: listHeading }, { $pull: { item: { _id: checkItemId } } })
        .then(() => {
          res.redirect("/" + listHeading);
        })
        .catch(err => {
          console.log(err);
        });
    }
  });
  


  app.get("/:customListName", async (req, res) => {
    const requesTitle = _.capitalize(req.params.customListName);
  
    try {
      const foundList = await List.findOne({ name: requesTitle });
  
      if (!foundList) {
        // Create a new list:
        const listItem = new List({
          name: requesTitle,
          item: defaultItems,
        });
  
        await listItem.save();
        res.redirect("/" + requesTitle);
      } else {
        res.render("list", { keyHead: foundList.name, listTitle: foundList.item });
      }
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  });
  

//////////////////////////////////////////////////////////

app.post("/newList",(req,res)=>{

           const createdList = req.body.createdList
           res.redirect("/"+createdList)

})

app.listen(5000, () => { console.log(`server is running at port 5000`) })
