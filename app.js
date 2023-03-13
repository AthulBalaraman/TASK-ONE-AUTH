const express = require("express");
const app = express();
const bodyParser = require('body-parser')
const PORT = 5000;
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const session = require('express-session')
const cookieParser = require('cookie-parser')
const db = require("./config/db");
const User = require("./models/User");
const { collection } = require("./models/User");
require('dotenv').config()


// Twilio components
const accountSid = process.env.ACCOUNT_SID
const authToken = process.env.AUTH_TOKEN
const client = require('twilio')(accountSid,authToken)

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session
app.use(session({
  secret: process.env.SECRET,
  saveUninitialized:true,
  cookie: { maxAge: 60000 },
  resave: false 
}));
app.use(function (req, res, next) {
  res.set(
      "Cache-Control",
      "no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0"
  );
  next();
});

// Setting view engine
app.set("view engine", "ejs");

// Setting default views path
app.set("views", "./view");

let phoneNumber;
let OTP;

db(() => {
  try {
    console.log("DataBase Successfully Connected");
  } catch (error) {
    console.log("Database Not Connected : ", error);
  }
});

// ----------------------------------------  Routes   ------------------------------------------------------

app.get("/", (req, res) => {
  if(req.session.user){
    res.render('homePage')
  }
  else{
    res.render("login");
  }
});

app.post('/loginAction',async(req,res)=>{
  const {phoneNumber, password} = req.body
  
  // Finding the user 
  let user = await User.findOne({phoneNumber:phoneNumber})
  !user && res.statusCode(404).json({message:"user not found"})
  const dbPassword = user.password
  await bcrypt.compare(password,dbPassword).then((match)=>{
    if(!match){
      req.session.user = req.body.phoneNumber
      res.status(400).json({message:"password is incorrect"})
    }
    else{
      res.render('homePage')
    }
  })
  
})


app.get("/registerPage", (req, res) => {
  res.render("register");
});

app.post("/registerAction", async (req, res) => {
  phoneNumber = req.body.phoneNumber
  const password = req.body.password;
  const otpVerified = false;
  // Generating OTP
  OTP = crypto.randomInt(100000, 999999).toString();
 
  // encrypting user password for security
  const hashedPassword = await bcrypt.hash(password, 10);

  // Storing the user details to the database
  const newUser = new User({
    phoneNumber: phoneNumber,
    password: hashedPassword,
    otpVerified: otpVerified,
  });
  const user = await newUser.save();

 
  // Sending otp using twilio
  const message = `Your OTP from Athul Balaraman's First task is ${OTP}`;
  client.messages
    .create({
      body: message,
      from: process.env.PHONE_NUMBER,
      to: `+91${phoneNumber}`
    })
    .then((message) => console.log(message.sid))
    .catch((error) => console.log(error.message));
    res.render('otpPage')
});

app.post('/checkOtp',async(req,res)=>{
  const otp = req.body.otp 
  
  if(OTP === otp)
  {
  // Finding the user (Phone number is unique)
   let user = await User.findOne({phoneNumber:phoneNumber})
   console.log("This is User from otp", user)
  // Updating the otp verified as true 
   await User.updateOne({phoneNumber:phoneNumber},{
    $set:{
      otpVerified:true
    }
   })
   res.render('login')
  }
  else{
    res.render('otpPage')
  }
})


app.get('/logout',(req,res)=>{
  req.session.destroy((err)=>{
    if(err)
      res.send(err)
    else
     res.redirect('/')
  })
})

app.listen(PORT, () => {
  console.log("Server connected");
});
