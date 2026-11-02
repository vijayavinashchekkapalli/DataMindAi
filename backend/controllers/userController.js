import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { getLocalStore, isLocalMode } from '../utils/localStore.js';

export const getProfile = async (req, res) => {
  const user = req.user;
  res.status(200).json({
    success: true,
    data: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      authProvider: user.authProvider,
      businessName: user.businessName,
      businessCategory: user.businessCategory,
      location: user.location,
      currency: user.currency,
    },
  });
};

export const updateProfile = async (req, res, next) => {
  try {
    const allowedFields = ['firstName', 'lastName', 'phoneNumber', 'businessName', 'businessCategory', 'location', 'currency'];
    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (isLocalMode()) {
      const store = getLocalStore();
      const userIndex = store.users.findIndex((user) => user._id === req.user._id);
      if (userIndex === -1) return res.status(404).json({ success: false, message: 'User not found.' });

      const user = store.users[userIndex];
      Object.assign(user, updates);

      return res.status(200).json({ success: true, message: 'Profile updated successfully.', data: user });
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All password fields are required.' });
    }

    if (isLocalMode()) {
      const store = getLocalStore();
      const user = store.users.find((item) => item._id === req.user._id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
      if (!user.passwordHash) {
        return res.status(400).json({ success: false, message: 'Google-authenticated accounts cannot change local password.' });
      }

      const matches = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!matches) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({ success: false, message: 'New password and confirm password do not match.' });
      }

      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
      if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({ success: false, message: 'Password must be 8+ characters with uppercase, lowercase, number and special character.' });
      }

      user.passwordHash = await bcrypt.hash(newPassword, 12);
      return res.status(200).json({ success: true, message: 'Password changed successfully.' });
    }

    const user = await User.findById(req.user._id).select('+passwordHash');

    if (!user.passwordHash) {
      return res.status(400).json({ success: false, message: 'Google-authenticated accounts cannot change local password.' });
    }

    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'New password and confirm password do not match.' });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ success: false, message: 'Password must be 8+ characters with uppercase, lowercase, number and special character.' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.status(200).json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    next(error);
  }
};
