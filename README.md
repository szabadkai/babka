# Chew Babka — Töltelékzápor 🥐

Mini böngészős játék a [chew-babka.com](https://www.chew-babka.com/) grafikáival:
kapd el a hulló tölteléket (csoki, dió, mák, pisztácia), kerüld a mazsolát!

## Futtatás

```sh
python3 -m http.server 8741 --directory chewbabka
# → http://localhost:8741
```

Vagy egyszerűen nyisd meg az `index.html`-t a böngészőben.

## Irányítás

`← →` / `A D` / egér / ujj — mozgás · `SPACE` / katt — indítás · `M` — némítás · `P` — szünet

## Felépítés

- `src/config.js` — minden tartalom és hangolás (pontok, sebességek, szövegek)
- `src/sprites.js` — grafika betöltése, átszínezés, rajzolt mazsola/karika
- `src/game.js` — játékhurok, állapotgép, bemenet, rajzolás

Az `assets/` képek a chew-babka.com oldalról származnak (Chew Babka tulajdona) —
csak az ő engedélyükkel publikáld.
