import { ScrollView, Pressable, Text, View } from 'react-native';
import type { Sport } from '@/types/predictions';

interface SportOption {
  id: Sport | null;
  label: string;
  icon: string;
}

const SPORTS: SportOption[] = [
  { id: null, label: 'All', icon: '' },
  { id: 'nba', label: 'NBA', icon: '' },
  { id: 'nfl', label: 'NFL', icon: '' },
  { id: 'mlb', label: 'MLB', icon: '' },
  { id: 'nhl', label: 'NHL', icon: '' },
  { id: 'ncaab', label: 'NCAAB', icon: '' },
  { id: 'ncaaf', label: 'NCAAF', icon: '' },
  { id: 'soccer', label: 'Soccer', icon: '' },
];

interface SportFilterProps {
  selectedSport: string | null;
  onSelectSport: (sport: string | null) => void;
}

export function SportFilter({ selectedSport, onSelectSport }: SportFilterProps) {
  return (
    <View className="mb-4">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {SPORTS.map((sport) => {
          const isSelected = selectedSport === sport.id;

          return (
            <Pressable
              key={sport.id ?? 'all'}
              onPress={() => onSelectSport(sport.id)}
              className={`px-4 py-2 rounded-full ${
                isSelected
                  ? 'bg-emerald-600'
                  : 'bg-dark-800 border border-dark-700'
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  isSelected ? 'text-white' : 'text-dark-300'
                }`}
              >
                {sport.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
