# Vacation Tracker - GitHub-only

Общий планировщик отпусков без Vercel, Neon, Google Sheets и других сервисов.

Файлы:
- index.html - сайт
- data.json - общие данные

Сайт публикуется через GitHub Pages. Данные читаются и сохраняются в data.json через GitHub API.

Для сохранения нужен fine-grained GitHub token:
- Repository access: только этот репозиторий
- Contents: Read and write
- Metadata: Read-only

Пароль администратора в index.html:
const ADMIN_PASSWORD = "admin123";
