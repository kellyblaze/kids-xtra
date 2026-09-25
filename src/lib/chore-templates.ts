export interface ChoreTemplate {
  id: string
  title: string
  description: string
  category: string
  creditValue: number
  xpValue: number
  periodUnit: string
  timesPerPeriod: number
  ageGroup: "3-5" | "6-8" | "9-12" | "13+"
}

export const CHORE_TEMPLATES: readonly ChoreTemplate[] = [
  // Ages 3–5
  { id: "t01", ageGroup: "3-5", title: "Put toys away", description: "Tidy up your play area before bed", category: "chore", creditValue: 5, xpValue: 10, periodUnit: "day", timesPerPeriod: 1 },
  { id: "t02", ageGroup: "3-5", title: "Make your bed", description: "Pull up the covers and straighten your pillow", category: "morning_routine", creditValue: 5, xpValue: 10, periodUnit: "day", timesPerPeriod: 1 },
  { id: "t03", ageGroup: "3-5", title: "Brush teeth", description: "Brush for 2 minutes morning and night", category: "health_hygiene", creditValue: 5, xpValue: 10, periodUnit: "day", timesPerPeriod: 1 },
  { id: "t04", ageGroup: "3-5", title: "Help set the table", description: "Put plates, cups and cutlery on the table for dinner", category: "chore", creditValue: 5, xpValue: 10, periodUnit: "day", timesPerPeriod: 1 },
  { id: "t05", ageGroup: "3-5", title: "Feed the pet", description: "Give your pet their food and fresh water", category: "chore", creditValue: 8, xpValue: 15, periodUnit: "day", timesPerPeriod: 1 },
  // Ages 6–8
  { id: "t06", ageGroup: "6-8", title: "Clear the dinner table", description: "Bring dishes to the sink after eating", category: "chore", creditValue: 8, xpValue: 15, periodUnit: "day", timesPerPeriod: 1 },
  { id: "t07", ageGroup: "6-8", title: "Pack your school bag", description: "Get your bag ready for the next school day", category: "morning_routine", creditValue: 5, xpValue: 10, periodUnit: "day", timesPerPeriod: 1 },
  { id: "t08", ageGroup: "6-8", title: "Water the plants", description: "Give the indoor or garden plants a drink", category: "chore", creditValue: 8, xpValue: 15, periodUnit: "week", timesPerPeriod: 2 },
  { id: "t09", ageGroup: "6-8", title: "Read for 15 minutes", description: "Choose a book and read quietly", category: "learning", creditValue: 10, xpValue: 20, periodUnit: "day", timesPerPeriod: 1 },
  { id: "t10", ageGroup: "6-8", title: "Tidy your room", description: "Put everything in its place and vacuum if needed", category: "chore", creditValue: 15, xpValue: 25, periodUnit: "week", timesPerPeriod: 1 },
  { id: "t11", ageGroup: "6-8", title: "Complete homework", description: "Finish all school homework before screen time", category: "learning", creditValue: 10, xpValue: 20, periodUnit: "day", timesPerPeriod: 1 },
  // Ages 9–12
  { id: "t12", ageGroup: "9-12", title: "Wash the dishes", description: "Wash, rinse and stack all dishes after dinner", category: "chore", creditValue: 15, xpValue: 25, periodUnit: "day", timesPerPeriod: 1 },
  { id: "t13", ageGroup: "9-12", title: "Vacuum the living room", description: "Vacuum the main living area thoroughly", category: "chore", creditValue: 15, xpValue: 25, periodUnit: "week", timesPerPeriod: 1 },
  { id: "t14", ageGroup: "9-12", title: "Take out the trash", description: "Empty all bins and take the bag to the bin outside", category: "chore", creditValue: 10, xpValue: 20, periodUnit: "week", timesPerPeriod: 2 },
  { id: "t15", ageGroup: "9-12", title: "Fold and put away laundry", description: "Fold your clean clothes and put them in their drawer", category: "chore", creditValue: 15, xpValue: 25, periodUnit: "week", timesPerPeriod: 1 },
  { id: "t16", ageGroup: "9-12", title: "Do a kind act", description: "Help someone without being asked", category: "kindness", creditValue: 20, xpValue: 40, periodUnit: "week", timesPerPeriod: 1 },
  { id: "t17", ageGroup: "9-12", title: "Practise an instrument", description: "Spend at least 20 minutes practising", category: "learning", creditValue: 15, xpValue: 30, periodUnit: "day", timesPerPeriod: 1 },
  // Ages 13+
  { id: "t18", ageGroup: "13+", title: "Cook a simple meal", description: "Prepare breakfast or lunch for yourself or the family", category: "chore", creditValue: 25, xpValue: 40, periodUnit: "week", timesPerPeriod: 2 },
  { id: "t19", ageGroup: "13+", title: "Mow the lawn", description: "Mow and edge the front or back garden", category: "chore", creditValue: 30, xpValue: 50, periodUnit: "week", timesPerPeriod: 1 },
  { id: "t20", ageGroup: "13+", title: "Clean the bathroom", description: "Scrub the toilet, sink and wipe down the shower", category: "chore", creditValue: 25, xpValue: 40, periodUnit: "week", timesPerPeriod: 1 },
  { id: "t21", ageGroup: "13+", title: "Unload the dishwasher", description: "Empty the clean dishwasher and put everything away", category: "chore", creditValue: 10, xpValue: 15, periodUnit: "day", timesPerPeriod: 1 },
  { id: "t22", ageGroup: "13+", title: "Grocery shop with a list", description: "Help with weekly shopping and carry the bags", category: "chore", creditValue: 20, xpValue: 30, periodUnit: "week", timesPerPeriod: 1 },
  { id: "t23", ageGroup: "13+", title: "Exercise for 30 minutes", description: "Go for a run, ride, or do a workout", category: "health_hygiene", creditValue: 20, xpValue: 35, periodUnit: "day", timesPerPeriod: 1 },
]

export type AgeGroup = "3-5" | "6-8" | "9-12" | "13+"
export const AGE_GROUPS: AgeGroup[] = ["3-5", "6-8", "9-12", "13+"]

export function getTemplateById(id: string): ChoreTemplate | undefined {
  return CHORE_TEMPLATES.find((t) => t.id === id)
}

export function getTemplatesByAge(ageGroup: AgeGroup): ChoreTemplate[] {
  return CHORE_TEMPLATES.filter((t) => t.ageGroup === ageGroup)
}
