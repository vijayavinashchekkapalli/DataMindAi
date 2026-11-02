import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import Business from '../models/Business.js';
import { generateToken } from '../utils/generateToken.js';
import { validatePassword } from '../utils/passwordValidator.js';
import { signupSchema, loginSchema } from '../validators/authValidator.js';
import { getLocalStore, isLocalMode, createLocalId } from '../utils/localStore.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const sanitizeUser = (user) => ({
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
});

const findLocalUser = (email, phone) => {
  const store = getLocalStore();
  return store.users.find((user) => {
    if (email && user.email === email) return true;
    if (phone && user.phoneNumber === phone) return true;
    return false;
  }) || null;
};

export const signup = async (req, res, next) => {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Validation failed' });
    }

    const { firstName, lastName, email, phoneNumber, password, confirmPassword } = parsed.data;
    const inputEmail = email && email.trim();
    const inputPhone = phoneNumber && phoneNumber.trim();

    if (!inputEmail && !inputPhone) {
      return res.status(400).json({ success: false, message: 'Email or phone number is required.' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters, include uppercase, lowercase, number and special character.',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    if (isLocalMode()) {
      const existingUser = findLocalUser(inputEmail, inputPhone);
      if (existingUser) {
        return res.status(409).json({ success: false, message: 'An account with this email or phone number already exists.' });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = {
        _id: createLocalId(),
        firstName,
        lastName,
        email: inputEmail || '',
        phoneNumber: inputPhone || '',
        passwordHash,
        authProvider: 'local',
        businessName: `${firstName}'s Shop`,
        businessCategory: 'General Retail',
        location: 'Not specified',
        currency: 'USD',
      };

      const business = {
        _id: createLocalId(),
        userId: user._id,
        businessName: user.businessName,
        businessCategory: user.businessCategory,
        location: user.location,
        currency: user.currency,
      };

      getLocalStore().users.push(user);
      getLocalStore().businesses.push(business);

      return res.status(201).json({
        success: true,
        message: 'Account created successfully.',
        data: { user: sanitizeUser(user), requiresLogin: true },
      });
    }

    const existingUser = await User.findOne({
      $or: [
        ...(inputEmail ? [{ email: inputEmail }] : []),
        ...(inputPhone ? [{ phoneNumber: inputPhone }] : []),
      ],
    });

    if (existingUser) {
      return res.status(409).json({ success: false, message: 'An account with this email or phone number already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      firstName,
      lastName,
      email: inputEmail || undefined,
      phoneNumber: inputPhone || undefined,
      passwordHash,
      authProvider: 'local',
    });

    const business = await Business.create({
      userId: user._id,
      businessName: `${firstName}'s Shop`,
      businessCategory: 'General Retail',
      location: 'Not specified',
      currency: 'USD',
    });

    user.businessId = business._id;
    await user.save();

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data: { user: sanitizeUser(user), requiresLogin: true },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Login validation failed' });
    }

    const { email, phoneNumber, password } = parsed.data;

    if (isLocalMode()) {
      const user = findLocalUser(email || '', phoneNumber || '');
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      if (!user.passwordHash) {
        return res.status(401).json({ success: false, message: 'This account uses Google sign-in. Please use Google login.' });
      }

      const matches = await bcrypt.compare(password, user.passwordHash);
      if (!matches) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      const token = generateToken(user._id);
      return res.status(200).json({ success: true, message: 'Login successful.', data: { token, user: sanitizeUser(user) } });
    }

    const user = await User.findOne({
      $or: [
        ...(email ? [{ email }] : []),
        ...(phoneNumber ? [{ phoneNumber }] : []),
      ],
    }).select('+passwordHash');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (!user.passwordHash) {
      return res.status(401).json({ success: false, message: 'This account uses Google sign-in. Please use Google login.' });
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: sanitizeUser(user),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const googleLogin = async (req, res, next) => {
  try {
    const token = req.body?.token || req.body?.credential;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Google token is required.' });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ success: false, message: 'Google OAuth is not configured on the server.' });
    }

    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({ idToken: token, audience: clientId });
    } catch (verificationError) {
      console.warn('[auth] Google ID token verification failed:', verificationError.message);
      return res.status(401).json({ success: false, message: 'Google credential is invalid or expired. Please try signing in again.' });
    }

    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      return res.status(400).json({ success: false, message: 'Google token verification failed.' });
    }

    if (isLocalMode()) {
      const store = getLocalStore();
      let user = store.users.find((item) => item.googleId === payload.sub || item.email?.toLowerCase() === payload.email.toLowerCase());

      if (!user) {
        user = {
          _id: createLocalId(),
          firstName: payload.given_name || 'Google',
          lastName: payload.family_name || 'User',
          email: payload.email.toLowerCase(),
          phoneNumber: '',
          googleId: payload.sub,
          authProvider: 'google',
          businessName: 'Google Business',
          businessCategory: 'General Retail',
          location: 'Not specified',
          currency: 'USD',
        };
        store.users.push(user);
      } else {
        user.googleId = payload.sub;
      }

      if (!store.businesses.some((business) => String(business.userId) === String(user._id))) {
        store.businesses.push({
          _id: createLocalId(),
          userId: user._id,
          businessName: user.businessName || `${user.firstName}'s Shop`,
          businessCategory: user.businessCategory || 'General Retail',
          location: user.location || 'Not specified',
          currency: user.currency || 'USD',
        });
      }

      const localToken = generateToken(user._id);
      return res.status(200).json({ success: true, message: 'Google login successful.', data: { token: localToken, user: sanitizeUser(user) } });
    }

    const existingUser = await User.findOne({
      $or: [{ email: payload.email }, { googleId: payload.sub }],
    });

    let user = existingUser;

    if (!user) {
      user = await User.create({
        firstName: payload.given_name || 'Google',
        lastName: payload.family_name || 'User',
        email: payload.email,
        googleId: payload.sub,
        authProvider: 'google',
      });

      await Business.create({
        userId: user._id,
        businessName: 'Google Business',
        businessCategory: 'General Retail',
        location: 'Not specified',
        currency: 'USD',
      });
    } else if (!user.googleId) {
      user.googleId = payload.sub;
      await user.save();
    }

    const jwtToken = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: 'Google login successful.',
      data: {
        token: jwtToken,
        user: sanitizeUser(user),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: sanitizeUser(req.user),
  });
};

export const logout = async (req, res) => {
  return res.status(200).json({ success: true, message: 'Logged out successfully.' });
};
