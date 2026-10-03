# Traitement Audacity – Musique douce / sleeping

## Préparation

- Ouvrir le fichier audio généré (WAV de préférence) dans Audacity.
- Sauvegarder une copie du projet avant toute modification destructive.
- Toujours sélectionner toute la piste avec `Ctrl + A` avant d’appliquer un effet.

---
## Étape 1 – Ralentir le tempo

- `Ctrl + A`
- **Effet > Pitch and Tempo > Sliding Stretch**
- **Initial tempo change** : `-25%` à `-30%`
- **Final tempo change** : même valeur
- **Initial pitch shift** : `0`
- **Final pitch shift** : `0`
- Cliquer sur **Appliquer**

> Objectif : ralentir sans modifier la hauteur de la voix ou des instruments.

---
## Étape 2 – Baisser le volume global

- `Ctrl + A`
- **Effet > Volume et Compression > Amplification**
- Entrer une valeur négative : `-3 dB` à `-6 dB`
- Cliquer sur **Appliquer**

Alternative :
- **Effet > Volume et Compression > Normaliser**
- Valeur maximale d’amplification : `-3 dB` ou `-6 dB`

> Objectif : éviter que le son soit trop fort ou sature.

---

## Étape 3 – Couper les basses fréquences

- `Ctrl + A`
- **Effet > EQ and Filters > High-Pass Filter**
- **Fréquence** : `150 Hz` à `200 Hz`
- **Roll-off** : `12 dB/oct`
- Cliquer sur **Appliquer**

> Objectif : supprimer les basses résiduelles et alléger le son.

### Si le champ Fréquence est bloqué à 0

1. Fermer Audacity.
2. Aller dans `C:\Users\Stephyu\AppData\Roaming\Audacity\`.
3. Supprimer le fichier `pluginregistry.cfg`.
4. Relancer Audacity.
5. Le champ devrait être débloqué.

---

## Étape 4 – Adoucir les aigus

- `Ctrl + A`
- **Effet > EQ and Filters > Low-Pass Filter**
- **Fréquence** : `8 000 Hz` à `12 000 Hz`
- **Roll-off** : `12 dB/oct` ou `24 dB/oct`
- Cliquer sur **Appliquer**

Alternative rapide :
- **Effet > EQ and Filters > Basses et Aigus**
- **Aigus (Treble)** : `-5 dB` à `-10 dB`

> Objectif : enlever le côté perçant ou trop cristallin.

---

## Étape 5 – Ajouter une réverbération douce

- `Ctrl + A`
- **Effet > Réverbération**
- **Room size** : `40%`
- **Stereo width** : `100%`
- **Pre-delay** : `10 ms`
- **Damping** : `60%` à `70%`
- **Reverberance** : `30%` à `40%`
- **Low tone** : `100%`
- **High tone** : `60%` à `70%`
- **Wet gain** : `-10 dB`
- **Dry gain** : `-3 dB`
- **Wet only** : décoché
- Cliquer sur **Appliquer**

> Objectif : envelopper le son, le rendre plus feutré et ASMR.

---

## Ordre important des opérations

1. **Sliding Stretch** – ralentir
2. **Amplification / Normaliser** – baisser le volume
3. **High-Pass Filter** – couper les basses
4. **Low-Pass Filter** – adoucir les aigus
5. **Réverbération** – envelopper

> Ne jamais appliquer la réverbération avant les autres effets, sinon l’écho sera déformé.

---

## Conseils finaux

- Écouter après chaque étape pour ajuster.
- Si le son est trop étouffé, remonter la fréquence du Low-Pass à `12 000 Hz`.
- Si les basses sont encore trop présentes, remonter le High-Pass à `200–250 Hz`.
- Exporter en **WAV** pour conserver la qualité.
- Pour une boucle parfaite, couper les 1–2 premières et dernières secondes, puis appliquer un fondu enchaîné.