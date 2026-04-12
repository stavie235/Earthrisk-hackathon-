const User = require('../models/userModel'); 
const bcrypt = require('bcryptjs'); 


const getUserProfile = async (req, res, next) => {
	try {
		const user_id = req.user_id;
		const userInfo = await User.findByID(user_id);

		if(!userInfo) {
			res.status(404);
			return next(new Error("User not found"));
		}


		res.status(200).json(userInfo);
	} catch (error) {
		next(error);
	}
};

const getUserData = async (req, res, next) => {
	try {
		const user_id = req.user_id;
		const userInfo = await User.findByID(user_id);

		if(!userInfo) {
			res.status(404);
			return next(new Error("User not found"));
		}

		res.status(200).json(userInfo);
	} catch (error) {
		next(error);
	}
};

const updateUserProfile = async (req, res, next) => {
	try {
		const user_id = req.user_id;
		const { username, email, password } = req.body;

		const updates = {};
		if (username) updates.username = username;
		if (email) updates.email = email;

		if (password) {
			 const salt = await bcrypt.genSalt(10);
			 updates.safe_password = await bcrypt.hash(password, salt);
		}

		if (Object.keys(updates).length === 0) {
            res.status(400);
			return next(new Error("No changes provided"));
        }

		await User.update(user_id, updates);

		res.status(200).json({ message: "Profile updated successfully" });

	} catch (error) {
		next(error);
	}
};

module.exports = { getUserProfile, getUserData, updateUserProfile };
