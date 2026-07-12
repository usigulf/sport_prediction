import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '@/stores/authStore';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, subscription, isAuthenticated, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  if (!isAuthenticated) {
    return (
      <View className="flex-1 bg-dark-900 items-center justify-center px-6">
        <Ionicons name="person-circle-outline" size={80} color="#64748B" />
        <Text className="text-xl font-semibold text-white mt-4">Sign In Required</Text>
        <Text className="text-dark-400 text-center mt-2">
          Sign in to access your profile, track your picks, and manage your subscription.
        </Text>
        <Pressable
          onPress={() => router.push('/(auth)/login')}
          className="mt-6 bg-emerald-600 px-8 py-3 rounded-lg"
        >
          <Text className="text-white font-semibold">Sign In</Text>
        </Pressable>
      </View>
    );
  }

  const planColors = {
    free: 'text-dark-400',
    pro: 'text-blue-400',
    elite: 'text-purple-400',
    api: 'text-orange-400',
  };

  return (
    <ScrollView className="flex-1 bg-dark-900">
      {/* Profile Header */}
      <View className="items-center py-8 border-b border-dark-800">
        <View className="w-20 h-20 rounded-full bg-emerald-600 items-center justify-center">
          <Text className="text-3xl font-bold text-white">
            {user?.profile?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
          </Text>
        </View>
        <Text className="text-xl font-semibold text-white mt-3">
          {user?.profile?.displayName || 'Player'}
        </Text>
        <Text className="text-dark-400 mt-1">{user?.email}</Text>
        <View className="flex-row items-center mt-2">
          <View className={`px-3 py-1 rounded-full ${subscription?.plan === 'free' ? 'bg-dark-700' : 'bg-emerald-600/20'}`}>
            <Text className={`text-sm font-medium ${planColors[subscription?.plan || 'free']}`}>
              {subscription?.plan?.toUpperCase() || 'FREE'}
            </Text>
          </View>
        </View>
      </View>

      {/* Subscription Banner */}
      {subscription?.plan === 'free' && (
        <Pressable
          onPress={() => router.push('/subscription')}
          className="mx-4 mt-4 p-4 rounded-xl bg-gradient-to-r from-emerald-900/50 to-blue-900/50 border border-emerald-700/30"
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-lg font-semibold text-white">Upgrade to Pro</Text>
              <Text className="text-dark-400 text-sm mt-1">
                Get unlimited picks and live predictions
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#10B981" />
          </View>
        </Pressable>
      )}

      {/* Menu Sections */}
      <View className="px-4 py-4">
        {/* Account Section */}
        <Text className="text-xs text-dark-500 uppercase tracking-wide mb-2">Account</Text>
        <View className="rounded-xl bg-dark-800 overflow-hidden">
          <MenuItem
            icon="person-outline"
            label="Edit Profile"
            onPress={() => router.push('/profile/edit')}
          />
          <MenuItem
            icon="card-outline"
            label="Subscription"
            value={subscription?.plan?.toUpperCase()}
            onPress={() => router.push('/subscription')}
          />
          <MenuItem
            icon="notifications-outline"
            label="Notifications"
            onPress={() => router.push('/profile/notifications')}
          />
        </View>

        {/* Betting Section */}
        <Text className="text-xs text-dark-500 uppercase tracking-wide mb-2 mt-6">Betting</Text>
        <View className="rounded-xl bg-dark-800 overflow-hidden">
          <MenuItem
            icon="wallet-outline"
            label="Bankroll Tracker"
            onPress={() => router.push('/bankroll')}
          />
          <MenuItem
            icon="receipt-outline"
            label="Bet History"
            onPress={() => router.push('/bets')}
          />
          <MenuItem
            icon="alarm-outline"
            label="Alerts"
            onPress={() => router.push('/alerts')}
          />
        </View>

        {/* App Section */}
        <Text className="text-xs text-dark-500 uppercase tracking-wide mb-2 mt-6">App</Text>
        <View className="rounded-xl bg-dark-800 overflow-hidden">
          <MenuItem
            icon="settings-outline"
            label="Preferences"
            onPress={() => router.push('/settings')}
          />
          <MenuItem
            icon="help-circle-outline"
            label="Help & Support"
            onPress={() => router.push('/support')}
          />
          <MenuItem
            icon="document-text-outline"
            label="Terms & Privacy"
            onPress={() => router.push('/legal')}
          />
        </View>

        {/* Logout */}
        <Pressable
          onPress={handleLogout}
          className="mt-6 py-4 rounded-xl bg-dark-800 items-center"
        >
          <Text className="text-red-400 font-medium">Log Out</Text>
        </Pressable>

        {/* Version */}
        <Text className="text-center text-dark-600 text-xs mt-4">
          SportOracle v1.0.0
        </Text>
      </View>

      <View className="h-8" />
    </ScrollView>
  );
}

interface MenuItemProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value?: string;
  onPress: () => void;
}

function MenuItem({ icon, label, value, onPress }: MenuItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center px-4 py-3 border-b border-dark-700 last:border-b-0"
    >
      <Ionicons name={icon} size={20} color="#64748B" />
      <Text className="flex-1 text-white ml-3">{label}</Text>
      {value && <Text className="text-dark-400 mr-2">{value}</Text>}
      <Ionicons name="chevron-forward" size={16} color="#475569" />
    </Pressable>
  );
}
