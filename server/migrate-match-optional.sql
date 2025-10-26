-- Миграция для опциональных teamId в матчах
-- Выполните этот SQL в вашей базе данных

-- Для PostgreSQL
ALTER TABLE matches ALTER COLUMN "team1Id" DROP NOT NULL;
ALTER TABLE matches ALTER COLUMN "team2Id" DROP NOT NULL;

-- Если используете SQLite (dev.db)
-- PRAGMA foreign_keys=OFF;
-- CREATE TABLE matches_new AS SELECT * FROM matches;
-- DROP TABLE matches;
-- CREATE TABLE matches (
--   id TEXT PRIMARY KEY,
--   tournamentId TEXT NOT NULL,
--   bracketId TEXT,
--   team1Id TEXT,
--   team2Id TEXT,
--   status TEXT NOT NULL DEFAULT 'SCHEDULED',
--   scheduledAt TEXT,
--   startedAt TEXT,
--   endedAt TEXT,
--   round INTEGER NOT NULL,
--   position INTEGER NOT NULL,
--   isBye BOOLEAN NOT NULL DEFAULT 0,
--   notes TEXT,
--   createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
--   updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
--   FOREIGN KEY (tournamentId) REFERENCES tournaments(id),
--   FOREIGN KEY (bracketId) REFERENCES brackets(id),
--   FOREIGN KEY (team1Id) REFERENCES teams(id),
--   FOREIGN KEY (team2Id) REFERENCES teams(id)
-- );
-- INSERT INTO matches SELECT * FROM matches_new;
-- DROP TABLE matches_new;

-- Пересоздайте Prisma клиент
