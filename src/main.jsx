import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft, Clapperboard, FolderOpen, Film, Search, RefreshCw,
  Play, SlidersHorizontal, ChevronRight, HardDrive, CircleHelp
} from "lucide-react";
import "./styles.css";

function App() {
  const [library, setLibrary] = useState({ rootDir: null, movies: [], needsFolder: false });
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("title");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  async function loadLibrary() {
    setLoading(true);
    try {
      const data = await window.movieLibrary.getLibrary();
      setLibrary(data);
      if (selected) {
        const updated = data.movies.find(movie => movie.folderPath === selected.folderPath);
        setSelected(updated || null);
      }
    } catch {
      setNotice("Nie udało się odczytać biblioteki.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadLibrary(); }, []);

  const filteredMovies = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("pl");
    const list = library.movies.filter(movie =>
      movie.title.toLocaleLowerCase("pl").includes(needle) ||
      movie.description.toLocaleLowerCase("pl").includes(needle)
    );
    if (sort === "title") list.sort((a, b) => a.title.localeCompare(b.title, "pl", { sensitivity: "base" }));
    if (sort === "title-desc") list.sort((a, b) => b.title.localeCompare(a.title, "pl", { sensitivity: "base" }));
    return list;
  }, [library.movies, query, sort]);

  async function chooseFolder() {
    setNotice("");
    const data = await window.movieLibrary.chooseFolder();
    if (data) {
      setLibrary(data);
      setSelected(null);
      setQuery("");
    }
  }

  async function openVideo(movie) {
    if (!movie.videoPath) {
      setNotice("W folderze tego filmu nie znaleziono pliku wideo.");
      return;
    }
    const result = await window.movieLibrary.openVideo(movie.videoPath);
    setNotice(result?.error || "");
  }

  function showMovie(movie) {
    setSelected(movie);
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => { setSelected(null); setNotice(""); }} aria-label="Strona główna">
          <span className="brand-mark"><Clapperboard size={23} strokeWidth={2.2} /></span>
          <span className="brand-name">KADR<span>.</span></span>
        </button>
        <div className="topbar-center"><span className="live-dot" /> TWOJA LOKALNA KOLEKCJA</div>
        <div className="topbar-actions">
          <button className="icon-button" onClick={loadLibrary} title="Odśwież bibliotekę" aria-label="Odśwież bibliotekę">
            <RefreshCw size={17} className={loading ? "spin" : ""} />
          </button>
          <button className="folder-button" onClick={chooseFolder}><FolderOpen size={16} /> <span>Wybierz folder</span></button>
        </div>
      </header>

      {selected ? (
        <MovieDetails movie={selected} onBack={() => { setSelected(null); setNotice(""); }} onPlay={() => openVideo(selected)} onOpenFolder={() => window.movieLibrary.openFolder(selected.folderPath)} />
      ) : (
        <main>
          <section className="hero">
            <div className="hero-glow" />
            <div className="hero-content">
              <div className="eyebrow"><span className="eyebrow-line" /> TWOJE KINO, TWOJE ZASADY</div>
              <h1>Każdy film.<br /><span>W jednym miejscu.</span></h1>
              <p>Osobista biblioteka filmowa, która zna foldery na Twoim dysku. Bez kont, bez chmury, bez zbędnych ceregieli.</p>
              <div className="hero-meta">
                <span><Film size={15} /> {library.movies.length} {pluralMovies(library.movies.length)}</span>
                <span className="meta-separator">/</span>
                <span><HardDrive size={15} /> {library.rootDir ? "Dysk lokalny" : "Nie wybrano źródła"}</span>
              </div>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="art-ring ring-one" /><div className="art-ring ring-two" />
              <div className="art-poster poster-back"><div className="poster-sun" /><div className="poster-mountains" /></div>
              <div className="art-poster poster-front"><div className="poster-light" /><div className="poster-title">YOUR<br />NEXT<br /><i>STORY</i></div><div className="poster-credit">A FILM FOR THE NIGHT</div></div>
              <div className="art-chip"><span className="live-dot" /> LOCAL ONLY</div>
            </div>
          </section>

          <section className="library-section">
            <div className="section-heading">
              <div>
                <div className="eyebrow small"><span className="eyebrow-line" /> BIBLIOTEKA</div>
                <h2>Twoje filmy <span className="count-badge">{library.movies.length}</span></h2>
              </div>
              <div className="library-controls">
                <label className="search-box">
                  <Search size={17} />
                  <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Szukaj filmu..." aria-label="Szukaj filmu" />
                  {query && <button onClick={() => setQuery("")} className="clear-search" aria-label="Wyczyść wyszukiwanie">×</button>}
                </label>
                <label className="sort-box"><SlidersHorizontal size={15} /><select value={sort} onChange={e => setSort(e.target.value)} aria-label="Sortowanie"><option value="title">A–Z</option><option value="title-desc">Z–A</option></select></label>
              </div>
            </div>

            {notice && <div className="notice"><CircleHelp size={16} /> {notice}<button onClick={() => setNotice("")}>×</button></div>}

            {!library.rootDir || library.needsFolder ? (
              <div className="empty-state">
                <div className="empty-icon"><FolderOpen size={30} /></div>
                <h3>Najpierw wskaż swoją bibliotekę</h3>
                <p>Wybierz główny folder, w którym znajdują się podfoldery z filmami, okładkami i opisami TXT.</p>
                {library.error && <p className="error-text">{library.error}</p>}
                <button className="primary-button" onClick={chooseFolder}><FolderOpen size={17} /> Wybierz folder z filmami</button>
                <div className="path-hint">Przykład: D:\Filmy\Interstellar\cover.jpg</div>
              </div>
            ) : loading ? (
              <div className="loading-state"><span className="loader" /> Skanuję foldery...</div>
            ) : filteredMovies.length ? (
              <>
                <div className="results-label">{query ? `Wyniki wyszukiwania: ${filteredMovies.length}` : "CAŁA KOLEKCJA"}<span className="results-rule" /></div>
                <div className="movie-grid">
                  {filteredMovies.map((movie, index) => <MovieCard key={movie.folderPath} movie={movie} index={index} onClick={() => showMovie(movie)} />)}
                </div>
              </>
            ) : (
              <div className="empty-state compact">
                <div className="empty-icon"><Film size={28} /></div>
                <h3>{query ? "Nie znaleziono takich filmów" : "Ten folder jeszcze milczy"}</h3>
                <p>{query ? "Spróbuj innego tytułu lub fragmentu opisu." : "Nie znaleziono podfolderów z okładką, opisem TXT ani plikiem wideo. Dodaj filmy i odśwież bibliotekę."}</p>
                {query ? <button className="secondary-button" onClick={() => setQuery("")}>Wyczyść wyszukiwanie</button> : <button className="secondary-button" onClick={loadLibrary}><RefreshCw size={15} /> Skanuj ponownie</button>}
              </div>
            )}
            {library.rootDir && <div className="library-path"><FolderOpen size={14} /><span>ŹRÓDŁO</span><code>{library.rootDir}</code></div>}
          </section>
        </main>
      )}
      <footer className="footer"><div className="footer-brand"><Clapperboard size={15} /> KADR<span>.</span></div><span>Twoje filmy pozostają na Twoim dysku.</span><span className="footer-version">LOCAL LIBRARY · v1.0</span></footer>
    </div>
  );
}

function MovieCard({ movie, index, onClick }) {
  return (
    <button className="movie-card" onClick={onClick} style={{ "--delay": `${Math.min(index, 16) * 35}ms` }}>
      <div className="poster-frame">
        {movie.coverDataUrl ? <img src={movie.coverDataUrl} alt={`Okładka: ${movie.title}`} loading="lazy" /> : <div className="poster-placeholder"><Clapperboard size={30} /><span>BRAK OKŁADKI</span></div>}
        <div className="poster-vignette" />
        <div className="card-hover"><span className="open-circle"><ChevronRight size={22} /></span><span>ZOBACZ SZCZEGÓŁY</span></div>
        {movie.videoPath && <span className="video-tag"><Play size={10} fill="currentColor" /> WIDEO</span>}
      </div>
      <div className="movie-card-info"><h3 title={movie.title}>{movie.title}</h3><p>{movie.description ? "OPIS DOSTĘPNY" : "BRAK OPISU"}</p></div>
    </button>
  );
}

function MovieDetails({ movie, onBack, onPlay, onOpenFolder }) {
  return (
    <main className="detail-page">
      <button className="back-button" onClick={onBack}><ArrowLeft size={17} /> Wróć do biblioteki</button>
      <section className="detail-hero">
        <div className="detail-backdrop" style={movie.coverDataUrl ? { backgroundImage: `linear-gradient(90deg, #0b0d12 0%, rgba(11,13,18,.9) 45%, rgba(11,13,18,.6) 100%), linear-gradient(0deg, #0b0d12 0%, transparent 80%), url("${movie.coverDataUrl}")` : {}} />
        <div className="detail-content">
          <div className="detail-poster">
            {movie.coverDataUrl ? <img src={movie.coverDataUrl} alt={`Okładka: ${movie.title}`} /> : <div className="poster-placeholder"><Clapperboard size={34} /><span>BRAK OKŁADKI</span></div>}
          </div>
          <div className="detail-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> TWOJA KOLEKCJA</div>
            <h1>{movie.title}</h1>
            <div className="detail-tags"><span>FILM LOKALNY</span>{movie.videoName && <><i /> <span>{movie.videoName.split(".").pop().toUpperCase()}</span></>}</div>
            <div className="description-block"><h2>Opis filmu</h2><p className={movie.description ? "" : "muted-description"}>{movie.description || "Brak opisu. Dodaj plik opis.txt w folderze tego filmu, aby wyświetlić tutaj jego treść."}</p></div>
            <div className="detail-actions">
              <button className="primary-button" onClick={onPlay}><Play size={17} fill="currentColor" /> Odtwórz film</button>
              <button className="secondary-button" onClick={onOpenFolder}><FolderOpen size={16} /> Otwórz folder</button>
            </div>
            <div className="file-location"><FolderOpen size={14} /><code>{movie.folderPath}</code></div>
          </div>
        </div>
      </section>
    </main>
  );
}

function pluralMovies(n) {
  if (n === 1) return "film";
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return "filmy";
  return "filmów";
}

createRoot(document.getElementById("root")).render(<App />);
