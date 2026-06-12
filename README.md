# Chew Babka — Játéksarok 🥐

Három mini böngészős játék a [chew-babka.com](https://www.chew-babka.com/) grafikáival.

**Élőben: <https://szabadkai.github.io/babka/>**

| Játék | Műfaj | Lényeg |
|---|---|---|
| **Töltelékzápor** | ügyességi | Kapd el a hulló tölteléket, kerüld a mazsolát! |
| **Töltelék Trió** | hármasító | Párosíts korongokat, teljesítsd a rendeléseket! |
| **Végtelen Babka** | kígyó | Fonott babkaként nőj hosszúra — önharapás tilos! |

## Futtatás helyben

```sh
python3 -m http.server 8741
# → http://localhost:8741
```

Vagy egyszerűen nyisd meg az `index.html`-t a böngészőben.

## Irányítás

nyilak / `WASD` / egér / ujj — mozgás, húzás · `SPACE` / katt — indítás · `M` — némítás · `P` — szünet

## Felépítés

- `index.html` — játékválasztó; `catch.html`, `match3.html`, `snake.html` — a játékok
- `src/config.js` — közös tartalom és hangolás (pontok, sebességek, szövegek, címek)
- `src/sprites.js` — grafika betöltése, átszínezés, rajzolt mazsola/karika
- `src/ui.js` — közös vászon-, hang-, részecske- és firka-elemek
- `src/game.js`, `src/match3.js`, `src/snake.js` — egy-egy játék teljes logikája

## Kiadás

Minden push a `main` ágra automatikusan kitelepül GitHub Pages-re
(`.github/workflows/deploy-pages.yml`).

Az `assets/` képek a chew-babka.com oldalról származnak (Chew Babka tulajdona) —
csak az ő engedélyükkel terjeszd.
