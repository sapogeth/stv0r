// src/utils/nicknameGenerator.ts

// Списки слов для генерации никнеймов
const adjectives = [
  'Быстрый', 'Умный', 'Сильный', 'Храбрый', 'Мудрый', 'Ловкий', 'Тихий', 'Яркий',
  'Темный', 'Светлый', 'Золотой', 'Серебряный', 'Красный', 'Синий', 'Зеленый',
  'Фиолетовый', 'Огненный', 'Ледяной', 'Грозовой', 'Солнечный', 'Лунный', 'Звездный',
  'Дикий', 'Свободный', 'Гордый', 'Отважный', 'Неукротимый', 'Загадочный', 'Древний',
  'Могучий', 'Великий', 'Благородный', 'Королевский', 'Императорский', 'Легендарный'
];

const nouns = [
  'Волк', 'Орел', 'Лев', 'Тигр', 'Дракон', 'Феникс', 'Сокол', 'Пантера',
  'Медведь', 'Акула', 'Кобра', 'Ястреб', 'Рысь', 'Барс', 'Гепард', 'Койот',
  'Воин', 'Рыцарь', 'Маг', 'Охотник', 'Страж', 'Защитник', 'Мастер', 'Чемпион',
  'Король', 'Император', 'Принц', 'Герой', 'Легенда', 'Титан', 'Гигант', 'Колосс',
  'Шторм', 'Молния', 'Гром', 'Ветер', 'Огонь', 'Лед', 'Тень', 'Свет'
];

const numbers = ['1', '2', '3', '7', '9', '13', '21', '42', '69', '77', '88', '99', '100', '777', '999'];

/**
 * Генерирует случайный никнейм
 * @returns строка с никнеймом
 */
export function generateRandomNickname(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  
  // Случайно решаем, добавлять ли число
  const addNumber = Math.random() > 0.5;
  const number = addNumber ? numbers[Math.floor(Math.random() * numbers.length)] : '';
  
  return `${adjective}${noun}${number}`;
}

/**
 * Генерирует несколько вариантов никнеймов
 * @param count количество вариантов
 * @returns массив никнеймов
 */
export function generateNicknameOptions(count: number = 3): string[] {
  const options = new Set<string>();
  
  while (options.size < count) {
    options.add(generateRandomNickname());
  }
  
  return Array.from(options);
}

/**
 * Проверяет, доступен ли никнейм (заглушка для будущей интеграции с базой данных)
 * @param nickname никнейм для проверки
 * @returns Promise<boolean> доступен ли никнейм
 */
export async function isNicknameAvailable(nickname: string): Promise<boolean> {
  // TODO: Интегрировать с базой данных или блокчейном
  // Пока что возвращаем true для всех никнеймов
  return true;
}

/**
 * Генерирует доступный никнейм (проверяет доступность)
 * @returns Promise<string> доступный никнейм
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
    // Если не удалось найти доступный никнейм, добавляем случайное число
    nickname = generateRandomNickname() + Math.floor(Math.random() * 10000);
  }
  
  return nickname;
}

