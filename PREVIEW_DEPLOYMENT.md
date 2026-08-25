# Aperçu front-end JAL Trade Backoffice

Cette livraison est une prévisualisation visuelle. Elle contient uniquement
des fichiers statiques HTML, CSS et JavaScript : aucun backend, mot de passe,
base de données ou fichier `.env` n'est inclus.

L'écran de connexion ouvre un **mode aperçu** avec des données fictives. Il ne
crée aucune vraie session et ne contacte aucun serveur JAL Trade.

## Hébergement statique

Décompressez l'archive puis publiez le contenu du dossier sur Vercel, Netlify,
Cloudflare Pages, GitHub Pages ou un hébergement web classique. Le fichier
`vercel.json` inclus assure que les routes internes du backoffice fonctionnent
sur Vercel.

Pour Vercel, créez un nouveau projet avec ce dossier comme racine, sans
commande de build et sans variable d'environnement : les fichiers sont déjà
compilés.

Cette archive ne doit pas être utilisée pour gérer des transactions réelles.
La version connectée au backend sera livrée séparément lorsque l'API commune
avec l'application mobile sera prête.
