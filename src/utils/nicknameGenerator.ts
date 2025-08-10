// src/utils/nicknameGenerator.ts

// Word lists for nickname generation
const adjectives = [
  'Fast', 'Smart', 'Strong', 'Brave', 'Wise', 'Agile', 'Quiet', 'Bright',
  'Dark', 'Light', 'Golden', 'Silver', 'Red', 'Blue', 'Green',
  'Violet', 'Fiery', 'Icy', 'Stormy', 'Sunny', 'Lunar', 'Starry',
  'Wild', 'Free', 'Proud', 'Valiant', 'Untamed', 'Mysterious', 'Ancient',
  'Mighty', 'Great', 'Noble', 'Royal', 'Imperial', 'Legendary'
];

const nouns = [
  'Wolf', 'Eagle', 'Lion', 'Tiger', 'Dragon', 'Phoenix', 'Falcon', 'Panther',
  'Bear', 'Shark', 'Cobra', 'Hawk', 'Lynx', 'Leopard', 'Cheetah', 'Coyote',
  'Warrior', 'Knight', 'Mage', 'Hunter', 'Guardian', 'Protector', 'Master', 'Champion',
  'King', 'Emperor', 'Prince', 'Hero', 'Legend', 'Titan', 'Giant', 'Colossus',
  'Storm', 'Lightning', 'Thunder', 'Wind', 'Fire', 'Ice', 'Shadow', 'Light'
];

const numbers = ['1', '2', '3', '7', '9', '13', '21', '42', '69', '77', '88', '99', '100', '777', '999'];

/**
 * Generates a random nickname
 * @returns string with the nickname
 */
export function generateRandomNickname(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  
  // Randomly decide whether to add a number
  const addNumber = Math.random() > 0.5;
  const number = addNumber ? numbers[Math.floor(Math.random() * numbers.length)] : '';
  
  return `${adjective}${noun}${number}`;
}

/**
 * Generates several nickname options
 * @param count number of options
 * @returns array of nicknames
 */
export function generateNicknameOptions(count: number = 3): string[] {
  const options = new Set<string>();
  
  while (options.size < count) {
    options.add(generateRandomNickname());
  }
  
  return Array.from(options);
}

/**
 * Checks if a nickname is available (stub for future database integration)
 * @param nickname nickname to check
 * @returns Promise<boolean> whether the nickname is available
 */
export async function isNicknameAvailable(nickname: string): Promise<boolean> {
  // TODO: Integrate with a database or blockchain
  // For now, return true for all nicknames
  console.log(`Checking availability for: ${nickname}`); // To avoid unused parameter warning
  return true;
}

/**
 * Generates an available nickname (checks for availability)
 * @returns Promise<string> an available nickname
 */
export async function generateAvailableNickname(): Promise<string> {
  let nickname: string;
  let attempts = 0;
  const maxAttempts = 10;
  
  do {
    nickname = generateRandomNickname();
    attempts++;
  } while (!(await isNicknameAvailable(nickname)) && attempts < maxAttempts);
  
  if (attempts >= maxAttempts) {
    // If a unique nickname couldn't be found, add a random number
    nickname = generateRandomNickname() + Math.floor(Math.random() * 10000);
  }
  
  return nickname;
}
