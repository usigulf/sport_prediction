import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';

import { apiClient } from '@/services/api/client';

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const resetMutation = useMutation({
    mutationFn: async (email: string) => {
      await apiClient.post('/v1/auth/forgot-password', { email });
    },
    onSuccess: () => {
      setIsSubmitted(true);
    },
    onError: () => {
      // Always show success to prevent email enumeration
      setIsSubmitted(true);
    },
  });

  const validate = (): boolean => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = () => {
    if (validate()) {
      resetMutation.mutate(email);
    }
  };

  if (isSubmitted) {
    return (
      <View className="flex-1 bg-dark-900 px-6 justify-center">
        <View className="items-center">
          <View className="w-20 h-20 rounded-full bg-emerald-600/20 items-center justify-center mb-6">
            <Ionicons name="mail" size={40} color="#10B981" />
          </View>
          <Text className="text-2xl font-bold text-white text-center mb-3">
            Check Your Email
          </Text>
          <Text className="text-dark-400 text-center mb-8">
            If an account exists for {email}, we've sent password reset instructions to that address.
          </Text>

          <Pressable
            onPress={() => router.replace('/(auth)/login')}
            className="bg-emerald-600 py-4 px-8 rounded-xl"
          >
            <Text className="text-white font-semibold">Back to Sign In</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setIsSubmitted(false);
              setEmail('');
            }}
            className="mt-4 py-2"
          >
            <Text className="text-dark-400">Try a different email</Text>
          </Pressable>
        </View>
      </View>
    );
  }

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
          <Pressable onPress={() => router.back()} className="flex-row items-center mb-8">
            <Ionicons name="arrow-back" size={24} color="#94A3B8" />
            <Text className="text-dark-400 ml-2">Back</Text>
          </Pressable>

          <View className="items-center mb-8">
            <View className="w-16 h-16 rounded-full bg-dark-800 items-center justify-center mb-4">
              <Ionicons name="key-outline" size={32} color="#10B981" />
            </View>
            <Text className="text-3xl font-bold text-white">Forgot Password?</Text>
            <Text className="text-dark-400 mt-2 text-center">
              No worries! Enter your email and we'll send you reset instructions.
            </Text>
          </View>
        </View>

        {/* Form */}
        <View className="px-6 flex-1">
          {/* Email Input */}
          <View className="mb-6">
            <Text className="text-dark-300 text-sm font-medium mb-2">Email Address</Text>
            <View className={`flex-row items-center bg-dark-800 rounded-xl border ${error ? 'border-red-500' : 'border-dark-700'}`}>
              <View className="pl-4">
                <Ionicons name="mail-outline" size={20} color="#64748B" />
              </View>
              <TextInput
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) setError('');
                }}
                placeholder="Enter your email"
                placeholderTextColor="#64748B"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoFocus
                className="flex-1 px-3 py-4 text-white"
              />
            </View>
            {error && (
              <Text className="text-red-400 text-xs mt-1">{error}</Text>
            )}
          </View>

          {/* Submit Button */}
          <Pressable
            onPress={handleSubmit}
            disabled={resetMutation.isPending}
            className={`py-4 rounded-xl items-center ${resetMutation.isPending ? 'bg-emerald-700' : 'bg-emerald-600'}`}
          >
            {resetMutation.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-base">Send Reset Link</Text>
            )}
          </Pressable>

          {/* Help Text */}
          <View className="mt-8 p-4 rounded-xl bg-dark-800 border border-dark-700">
            <View className="flex-row items-start">
              <Ionicons name="information-circle-outline" size={20} color="#64748B" />
              <View className="flex-1 ml-3">
                <Text className="text-dark-300 text-sm font-medium mb-1">
                  Didn't receive the email?
                </Text>
                <Text className="text-dark-500 text-xs">
                  Check your spam folder, or make sure you entered the correct email address associated with your account.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View className="px-6 py-8">
          <Pressable
            onPress={() => router.replace('/(auth)/login')}
            className="items-center"
          >
            <Text className="text-dark-400">
              Remember your password?{' '}
              <Text className="text-emerald-400 font-medium">Sign In</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
