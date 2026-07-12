import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useState } from 'react';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';

import { useAuthStore } from '@/stores/authStore';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
  }>({});

  const registerMutation = useMutation({
    mutationFn: () => register(email, password),
    onSuccess: () => {
      router.replace('/(tabs)');
    },
    onError: (error: Error) => {
      if (error.message.includes('exists') || error.message.includes('already')) {
        setErrors({ email: 'An account with this email already exists' });
      } else {
        Alert.alert('Registration Failed', error.message || 'Unable to create account. Please try again.');
      }
    },
  });

  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and a number';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!agreeToTerms) {
      newErrors.terms = 'You must agree to the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = () => {
    if (validate()) {
      registerMutation.mutate();
    }
  };

  const handleOAuthRegister = (provider: 'google' | 'apple') => {
    Alert.alert('Coming Soon', `${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-up will be available soon.`);
  };

  const getPasswordStrength = (): { label: string; color: string; width: string } => {
    if (!password) return { label: '', color: 'bg-dark-700', width: '0%' };

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;

    if (strength <= 2) return { label: 'Weak', color: 'bg-red-500', width: '33%' };
    if (strength <= 3) return { label: 'Medium', color: 'bg-yellow-500', width: '66%' };
    return { label: 'Strong', color: 'bg-emerald-500', width: '100%' };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-dark-900"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="px-6 pt-16 pb-6">
          <Pressable onPress={() => router.back()} className="mb-8">
            <Ionicons name="close" size={28} color="#94A3B8" />
          </Pressable>

          <View className="items-center mb-6">
            <View className="w-16 h-16 rounded-2xl bg-emerald-600 items-center justify-center mb-4">
              <Ionicons name="analytics" size={32} color="white" />
            </View>
            <Text className="text-3xl font-bold text-white">Create Account</Text>
            <Text className="text-dark-400 mt-2">Join SportOracle today</Text>
          </View>
        </View>

        {/* Form */}
        <View className="px-6 flex-1">
          {/* Email Input */}
          <View className="mb-4">
            <Text className="text-dark-300 text-sm font-medium mb-2">Email</Text>
            <View className={`flex-row items-center bg-dark-800 rounded-xl border ${errors.email ? 'border-red-500' : 'border-dark-700'}`}>
              <View className="pl-4">
                <Ionicons name="mail-outline" size={20} color="#64748B" />
              </View>
              <TextInput
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors({ ...errors, email: undefined });
                }}
                placeholder="Enter your email"
                placeholderTextColor="#64748B"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                className="flex-1 px-3 py-4 text-white"
              />
            </View>
            {errors.email && (
              <Text className="text-red-400 text-xs mt-1">{errors.email}</Text>
            )}
          </View>

          {/* Password Input */}
          <View className="mb-4">
            <Text className="text-dark-300 text-sm font-medium mb-2">Password</Text>
            <View className={`flex-row items-center bg-dark-800 rounded-xl border ${errors.password ? 'border-red-500' : 'border-dark-700'}`}>
              <View className="pl-4">
                <Ionicons name="lock-closed-outline" size={20} color="#64748B" />
              </View>
              <TextInput
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) setErrors({ ...errors, password: undefined });
                }}
                placeholder="Create a password"
                placeholderTextColor="#64748B"
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                className="flex-1 px-3 py-4 text-white"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} className="pr-4">
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#64748B"
                />
              </Pressable>
            </View>
            {errors.password && (
              <Text className="text-red-400 text-xs mt-1">{errors.password}</Text>
            )}

            {/* Password Strength Indicator */}
            {password.length > 0 && (
              <View className="mt-2">
                <View className="h-1 bg-dark-700 rounded-full overflow-hidden">
                  <View
                    className={`h-full ${passwordStrength.color}`}
                    style={{ width: passwordStrength.width }}
                  />
                </View>
                <Text className="text-dark-500 text-xs mt-1">
                  Password strength: {passwordStrength.label}
                </Text>
              </View>
            )}
          </View>

          {/* Confirm Password Input */}
          <View className="mb-4">
            <Text className="text-dark-300 text-sm font-medium mb-2">Confirm Password</Text>
            <View className={`flex-row items-center bg-dark-800 rounded-xl border ${errors.confirmPassword ? 'border-red-500' : 'border-dark-700'}`}>
              <View className="pl-4">
                <Ionicons name="lock-closed-outline" size={20} color="#64748B" />
              </View>
              <TextInput
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
                }}
                placeholder="Confirm your password"
                placeholderTextColor="#64748B"
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                className="flex-1 px-3 py-4 text-white"
              />
              {confirmPassword.length > 0 && (
                <View className="pr-4">
                  {password === confirmPassword ? (
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  ) : (
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  )}
                </View>
              )}
            </View>
            {errors.confirmPassword && (
              <Text className="text-red-400 text-xs mt-1">{errors.confirmPassword}</Text>
            )}
          </View>

          {/* Terms Checkbox */}
          <Pressable
            onPress={() => {
              setAgreeToTerms(!agreeToTerms);
              if (errors.terms) setErrors({ ...errors, terms: undefined });
            }}
            className="flex-row items-start mb-6"
          >
            <View className={`w-5 h-5 rounded border-2 mr-3 mt-0.5 items-center justify-center ${
              agreeToTerms ? 'bg-emerald-600 border-emerald-600' : errors.terms ? 'border-red-500' : 'border-dark-500'
            }`}>
              {agreeToTerms && <Ionicons name="checkmark" size={14} color="white" />}
            </View>
            <Text className="flex-1 text-dark-400 text-sm">
              I agree to the{' '}
              <Text className="text-emerald-400">Terms of Service</Text>
              {' '}and{' '}
              <Text className="text-emerald-400">Privacy Policy</Text>
            </Text>
          </Pressable>
          {errors.terms && (
            <Text className="text-red-400 text-xs -mt-4 mb-4">{errors.terms}</Text>
          )}

          {/* Register Button */}
          <Pressable
            onPress={handleRegister}
            disabled={registerMutation.isPending}
            className={`py-4 rounded-xl items-center ${registerMutation.isPending ? 'bg-emerald-700' : 'bg-emerald-600'}`}
          >
            {registerMutation.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-base">Create Account</Text>
            )}
          </Pressable>

          {/* Divider */}
          <View className="flex-row items-center my-6">
            <View className="flex-1 h-px bg-dark-700" />
            <Text className="text-dark-500 mx-4">or sign up with</Text>
            <View className="flex-1 h-px bg-dark-700" />
          </View>

          {/* OAuth Buttons */}
          <View className="flex-row space-x-3">
            <Pressable
              onPress={() => handleOAuthRegister('google')}
              className="flex-1 flex-row items-center justify-center py-4 rounded-xl bg-dark-800 border border-dark-700"
            >
              <Ionicons name="logo-google" size={20} color="#EA4335" />
              <Text className="text-white font-medium ml-2">Google</Text>
            </Pressable>

            {Platform.OS === 'ios' && (
              <Pressable
                onPress={() => handleOAuthRegister('apple')}
                className="flex-1 flex-row items-center justify-center py-4 rounded-xl bg-dark-800 border border-dark-700"
              >
                <Ionicons name="logo-apple" size={20} color="white" />
                <Text className="text-white font-medium ml-2">Apple</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Footer */}
        <View className="px-6 py-8">
          <View className="flex-row justify-center">
            <Text className="text-dark-400">Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <Text className="text-emerald-400 font-medium">Sign In</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
