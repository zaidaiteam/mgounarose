# Rose Care Hub V0.1

Prototype interne pour la relation client de M’Gouna Rose. L’interface est en français et s’adapte aux téléphones, tablettes et ordinateurs.

## Démarrage

Node.js 22.18+ et pnpm 11 sont requis.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Ouvrir http://localhost:3000. Aucune variable d’environnement n’est nécessaire.

## Parcours de revue

1. Ouvrir la commande fictive RCH-1048 depuis le tableau de bord, la confirmer et consulter la fiche client associée.
2. Préparer un message depuis la commande, changer la langue, puis générer, modifier et copier le brouillon. Les modèles fonctionnent localement et aucun message n’est envoyé.
3. Créer un profil et une commande. Filtrer les commandes et rechercher un profil, un produit ou un article via la barre globale.
4. Modifier une fiche du catalogue, ajouter une note client, créer un rappel confié à un membre actif et le terminer. Vérifier les indicateurs dans Performance.
5. Parcourir les guides et la FAQ par catégorie. Créer ou modifier un membre de l’équipe dans l’annuaire.

Les changements de démonstration sont enregistrés dans le stockage local de ce navigateur. Ils ne sont ni partagés entre appareils ou onglets ouverts, ni envoyés à un serveur. Pour réinitialiser la démonstration, supprimer la clé locale `rose-care-demo-v1` puis recharger la page. L’annuaire ne contrôle pas les accès. Le stock est indicatif et les commandes conservent leur prix unitaire initial. Les rappels sont visibles dans l’application, sans notification externe.

## Validation

```sh
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm start
```

La PWA utilise un manifeste et un service worker activé en mode production. Avec `pnpm start` sur localhost, attendre l’installation du service worker lors de la première visite en ligne. Le navigateur peut ensuite ouvrir l’interface et utiliser les données fictives hors ligne. Sur un autre hôte, HTTPS est requis.

## Intégrations

Le projet Supabase de référence est hébergé à Paris. Son schéma privé `rose_care` contient 18 tables protégées. Cette version n’instancie aucun client Supabase ou Shopify et ne contacte aucun des deux services. L’intégration de données réelles exigera une authentification, une autorisation côté serveur et une révision du stockage hors ligne. Aucun déploiement n’est prévu pour cette version.

## Structure

- `src/app` contient le point d’entrée Next.js, les styles et le manifeste.
- `src/components` contient la navigation, les écrans et les composants d’interface.
- `src/lib` contient les modèles, règles métier, données fictives et modèles de messages.
- `public` contient les icônes et le service worker.
- `tests` contient les tests des règles métier.
