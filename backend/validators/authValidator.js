import { z } from 'zod';

export const signupSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  email: z.string().trim().email('Please enter a valid email').optional().or(z.literal('')),
  phoneNumber: z.string().trim().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Confirm password is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email').optional().or(z.literal('')),
  phoneNumber: z.string().trim().optional(),
  password: z.string().min(1, 'Password is required'),
}).refine((data) => data.email || data.phoneNumber, {
  message: 'Email or phone number is required',
  path: ['email'],
});
