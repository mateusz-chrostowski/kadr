# KADR. — lokalna biblioteka filmów

Aplikacja desktopowa Windows zbudowana na Electron + React + Vite. Skanuje lokalny folder, pokazuje okładki w responsywnej galerii, odczytuje opisy TXT i otwiera pliki wideo w domyślnym odtwarzaczu systemu.

## Wymagania

- Windows 10/11
- Node.js LTS (zalecane 20 lub 22) z npm
- Połączenie z internetem tylko podczas instalacji zależności; sama biblioteka działa lokalnie

## Uruchomienie developerskie

1. Rozpakuj ZIP.
2. Otwórz terminal w folderze `filmy-local-desktop`.
3. Wykonaj:

   ```bash
   npm install
   npm run dev
   ```

## Zbudowanie instalatora Windows

```bash
npm install
npm run dist
```

Instalator `.exe` pojawi się w katalogu `release`. Budowanie instalatora Windows najlepiej wykonać na Windowsie.

## Układ biblioteki

```text
D:\Filmy\
├── Interstellar\
│   ├── cover.jpg
│   ├── opis.txt
│   └── Interstellar.mkv
└── Matrix\
    ├── poster.jpg
    ├── opis.txt
    └── Matrix.mp4
```

Każdy podfolder zawierający przynajmniej obraz, plik TXT albo wideo zostanie rozpoznany jako wpis w bibliotece. Aplikacja skanuje też zagnieżdżone podfoldery.

### Obsługiwane okładki

`.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`, `.gif`, `.bmp`

Preferowane nazwy okładek: `cover.jpg`, `poster.jpg`, `okladka.jpg`, `okładka.jpg` lub nazwa folderu filmu. Jeśli ich nie ma, aplikacja wybierze pierwszy znaleziony obraz.

### Opis

Preferowana nazwa to `opis.txt`. Działają też `description.txt`, `info.txt`, `plot.txt`, a w razie ich braku pierwszy plik `.txt`. Plik powinien być zapisany w UTF-8.

### Obsługiwane pliki wideo

`.mkv`, `.mp4`, `.avi`, `.mov`, `.wmv`, `.m4v`, `.webm`, `.mpeg`, `.mpg`, `.ts`

Jeżeli w folderze jest kilka plików wideo, aplikacja wybierze plik o nazwie zgodnej z folderem, a w przeciwnym razie pierwszy znaleziony.

## Bezpieczeństwo i prywatność

- Nie ma konta, backendu internetowego ani wysyłania listy filmów do sieci.
- Ustawiona ścieżka biblioteki jest zapisywana w lokalnych ustawieniach aplikacji.
- Google Fonts są używane wyłącznie do typografii w interfejsie; aby mieć całkowicie offline'owy wygląd, można usunąć linię `@import` z `src/styles.css`.
- Aplikacja nie zawiera plików filmów — tylko czyta ich metadane i przekazuje wskazany plik do domyślnego odtwarzacza.

## Uwagi

- Pierwsze uruchomienie wymaga wskazania głównego folderu.
- Po dodaniu/usunięciu filmów kliknij przycisk odświeżania.
- Duże okładki są wczytywane do pamięci jako data URL. Przy bardzo dużej bibliotece z wielkimi plikami graficznymi warto dodać miniatury/cache.
