export const DEMO_EMAIL = 'demo@vputi.test'
export const DEMO_PASSWORD = 'Vputi2026!'

export function validateDemoCredentials(emailValue, passwordValue) {
  const email = String(emailValue ?? '').trim()
  const password = String(passwordValue ?? '')
  const errors = {}

  if (!email) errors.email = 'Введите почту'
  else if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Проверьте формат почты'
  else if (email !== DEMO_EMAIL) errors.email = 'Пользователь с такой почтой не найден'

  if (!password) errors.password = 'Введите пароль'
  else if (email === DEMO_EMAIL && password !== DEMO_PASSWORD) errors.password = 'Неверный пароль'

  return errors
}
