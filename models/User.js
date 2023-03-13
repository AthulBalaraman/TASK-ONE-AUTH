const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
 phoneNumber:{
  type:Number,
  required:true,
  unique:true
 },
 password:{
  type:String,
  required:true,
  min:6
 },
 otpVerified:{
  type:Boolean,
 }
})

module.exports = mongoose.model('User', UserSchema)