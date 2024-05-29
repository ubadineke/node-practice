const crypto = require('crypto')
const { promisify } = require('util')
const jwt = require('jsonwebtoken')
const User = require('./../models/userModel')
const sendEmail = require('./../utils/email')

const signToken = id => { return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
})
};

//Refactored and set out function to send Token 
const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);
    const cookieOptions = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
        httpOnly: true
    };
    if(process.env.NODE_ENV === 'production') cookieOptions.secure = true;
        
        res.cookie('jwt', token, cookieOptions)
        user.password = undefined;
    
    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user
        }
    })
}

exports.signup = async (req, res, next) => {
    try{
    //const newUser = await User.create(req.body)
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email, 
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
        passwordChangedAt: req.body.passwordChangedAt,
        role: req.body.role
    });
    createSendToken(newUser, 201, res)
    } catch (err){
        res.status(404).json({
            status: 'fail',
            message: err
        })
    }
}

exports.login = async (req, res, next) => {
    // const email = req.body.email
    // const password = req.body.password
    //USING OBJECT DESTRUCTURING
    const { email, password } = req.body
    // 1) Check if email and password exists
    if(!email || !password) {
    return res.status(400).json({
            status: 'fail',
            message: 'Please provide email and password'
        })
    
    }
    // 2) Check if user exists && password exists
    const user = await User.findOne({ email }).select('+password');

    if(!user || !(await user.correctPassword(password, user.password))){
        return res.status(401).json({
            status: 'fail',
            message: 'Incorrect email or password'
        })
    }
    
    // 3) If everything ok. send token to client 
    createSendToken(user, 200, res)
}

exports.protect = async (req, res, next) => {
    // 1) Getting token and check if its there
    let token; // token variable initially declared here due to block scope ES6
    if( req.headers.authorization && req.headers.authorization.startsWith('Bearer')){
        token = req.headers.authorization.split(' ')[1]
    }

    if(!token) {
        return next(res.status(401).json({message: "You're not logged in!. Please log in to get access"}))
    }
    // 2) Verification token 
    let decoded;
    try{
    decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET) //returns the payload which is the user's id

    } catch(err){
    return res.status(401).json({
            status: 'fail',
            message: ["Invalid token, Please log in", {Error: err}]
        })
    }
    
    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id)
    if(!currentUser) {
       // return next(res.json({message: ["The user belonging to this token does not exist"]}))
       return res.status(401).json({
        status:  'fail',
        message: "The user belonging to this token does not exist"
    })
}
    
    // 4) Check if user changed password after the token was issued
    if(currentUser.changedPasswordAfter(decoded.iat)){
        return res.status(401).json({
            status: 'fail',
            message: "User recently changed passowrd! Please log in again!"
        })
    }

    //GRANT ACCESS TO PROTECTED ROUTE
    req.user = currentUser;
    next();
}

exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if(!roles.includes(req.user.role)){
            // return res.status(403).json({
            //     status: 'fail',
            //     message: "You do not have permission to perform this action!"
            // }) 
            return next(res.status(403).json({message:"You do not have permission to perform this action"}))
        }

    next();
    }
}

exports.forgotPassword = async (req, res, next) => {
    // 1) Get user based on posted email
    const user = await User.findOne({ email: req.body.email })
    if (!user) {
        return next(res.status(404).json({message:"There is no user with this email address"}))
    }

    //2) Generate the random reset token 
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    //3) Send it to user's email
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`

    const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\n If you didn't forget your password, Please ignore this email!`

    try{
       await sendEmail({
        email: user.email,
        subject: 'Your password reset token (valid for 10min)',
        message
    });

    res.status(200).json({
        status: 'success',
        message: 'Token sent to email!'
    }) 
    } catch(err){
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined
        await user.save({ validateBeforeSave: false });

       return res.status(200).json({
            status: 'fail',
            message: err
        })
    }
    
}

exports.resetPassword = async (req, res, next) => {
    // 1) Get user based on the token 
    try{
const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex')
    const user = await User.findOne({passwordResetToken: hashedToken, passwordResetExpires: { $gt: Date.now() }})

    //2) If token has not expired and there is user, set new password
    if (!user){
        return next(res.status(400).json({message:"Token is invalid or has expired"}))
    }

    user.password = req.body.password
    user.passwordConfirm = req.body.passwordConfirm
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined
    await user.save();
    //3) Update changedPasswordAt property 

    //4) Log the user in, send JWT
    const token = signToken(user._id);
    res.status(200).json({
        status: 'success',
        token
    })
    } catch(err){
        return res.status(200).json({
            status: 'fail',
            message: err
        })
    }
    
}

exports.updatePassword = async (req, res, next) => {
    // 1) Get user from collection
    const user = await User.findById(req.user.id).select('+password')

    //2) Check if POSTed current password is correct
    if ((!await user.correctPassword(req.body.passwordCurrent, user.password))){
        return res.status(401.).json('Your current password is wrong')
    }
    //3) If so, update Password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();
    //4) Log user in, send JWT

    createSendToken(user, 200, res)
}

