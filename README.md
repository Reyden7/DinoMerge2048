# Merge 2048 Mobile

Jeu 2048 léger créé avec React, TypeScript, Vite et Capacitor.

## Démarrage express sous Windows

Prérequis : Node.js 20.19+ ou 22.12+.

1. Double-clique sur `LANCER_JEU.bat`.
2. Attends l'installation des dépendances.
3. Ouvre l'adresse affichée, généralement `http://localhost:5173`.

Tu peux aussi utiliser PowerShell :

```powershell
npm install
npm run dev
```

Contrôles :
- flèches du clavier ou ZQSD/WASD ;
- glissement tactile sur téléphone.

## Tester sur Android

Le dossier Android est déjà généré dans le projet.
Android Studio et le SDK Android doivent être installés.

1. Active le débogage USB sur le téléphone.
2. Branche le téléphone au PC.
3. Double-clique sur `OUVRIR_ANDROID.bat`.
4. Dans Android Studio, attends la fin de la synchronisation Gradle.
5. Sélectionne ton téléphone puis clique sur le bouton vert Run.

En PowerShell, l'équivalent est :

```powershell
npm install
npm run android:open
```

Après chaque modification du jeu :

```powershell
npm run android:sync
```

Puis relance l'application depuis Android Studio.

## Générer le fichier AAB

Dans Android Studio :

```text
Build
→ Generate Signed App Bundle or APK
→ Android App Bundle
→ Create new key
→ Release
```

Conserve précieusement le fichier de clé `.jks` et ses mots de passe. Sans cette clé, tu ne pourras pas publier les futures mises à jour sous la même identité.

## Identité temporaire

- Nom : `Merge 2048`
- Package Android : `com.loomstudio.merge2048`

Ces valeurs se trouvent dans `capacitor.config.ts`.
