# Telegram MiniApp

## Description
A modern Telegram MiniApp built with React, TypeScript, and Tailwind CSS.

## Features
- Telegram WebApp SDK integration
- User authentication and data
- Main button integration
- Haptic feedback
- Responsive design
- TypeScript support

## Getting Started

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Backend
```bash
npm run server
```

### Build
```bash
npm run build
```

### Preview
```bash
npm run preview
```

## Project Structure
```
src/
  components/     # React components
  types/         # TypeScript type definitions
  hooks/         # Custom hooks
  utils/         # Utility functions
  App.tsx        # Main application component
  main.tsx       # Application entry point
```

## Telegram Integration
The app integrates with Telegram WebApp SDK to provide:
- User information
- Theme customization
- Main button functionality
- Haptic feedback
- Popup and alerts

## Secure Auth And Admin

### Email auth
- Email-вход теперь работает только с паролем.
- Если почта новая, создаётся новый аккаунт.
- Если почта уже существует, вход произойдёт только с правильным паролем.

### Admin bootstrap
- Чтобы выдать admin самому себе, сначала войди в обычный аккаунт.
- Потом открой вкладку `Профиль` и используй блок `Активировать admin`.
- Код берётся из переменной окружения `ADMIN_BOOTSTRAP_CODE` на сервере.

### Telegram WebApp auth
- Для нормальной telegram-авторизации серверу нужен `TELEGRAM_BOT_TOKEN`.
- Backend проверяет `initData` от Telegram WebApp по bot token.
- Если токен не задан, а строгая проверка включена, Telegram login будет отклонён.

### PowerShell example
```powershell
$env:ADMIN_BOOTSTRAP_CODE="your_admin_code"
$env:TELEGRAM_BOT_TOKEN="123456:ABCDEF_your_bot_token"
npm run server
```

### Как подключить Mini App к Telegram
1. Создай бота через BotFather.
2. Получи bot token.
3. Настрой у бота кнопку Mini App или menu button с URL на твой frontend.
4. Запусти backend с `TELEGRAM_BOT_TOKEN`.
5. Открой приложение именно внутри Telegram, тогда `window.Telegram.WebApp.initData` придёт в frontend и уйдёт на backend для проверки.

## Deployment

Сейчас проект можно тестово деплоить целиком на одном Node.js-хосте.

Что происходит:

- `npm run build` собирает frontend в `dist/`;
- `npm start` запускает `server/index.mjs`;
- backend раздаёт API, WebSocket и статический frontend из `dist/`.

### Single-host deploy on Render

В проект уже добавлен `render.yaml`, поэтому можно поднять всё одним web service.

1. Залей проект в GitHub.
2. На Render создай `New +` -> `Blueprint` или обычный `Web Service` из этого репозитория.
3. Render использует:

```bash
Build Command: npm install && npm run build
Start Command: npm start
```

4. Добавь переменные окружения:

```bash
ADMIN_BOOTSTRAP_CODE=your_admin_code
TELEGRAM_BOT_TOKEN=123456:ABCDEF_your_bot_token
TELEGRAM_AUTH_STRICT=true
```

Опционально:

```bash
CORS_ORIGIN=*
```

На single-host deploy это не обязательно, потому что frontend и backend будут на одном домене.

5. После деплоя проверь:

```bash
GET /api/health
```

### Local production-like run

```bash
npm install
npm run build
npm start
```

После этого сайт будет доступен через один сервер на порту `PORT` или `API_PORT`.

### Telegram Mini App URL

В BotFather укажи URL этого single-host deployment, например:

```text
https://your-app.onrender.com
```

### Data safety

- `server/state/app-state.json` исключён из git;
- секреты нужно хранить только в env vars;
- для бесплатного теста Render подойдёт, но локальный state-файл на таком хостинге не является надёжной постоянной базой для долгой жизни проекта;
- когда перейдём к следующему этапу, лучше вынести state в нормальную БД или persistent disk.

## Design notes (added UI preview)
- Главная страница: мобильный и десктоп макет с лентой анонимных сообщений.
- Цвета: использованы только из скриншотов: #AFCC00, #316D2A, #000000 и белый для текста.
- Нижнее меню (mobile): `Профиль`, `Лента`, `Поддержка`.
- Кнопки и чаты имеют закруглённые углы и мягкие тени — см. `src/App.css`.
- Это прототип интерфейса (визуалка + анимации). Бизнес-логику и платёж/премиум пока не реализованы.
