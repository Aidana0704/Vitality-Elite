
export type Language = 'en' | 'ru' | 'es';

export type MembershipTier = 'Standard' | 'Elite' | 'Platinum' | 'Founders';

export interface UserProfile {
  name: string;
  age: number;
  weight: number;
  height: number;
  goal: 'Weight Loss' | 'Muscle Gain' | 'Maintenance' | 'Athletic Performance';
  activityLevel: 'Sedentary' | 'Moderate' | 'Active' | 'Very Active';
  dietaryPreference: string;
  location?: string;
  membershipTier?: MembershipTier;
  memberSince?: string;
  memberId?: string;
}

export interface HealthLog {
  date: string;
  weight: number;
  caloriesConsumed: number;
  caloriesBurned: number;
  waterIntake: number; // in ml
  protein: number; // in g
  carbs: number; // in g
  fats: number; // in g
}

export interface Meal {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  ingredients: string[];
  prepInstructions: string;
  prepTime: string;
  imageUrl?: string;
  herbalifeSubstitution?: {
    productName: string;
    benefits: string;
    instructions: string;
  };
}

export interface ShoppingItem {
  item: string;
  amount: string;
  category: string;
}

export interface PrepStrategy {
  batchPrepTasks: string[];
  storageTips: string[];
  shoppingList: ShoppingItem[];
}

export interface DailyMealPlan {
  day: string;
  breakfast: Meal;
  lunch: Meal;
  dinner: Meal;
  snacks: Meal[];
  supplementProtocol: {
    product: string;
    timing: string;
    purpose: string;
  }[];
}

export interface MealPlanResponse {
  days: DailyMealPlan[];
  prepStrategy: PrepStrategy;
}

export interface GroundingLink {
  uri: string;
  title: string;
}

export interface Gym {
  name: string;
  address: string;
  rating: number;
  distance: number; // in miles
  amenities: string[];
  highlights: string;
  uri: string;
  lat: number;
  lng: number;
  groundingLinks?: GroundingLink[];
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  targetMuscles: string[];
  coachingCue: string;
  description: string;
  intensity: 'Low' | 'Moderate' | 'High' | 'Elite';
}

export interface DailyWorkout {
  dayTitle: string;
  focus: string;
  exercises: Exercise[];
  estimatedDuration: string;
}
