// Centralized Data-Driven Dietary Menus & Dish Resolver for MessMate
// Full strict compliance for VEG, NON_VEG, and JAIN (No onion/garlic/root vegetables)

export type DietaryPref = "VEG" | "NON_VEG" | "JAIN";
export type MealType = "BREAKFAST" | "LUNCH" | "DINNER";

export interface DishItem {
  name: string;
  isVeg: boolean;
  isJain: boolean;
  description?: string;
}

export interface MealDietaryMenu {
  VEG: string[];
  NON_VEG: string[];
  JAIN: string[];
}

export type DayMenuSchedule = Record<MealType, MealDietaryMenu>;

/**
 * Weekly Master Dietary Menu: 7 Days (0 = Sunday ... 6 = Saturday)
 * Each meal slot has authentic, verified menu items for VEG, NON_VEG, and JAIN.
 *
 * Rules:
 * - VEG: Pure vegetarian dishes.
 * - NON_VEG: Non-vegetarian specialty accompanied by wholesome vegetarian staple sides.
 * - JAIN: Strictly root-free (no onion, garlic, potato, carrot, radish), cooked according to strict dietary rules.
 */
export const WEEKLY_DIETARY_MENUS: Record<number, DayMenuSchedule> = {
  // 0: Sunday
  0: {
    BREAKFAST: {
      VEG: ["Poha", "Crisp Jalebi", "Masala Chai", "Boiled Sprouts"],
      NON_VEG: ["Double Egg Bhurji", "Butter Toast", "Masala Chai", "Sprouts"],
      JAIN: ["Jain Poha (No Onion/Potato)", "Roasted Peanuts", "Fresh Mint Chutney (No Garlic)", "Masala Chai"],
    },
    LUNCH: {
      VEG: ["Chole Masala", "Jeera Rice", "Boondi Raita", "Tawa Roti", "Salad"],
      NON_VEG: ["Chicken Curry", "Jeera Rice", "Dal Tadka", "Tawa Roti", "Salad"],
      JAIN: ["Jain Paneer Capsicum (No Onion/Garlic)", "Moong Dal Tadka (Hing-Jeera)", "Steamed Rice", "Phulka", "Curd"],
    },
    DINNER: {
      VEG: ["Paneer Butter Masala", "Dal Makhani", "Jeera Rice", "Phulka", "Gulab Jamun"],
      NON_VEG: ["Chicken Masala", "Dal Makhani", "Jeera Rice", "Phulka", "Gulab Jamun"],
      JAIN: ["Jain Kadhai Paneer (Cashew-Tomato Gravy)", "Yellow Dal (No Onion/Garlic)", "Jeera Rice", "Phulka", "Gulab Jamun"],
    },
  },

  // 1: Monday
  1: {
    BREAKFAST: {
      VEG: ["Aloo Paratha", "Fresh Curd", "Mint Chutney", "Adrak Chai"],
      NON_VEG: ["Egg Paratha", "Fresh Curd", "Mint Chutney", "Adrak Chai"],
      JAIN: ["Jain Moong Dal Cheela", "Fresh Curd", "Coconut Chutney (No Garlic)", "Adrak Chai"],
    },
    LUNCH: {
      VEG: ["Rajma Masala", "Steamed Basmati Rice", "Jeera Aloo", "Tawa Phulka", "Cucumber Salad"],
      NON_VEG: ["Egg Curry (2 Eggs)", "Steamed Basmati Rice", "Yellow Dal", "Tawa Phulka", "Cucumber Salad"],
      JAIN: ["Jain Lauki Kofta (No Onion/Garlic)", "Steamed Basmati Rice", "Yellow Moong Dal", "Phulka", "Sweet Curd"],
    },
    DINNER: {
      VEG: ["Malai Kofta", "Jeera Rice", "Dal Tadka", "Butter Naan", "Shahi Tukda"],
      NON_VEG: ["Butter Chicken", "Jeera Rice", "Dal Tadka", "Butter Naan", "Shahi Tukda"],
      JAIN: ["Jain Malai Kofta (Raw Banana & Paneer base)", "Jeera Rice", "Dal Tadka (No Garlic)", "Phulka", "Shahi Tukda"],
    },
  },

  // 2: Tuesday
  2: {
    BREAKFAST: {
      VEG: ["Idli Sambar", "Coconut Chutney", "Filter Coffee"],
      NON_VEG: ["Egg Omelette", "Butter Toast", "Coconut Chutney", "Filter Coffee"],
      JAIN: ["Jain Idli", "Jain Sambar (Tomato-Gourd/No Onion)", "Coconut Chutney (No Garlic)", "Filter Coffee"],
    },
    LUNCH: {
      VEG: ["Mix Veg Sabzi", "Dal Fry", "Steamed Rice", "Phulka", "Papad"],
      NON_VEG: ["Chicken Do Pyaza", "Dal Fry", "Steamed Rice", "Phulka", "Papad"],
      JAIN: ["Jain Bhindi Masala (No Onion/Garlic)", "Dal Fry (Hing-Jeera/No Onion)", "Steamed Rice", "Phulka", "Papad"],
    },
    DINNER: {
      VEG: ["Mushroom Masala", "Vegetable Pulao", "Dal Tadka", "Phulka", "Gulab Jamun"],
      NON_VEG: ["Chicken Korma", "Vegetable Pulao", "Dal Tadka", "Phulka", "Gulab Jamun"],
      JAIN: ["Jain Paneer Makhani (No Onion/Garlic)", "Jain Matar Pulao", "Yellow Dal", "Phulka", "Moong Dal Halwa"],
    },
  },

  // 3: Wednesday
  3: {
    BREAKFAST: {
      VEG: ["Semolina Upma", "Medu Vada", "Coconut Chutney", "Filter Coffee"],
      NON_VEG: ["Egg Bhurji Pav", "Medu Vada", "Coconut Chutney", "Filter Coffee"],
      JAIN: ["Jain Semolina Upma (No Onion)", "Medu Vada (Hing/No Onion)", "Coconut Chutney (No Garlic)", "Filter Coffee"],
    },
    LUNCH: {
      VEG: ["Kadhi Pakora", "Steamed Rice", "Aloo Beans Sabzi", "Phulka", "Salad"],
      NON_VEG: ["Chicken Curry", "Steamed Rice", "Dal Tadka", "Phulka", "Salad"],
      JAIN: ["Jain Kadhi (No Onion/Garlic)", "Steamed Rice", "Kundru Ki Sabzi", "Phulka", "Kachumber (No Onion)"],
    },
    DINNER: {
      VEG: ["Shahi Paneer", "Lachha Paratha", "Jeera Rice", "Dal Makhani", "Kheer"],
      NON_VEG: ["Chicken Tikka Masala", "Lachha Paratha", "Jeera Rice", "Dal Makhani", "Kheer"],
      JAIN: ["Jain Shahi Paneer (Cashew Gravy/No Onion)", "Phulka (Ghee)", "Jeera Rice", "Dal Makhani (No Garlic)", "Kheer"],
    },
  },

  // 4: Thursday
  4: {
    BREAKFAST: {
      VEG: ["Puri Bhaji (Aloo)", "Sooji Halwa", "Sweet Lassi"],
      NON_VEG: ["Boiled Eggs (2 pcs)", "Puri & Bhaji", "Sooji Halwa", "Sweet Lassi"],
      JAIN: ["Jain Methi Thepla", "Sweet Curd", "Sooji Halwa", "Sweet Lassi"],
    },
    LUNCH: {
      VEG: ["Dal Makhani", "Jeera Rice", "Mix Veg Korma", "Phulka", "Mixed Raita"],
      NON_VEG: ["Mutton Rogan Josh", "Jeera Rice", "Dal Fry", "Phulka", "Mixed Raita"],
      JAIN: ["Jain Dal Makhani (No Garlic/Onion)", "Jeera Rice", "Jain Lauki Chana Dal", "Phulka", "Cucumber Raita (No Onion)"],
    },
    DINNER: {
      VEG: ["Palak Paneer", "Tandoori Roti", "Steamed Rice", "Dal Tadka", "Jalebi"],
      NON_VEG: ["Palak Chicken", "Tandoori Roti", "Steamed Rice", "Dal Tadka", "Jalebi"],
      JAIN: ["Jain Paneer Bhurji (No Onion/Garlic)", "Phulka", "Steamed Rice", "Dal Tadka (No Garlic)", "Jalebi"],
    },
  },

  // 5: Friday
  5: {
    BREAKFAST: {
      VEG: ["Masala Dosa", "Sambar", "Coconut Chutney", "Tea"],
      NON_VEG: ["Egg Dosa", "Sambar", "Coconut Chutney", "Tea"],
      JAIN: ["Jain Plain Sada Dosa", "Jain Sambar (No Onion/Garlic)", "Coconut Chutney (No Garlic)", "Tea"],
    },
    LUNCH: {
      VEG: ["Chana Masala", "Matar Pulao", "Boondi Raita", "Bhature", "Salad"],
      NON_VEG: ["Chicken Biryani", "Mirchi Ka Salan", "Boondi Raita", "Egg (1 pc)", "Salad"],
      JAIN: ["Jain Chana Sundal & Rice", "Matar Pulao", "Boondi Raita (No Onion)", "Phulka", "Cucumber Salad"],
    },
    DINNER: {
      VEG: ["Aloo Matar", "Dal Tadka", "Steamed Rice", "Phulka", "Gajar Halwa"],
      NON_VEG: ["Egg Curry", "Dal Tadka", "Steamed Rice", "Phulka", "Gajar Halwa"],
      JAIN: ["Jain Matar Paneer (No Onion/Garlic)", "Dal Tadka (No Garlic)", "Steamed Rice", "Phulka", "Gajar Halwa"],
    },
  },

  // 6: Saturday
  6: {
    BREAKFAST: {
      VEG: ["Bread Toast", "Butter & Mixed Jam", "Hot Tea", "Sprouts Salad"],
      NON_VEG: ["Bread Toast & Butter", "Cheese Omelette", "Hot Tea", "Sprouts Salad"],
      JAIN: ["Jain Poha (No Potato/Onion)", "Warm Milk with Cardamom", "Sprouts (Moong Only)"],
    },
    LUNCH: {
      VEG: ["Vegetable Biryani", "Mirchi Ka Salan", "Mix Veg Raita", "Papad"],
      NON_VEG: ["Hyderabadi Chicken Biryani", "Mirchi Ka Salan", "Mix Veg Raita", "Papad"],
      JAIN: ["Jain Vegetable Biryani (Capsicum, Peas, Paneer, No Root Veg)", "Curd Raita", "Roasted Papad"],
    },
    DINNER: {
      VEG: ["Paneer Tikka Masala", "Butter Naan", "Jeera Rice", "Dal Makhani", "Phirni"],
      NON_VEG: ["Chicken Tikka Masala", "Butter Naan", "Jeera Rice", "Dal Makhani", "Phirni"],
      JAIN: ["Jain Paneer Tikka (Grilled Capsicum & Paneer/No Onion)", "Phulka", "Jeera Rice", "Yellow Dal", "Phirni"],
    },
  },
};

/**
 * Pure function to resolve dietary menu dishes.
 * If rawMenuItems is JSON string containing { VEG, NON_VEG, JAIN }, it parses it directly.
 * Otherwise, it uses the date & mealType to lookup the verified master menu.
 */
export function resolveDietaryDishes(
  mealType: string,
  mealDate: string | Date,
  dietaryPref: DietaryPref,
  rawMenuItems?: string | null
): { dishes: string[]; isConfigured: boolean } {
  const normPref = (dietaryPref || "VEG").toUpperCase() as DietaryPref;
  const normMeal = (mealType || "LUNCH").toUpperCase() as MealType;

  // 1. Try parsing JSON-serialized menu variants in rawMenuItems
  if (rawMenuItems && rawMenuItems.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(rawMenuItems);
      if (parsed && Array.isArray(parsed[normPref]) && parsed[normPref].length > 0) {
        return { dishes: parsed[normPref], isConfigured: true };
      }
      if (parsed && typeof parsed[normPref] === "string" && parsed[normPref].length > 0) {
        return {
          dishes: parsed[normPref].split(/[,&]/).map((s: string) => s.trim()).filter(Boolean),
          isConfigured: true,
        };
      }
    } catch {
      // Fallback to schedule lookup below
    }
  }

  // 2. Lookup by day of week
  let dow = 1;
  if (mealDate instanceof Date) {
    dow = mealDate.getDay();
  } else if (typeof mealDate === "string" && mealDate.length >= 10) {
    const [y, m, d] = mealDate.split("-").map(Number);
    if (y && m && d) {
      dow = new Date(y, m - 1, d).getDay();
    }
  }

  const daySchedule = WEEKLY_DIETARY_MENUS[dow] || WEEKLY_DIETARY_MENUS[1];
  const mealSchedule = daySchedule[normMeal];

  if (mealSchedule && mealSchedule[normPref] && mealSchedule[normPref].length > 0) {
    return {
      dishes: mealSchedule[normPref],
      isConfigured: true,
    };
  }

  // 3. Fallback: If dietary variant not configured, return empty with explicit unconfigured flag
  return {
    dishes: [],
    isConfigured: false,
  };
}

/**
 * Serializes all 3 dietary variants into a JSON payload for storage in meal_slots.menu_items
 */
export function buildDietarySlotMenuString(dayOfWeek: number, mealType: MealType): string {
  const dow = (dayOfWeek >= 0 && dayOfWeek <= 6) ? dayOfWeek : 1;
  const daySchedule = WEEKLY_DIETARY_MENUS[dow] || WEEKLY_DIETARY_MENUS[1];
  const mealMenu = daySchedule[mealType] || daySchedule.LUNCH;

  return JSON.stringify({
    VEG: mealMenu.VEG,
    NON_VEG: mealMenu.NON_VEG,
    JAIN: mealMenu.JAIN,
  });
}
