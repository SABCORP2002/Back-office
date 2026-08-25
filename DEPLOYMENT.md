# Livraison autonome du backoffice JAL Trade

Cette archive contient l'interface React, le backend NestJS et PostgreSQL.
Le navigateur appelle l'API au chemin relatif `/api` : aucune URL d'API, règle
CORS ou variable Vercel n'est à configurer côté navigateur.

## Pré-requis serveur

- Un VPS Ubuntu 22.04 ou 24.04 avec Docker Engine et Docker Compose.
- Un domaine tel que `backoffice.votredomaine.com`, dont l'enregistrement DNS
  de type `A` pointe vers l'adresse IP publique du VPS.
- Les ports TCP `80` et `443` ouverts dans le pare-feu du VPS et celui de
  l'hébergeur. Ne publiez jamais les ports `3000` ou `5432`.

## Installation

1. Décompressez l'archive et entrez dans le dossier `backoffice`.
2. Créez la configuration privée :

   ```bash
   cp .env.production.example .env.production
   nano .env.production
   ```

3. Remplacez chaque valeur `replace-with-...`. Créez les secrets avec :

   ```bash
   openssl rand -hex 32
   ```

   Définissez `APP_DOMAIN` et `APP_ORIGIN` avec le même domaine. Exemple :

   ```text
   APP_DOMAIN=backoffice.votredomaine.com
   APP_ORIGIN=https://backoffice.votredomaine.com
   ```

4. Lancez l'ensemble :

   ```bash
   docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
   ```

5. Vérifiez que tous les services sont sains :

   ```bash
   docker compose --env-file .env.production -f docker-compose.production.yml ps
   docker compose --env-file .env.production -f docker-compose.production.yml logs -f backoffice
   ```

Ouvrez ensuite `https://backoffice.votredomaine.com`. Caddy délivre le site
et le certificat HTTPS ; il transmet `/api/*` uniquement au backend interne.

## Connexion initiale

Utilisez `ADMIN_BOOTSTRAP_EMAIL` et `ADMIN_BOOTSTRAP_PASSWORD` configurés dans
`.env.production`. Changez ce mot de passe après la première connexion.

## Mise à jour et sauvegarde

Pour mettre à jour le projet, remplacez les fichiers de l'archive, conservez
le fichier `.env.production`, puis exécutez à nouveau la commande `up -d --build`.
La base PostgreSQL est conservée dans le volume Docker `backoffice_postgres_data`.
Sauvegardez-la régulièrement :

```bash
docker compose --env-file .env.production -f docker-compose.production.yml exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > jal_trade_backup.sql
```

Ne transmettez jamais `.env.production`, des mots de passe, clés JWT ou une
sauvegarde de base de données dans l'archive envoyée au client.
