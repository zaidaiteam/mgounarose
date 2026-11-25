# Rose Care Hub V0.3

Prototype interne pour la relation client de M’Gouna Rose. L’interface est en français et s’adapte aux téléphones, tablettes et ordinateurs.

## Démarrage

Node.js 24 et pnpm 11 sont utilisés pour la validation.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Ouvrir http://localhost:3000 pour la démonstration isolée sous `/demo/`. Aucune variable d’environnement n’est nécessaire pour ce mode.

L’espace authentifié de test se trouve sous `/staff/` et reste désactivé par défaut. Consulter [la configuration Supabase](docs/supabase-v0.3.md), [les permissions](docs/staff-permissions.md) et [le rapport de sécurité](docs/security-v0.3.md).

## Parcours de revue

1. Dans **Commandes**, créer une commande avec deux variantes. Choisir un profil et un conseiller fictifs, saisir les prix de simulation, les frais et la remise, puis vérifier le montant à payer à la livraison.
2. Depuis la fiche, confirmer la commande, la mettre en préparation, l’expédier et signaler un échec de livraison. Planifier un rappel, relancer la préparation, puis ouvrir et clôturer un retour. L’historique conserve les changements de statut et les prix des lignes.
3. Dans **Catalogue**, filtrer les précommandes et modifier une composition fictive. Le catalogue initial reprend les produits et formats fournis. Les prix, stocks et composants non renseignés restent vides. Aucune donnée d’ingrédient n’est présumée.
4. Depuis une commande ou un guide, ouvrir **Atelier de messages**. Les dix scénarios sont éditables dans les quatre langues. Les variables portent sur le profil, la commande, les montants et le guide. Les brouillons sont copiables et ne sont jamais envoyés par l’application. Les liens de guide désignent la bibliothèque locale et les nouveaux guides restent propres au navigateur.
5. Ouvrir un résultat de recherche, modifier un guide ou un article de la FAQ, puis terminer un rappel. Vérifier la mise à jour dans **Performance**.

Les identités, coordonnées, adresses, notes de suivi et objets de rappel proviennent uniquement de choix fictifs prédéfinis. Utiliser du texte générique dans les modèles, les brouillons et la bibliothèque. Les contrôles détectent les formats courants de coordonnées et de liens externes, avec les limites d’un filtre de texte. Le bouton **Réinitialiser les données** restaure les exemples après confirmation. Cette version ignore et efface l’ancien stockage V0.1, qui autorisait la saisie libre de coordonnées.

Les changements sont stockés dans ce navigateur. Il n’y a ni synchronisation, ni accès aux commandes réelles, ni notifications externes. L’annuaire ne contrôle aucun accès.

## Validation

```sh
pnpm audit
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

Playwright démarre la démonstration sur le port 3100 et l’espace authentifié de test sur le port 3101. GitHub Actions relance ces commandes et le test de concurrence PostgreSQL sur les pull requests et sur `main`.

Le service worker actif est limité à `/demo/`. Le script à la racine retire l’ancien worker. L’espace authentifié ne met aucune réponse privée en cache.

## Intégrations

Le projet Supabase de référence est hébergé à Paris. La migration versionnée adapte son schéma privé `rose_care`. Elle est livrée pour revue et doit d’abord être testée avec des fixtures isolées. Le prototype ne se connecte ni à Shopify ni à un fournisseur de messages, et aucun déploiement n’est inclus.

## Structure

- `src/app` contient les points d’entrée Next.js, les styles et les métadonnées.
- `src/components` contient la navigation et les écrans.
- `src/lib` contient les règles métier, les données fictives, les modèles et la validation.
- `public` contient les icônes et le service worker.
- `tests` contient les tests unitaires et les scénarios Playwright de bureau et mobiles.
