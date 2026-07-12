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

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const loginMutation = useMutation({
    mutationFn: () => login(email, password),
    onSuccess: () => {
      router.replace('/(tabs)');
    },
    onError: (error: Error) => {
      Alert.alert('Login Failed', error.message || 'Invalid email or password. Please try again.');
    },
  });

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = () => {
    if (validate()) {
      loginMutation.mutate();
    }
  };

  const handleOAuthLogin = (provider: 'google' | 'apple') => {
    // OAuth implementation would go here
    Alert.alert('Coming Soon', `${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-in will be available soon.`);
  };

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
        <View className="px-6 pt-16 pb-8">
          <Pressable onPress={() => router.back()} className="mb-8">
            <Ionicons name="close" size={28} color="#94A3B8" />
          </Pressable>

          <View className="items-center mb-8">
            <View className="w-16 h-16 rounded-2xl bg-emerald-600 items-center justify-center mb-4">
              <Ionicons name="analytics" size={32} color="white" />
            </View>
            <Text className="text-3xl font-bold text-white">Welcome Back</Text>
            <Text className="text-dark-400 mt-2">Sign in to access your predictions</Text>
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
                placeholder="Enter your password"
                placeholderTextColor="#64748B"
                secureTextEntry={!showPassword}
                autoComplete="password"
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
          </View>

          {/* Forgot Password */}
          <Link href="/(auth)/forgot-password" asChild>
            <Pressable className="self-end mb-6">
              <Text className="text-emerald-400 text-sm">Forgot password?</Text>
            </Pressable>
          </Link>

          {/* Login Button */}
          <Pressable
            onPress={handleLogin}
            disabled={loginMutation.isPending}
            className={`py-4 rounded-xl items-center ${loginMutation.isPending ? 'bg-emerald-700' : 'bg-emerald-600'}`}
          >
            {loginMutation.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-base">Sign In</Text>
            )}
          </Pressable>

          {/* Divider */}
          <View className="flex-row items-center my-6">
            <View className="flex-1 h-px bg-dark-700" />
            <Text className="text-dark-500 mx-4">or continue with</Text>
            <View className="flex-1 h-px bg-dark-700" />
          </View>

          {/* OAuth Buttons */}
          <View className="flex-row space-x-3">
            <Pressable
              onPress={() => handleOAuthLogin('google')}
              className="flex-1 flex-row items-center justify-center py-4 rounded-xl bg-dark-800 border border-dark-700"
            >
              <Ionicons name="logo-google" size={20} color="#EA4335" />
              <Text className="text-white font-medium ml-2">Google</Text>
            </Pressable>

            {Platform.OS === 'ios' && (
              <Pressable
                onPress={() => handleOAuthLogin('apple')}
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
            <Text className="text-dark-400">Don't have an account? </Text>
            <Link href="/(auth)/register" asChild>
              <Pressable>
                <Text className="text-emerald-400 font-medium">Sign Up</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
