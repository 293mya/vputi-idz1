import { describe, expect, it } from 'vitest'
import { DEMO_EMAIL, DEMO_PASSWORD, validateDemoCredentials } from '../src/demoAuth.js'

describe('состояния демовхода', () => {
  it('показывает отдельные ошибки пустых полей', () => {
    expect(validateDemoCredentials('', '')).toEqual({
      email: 'Введите почту',
      password: 'Введите пароль',
    })
  })

  it('различает формат, неизвестного пользователя и неверный пароль', () => {
    expect(validateDemoCredentials('demo', 'password').email).toBe('Проверьте формат почты')
    expect(validateDemoCredentials('other@example.test', 'password').email).toBe('Пользователь с такой почтой не найден')
    expect(validateDemoCredentials(DEMO_EMAIL, 'wrong').password).toBe('Неверный пароль')
  })

  it('принимает только тестовую пару', () => {
    expect(validateDemoCredentials(DEMO_EMAIL, DEMO_PASSWORD)).toEqual({})
  })
})
