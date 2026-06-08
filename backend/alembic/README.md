# Database migrations (Alembic)

```bash
# create a new migration after changing models
alembic revision --autogenerate -m "describe change"

# apply migrations (uses DATABASE_URL from the environment / .env)
alembic upgrade head
```

The migration environment reads the database URL from application settings
(`app.core.config.settings.DATABASE_URL`).
