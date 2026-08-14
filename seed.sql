INSERT INTO "Usuario" ("email", "senha", "nome", "perfil", "criadoEm", "ultimoAcesso")
VALUES ('admin@fortal.com.br', '$2b$10$UrcTacp.Nv/Uk/X0BIwtve1NIFml.5My4sfxgxEhq3gqsiI9CH.tm', 'Administrador', 'ADMIN', NOW(), NULL)
ON CONFLICT ("email") DO UPDATE SET "senha" = '$2b$10$UrcTacp.Nv/Uk/X0BIwtve1NIFml.5My4sfxgxEhq3gqsiI9CH.tm';
