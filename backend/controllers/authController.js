import bcrypt from 'bcryptjs';
import db from '../config/db.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateOtpCode,
  generateSecureToken,
  cookieOptions,
} from '../utils/jwt.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from '../utils/notifier.js';

export const sanitizeUser = (user) => {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
};

export const register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      role = 'CITIZEN',
      county,
      subCounty,
      ward,
      address,
    } = req.body;
    const existingByEmail = await db.findUserByEmail(email);
    if (existingByEmail) {
      return res.status(409).json({
        status: 'error',
        message: 'An account with this email address already exists.',
      });
    }

    if (phone) {
      const existingByPhone = await db.findUserByPhone(phone);
      if (existingByPhone) {
        return res.status(409).json({
          status: 'error',
          message: 'An account with this phone number already exists.',
        });
      }
    }

    const assignedRole = role === 'ADMIN' || role === 'SUPER_ADMIN' ? 'CITIZEN' : role;

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const newUser = await db.createUser({
      name,
      email,
      phone,
      password: hashedPassword,
      role: assignedRole,
      isVerified: false,
      emailVerified: false,
      phoneVerified: false,
      county,
      subCounty,
      ward,
      address,
    });

    const verificationCode = generateOtpCode();
    const verificationToken = generateSecureToken();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await db.createVerificationToken({
      identifier: email,
      code: verificationCode,
      token: verificationToken,
      type: 'EMAIL',
      userId: newUser.id,
      expiresAt,
    });
    await sendVerificationEmail({
      email: newUser.email,
      code: verificationCode,
      token: verificationToken,
    });
    const tokenPayload = {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
    };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);
    const refreshExpiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.createRefreshToken({
      token: refreshToken,
      userId: newUser.id,
      expiresAt: refreshExpiryDate,
    });
    res.cookie('refreshToken', refreshToken, cookieOptions);

    const isDev = process.env.NODE_ENV !== 'production';

    return res.status(201).json({
      status: 'success',
      message: 'Account registered successfully. A verification code has been sent.',
      data: {
        user: sanitizeUser(newUser),
        accessToken,
        refreshToken,
        ...(isDev && {
          verificationCode,
          verificationToken,
        }),
      },
    });
  } catch (error) {
    next(error);
  }
};
export const login = async (req, res, next) => {
  try {
    const { email, phone, identifier, password } = req.body;
    const loginTarget = identifier || email || phone;

    if (!loginTarget || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide email/phone and password.',
      });
    }
    const user = await db.findUserByIdentifier(loginTarget);
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials. User not found.',
      });
    }
    if (!user.isActive) {
      return res.status(403).json({
        status: 'error',
        message: 'Account is deactivated. Please contact support.',
      });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials. Password incorrect.',
      });
    }
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);
    const refreshExpiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.createRefreshToken({
      token: refreshToken,
      userId: user.id,
      expiresAt: refreshExpiryDate,
    });
    res.cookie('refreshToken', refreshToken, cookieOptions);

    return res.status(200).json({
      status: 'success',
      message: 'Logged in successfully.',
      data: {
        user: sanitizeUser(user),
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};
export const logout = async (req, res, next) => {
  try {
    const tokenToRevoke = req.cookies?.refreshToken || req.body?.refreshToken;

    if (tokenToRevoke) {
      await db.revokeRefreshToken(tokenToRevoke);
    }
    res.clearCookie('refreshToken', cookieOptions);

    return res.status(200).json({
      status: 'success',
      message: 'Logged out successfully.',
    });
  } catch (error) {
    next(error);
  }
};
export const verify = async (req, res, next) => {
  try {
    const { code, token, email, phone, identifier, type = 'EMAIL' } = req.body;
    const targetIdentifier = identifier || email || phone || (req.user ? req.user.email : null);
    const tokenRecord = await db.findVerificationToken({
      identifier: targetIdentifier,
      token,
      code,
    });

    if (!tokenRecord) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid verification code or token.',
      });
    }
    if (new Date(tokenRecord.expiresAt) < new Date()) {
      await db.deleteVerificationToken(tokenRecord.id);
      return res.status(400).json({
        status: 'error',
        message: 'Verification code has expired. Please request a new one.',
      });
    }
    let user = null;
    if (tokenRecord.userId) {
      user = await db.findUserById(tokenRecord.userId);
    }
    if (!user && tokenRecord.identifier) {
      user = await db.findUserByIdentifier(tokenRecord.identifier);
    }

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User associated with this verification code was not found.',
      });
    }
    const updatePayload = {
      isVerified: true,
      ...(tokenRecord.type === 'PHONE' ? { phoneVerified: true } : { emailVerified: true }),
    };

    const updatedUser = await db.updateUser(user.id, updatePayload);
    await db.deleteVerificationToken(tokenRecord.id);

    return res.status(200).json({
      status: 'success',
      message: `${tokenRecord.type === 'PHONE' ? 'Phone' : 'Email'} verified successfully.`,
      data: {
        user: sanitizeUser(updatedUser),
      },
    });
  } catch (error) {
    next(error);
  }
};
export const refreshToken = async (req, res, next) => {
  try {
    const currentRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!currentRefreshToken) {
      return res.status(401).json({
        status: 'error',
        message: 'Refresh token is required.',
      });
    }
    const decoded = verifyRefreshToken(currentRefreshToken);
    if (!decoded || !decoded.id) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired refresh token signature.',
      });
    }
    const tokenRecord = await db.findRefreshToken(currentRefreshToken);
    if (!tokenRecord || tokenRecord.revokedAt) {
      return res.status(401).json({
        status: 'error',
        message: 'Refresh token has been revoked or is invalid.',
      });
    }

    if (new Date(tokenRecord.expiresAt) < new Date()) {
      return res.status(401).json({
        status: 'error',
        message: 'Refresh token has expired. Please log in again.',
      });
    }
    const user = await db.findUserById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'User is inactive or no longer exists.',
      });
    }
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };
    const newAccessToken = generateAccessToken(tokenPayload);
    await db.revokeRefreshToken(currentRefreshToken);
    const rotatedRefreshToken = generateRefreshToken(tokenPayload);
    const newRefreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.createRefreshToken({
      token: rotatedRefreshToken,
      userId: user.id,
      expiresAt: newRefreshExpiry,
    });

    res.cookie('refreshToken', rotatedRefreshToken, cookieOptions);

    return res.status(200).json({
      status: 'success',
      message: 'Token refreshed successfully.',
      data: {
        accessToken: newAccessToken,
        refreshToken: rotatedRefreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};
export const forgotPassword = async (req, res, next) => {
  try {
    const { email, phone, identifier } = req.body;
    const target = identifier || email || phone;

    if (!target) {
      return res.status(400).json({
        status: 'error',
        message: 'Email or phone number is required.',
      });
    }

    const user = await db.findUserByIdentifier(target);

    let resetToken = null;
    let resetCode = null;

    if (user && user.isActive) {
      resetToken = generateSecureToken();
      resetCode = generateOtpCode();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // 2. Save token
      await db.createPasswordResetToken({
        userId: user.id,
        token: resetToken,
        expiresAt,
      });

      await db.createPasswordResetToken({
        userId: user.id,
        token: resetCode,
        expiresAt,
      });

      // 3. Send email notification
      await sendPasswordResetEmail({
        email: user.email,
        token: resetToken,
        code: resetCode,
      });
    }

    const isDev = process.env.NODE_ENV !== 'production';
    return res.status(200).json({
      status: 'success',
      message: 'If the provided account exists, a password reset link or code has been sent.',
      ...(isDev && resetToken && {
        dev: {
          resetToken,
          resetCode,
        },
      }),
    });
  } catch (error) {
    next(error);
  }
};
export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Token and new password are required.',
      });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Passwords do not match.',
      });
    }
    const resetRecord = await db.findPasswordResetToken(token);
    if (!resetRecord) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired password reset token.',
      });
    }
    if (new Date(resetRecord.expiresAt) < new Date()) {
      await db.deletePasswordResetToken(token);
      return res.status(400).json({
        status: 'error',
        message: 'Password reset token has expired. Please request a new one.',
      });
    }
    const user = await db.findUserById(resetRecord.userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User associated with this reset token was not found.',
      });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.updateUser(user.id, { password: hashedPassword });
    await db.deletePasswordResetToken(token);
    await db.revokeAllUserRefreshTokens(user.id);
    res.clearCookie('refreshToken', cookieOptions);

    return res.status(200).json({
      status: 'success',
      message: 'Password has been reset successfully. Please log in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};
export const getCurrentUser = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized. Authentication required.',
      });
    }

    const user = await db.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found.',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        user: sanitizeUser(user),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const verifyEmailPhone = verify;
export const getMe = getCurrentUser;

export default {
  register,
  login,
  logout,
  verify,
  refreshToken,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  verifyEmailPhone,
  getMe,
};
