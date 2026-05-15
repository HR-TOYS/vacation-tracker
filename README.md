# Vacation Tracker

Страница для учета отпусков сотрудников.

## Локальный запуск

```bash
npm install
npm run dev
```

## Сборка

```bash
npm run build
```

## Публикация на GitHub Pages

1. Создайте репозиторий на GitHub.
2. Загрузите файлы проекта в репозиторий.
3. В `package.json` при желании добавьте поле:

```json
"homepage": "https://USERNAME.github.io/REPOSITORY"
```

4. Выполните:

```bash
npm install
npm run deploy
```

5. В настройках репозитория откройте **Settings → Pages** и выберите публикацию из ветки `gh-pages`.

## Пароль администратора

Сейчас пароль задан прямо в коде:

```js
const ADMIN_PASSWORD = "admin123";
```

Для реального использования лучше заменить на свой.
