const User = require('./../models/userModel.js')
const express = require('express')

const filterObj = (obj, ...allowedFields) => {
    const newObj = {};
    Object.keys(obj).forEach(el => {
        if (allowedFields.includes(el)) newObj[el] = obj[el];
    })
    return newObj;
}
exports.getAllUsers = async (req, res) => {
    const users = await User.find();

    //SEND RESPONSE

    res.status(200).json({
      status: 'success',
      results: users.length, //returns count of items sent back
       data: {
         users
       }
    })
}

exports.updateMe = async (req, res, next) => {
    // 1) Create error if user POSTs password data 
    if (req.body.password || req.body.passwordConfirm) {
        return (res.status(401).json("This route is not for password updates. Please /updateMyPassword route"))
    }

    // 2) Filter out unwanted field names that are not allowed to be updated
    const filteredBody = filterObj(req.body, 'name', 'email')
    
    // 3) Update user document 
    const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
        new: true,
        runValidators: true
    })

    res.status(200).json({
        status: "success",
        data: {
            user: updatedUser 
        }
    })
} 

exports.deleteMe = async(req, res, next) => {
    await User.findByIdAndUpdate(req.user.id, { active: false })

    res.status(204).json({
        status: 'success',
        data: null
    });
}

exports.getUser = (req, res) => {
    res.status(500).json({
        status: 'error',
        message: "This route is not yet defined"
    })
}

exports.createUser = (req, res) => {
    res.status(500).json({
        status: 'error',
        message: "This route is not yet defined"
    })
}

exports.updateUser = (req, res) => {
    res.status(500).json({
        status: 'error',
        message: "This route is not yet defined"
    })
}

exports.deleteUser = (req, res) => {
    res.status(500).json({
        status: 'error',
        message: "This route is not yet defined"
    })
}